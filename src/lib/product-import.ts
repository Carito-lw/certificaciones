import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Sql } from "./db";

const rowSchema = z.object({
  rowNumber: z.number().int().min(2).max(100000),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  documentNumber: z.string().trim().min(1).max(40).transform((value) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()).pipe(z.string().min(3).max(40)),
  email: z.union([z.email().max(254), z.literal("")]),
  outcome: z.enum(["pending", "eligible", "not_eligible"]).optional(),
});
const importSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  courseId: z.uuid(),
  rows: z.array(rowSchema).min(1).max(1000),
});
export type ImportInput = z.input<typeof importSchema>;
type ValidImport = z.output<typeof importSchema>;
export type ImportProblem = { rowNumber: number; problem: string };

export async function previewStudentImport(sql: Sql, userId: string, input: ValidImport) {
  const courses = await sql<{ id: string; name: string; institution_id: string }>`
    select c.id, c.name, c.institution_id from courses c
    join institutions i on i.id = c.institution_id
    join memberships m on m.institution_id = i.id
    where i.slug = ${input.slug} and i.status = 'active'
      and c.id = ${input.courseId} and c.status = 'active'
      and m.user_id = ${userId} and m.role in ('owner', 'admin', 'issuer')
  `;
  if (!courses.length) throw new Error("No tenés acceso para importar en esta capacitación.");
  const problems: ImportProblem[] = [];
  const seen = new Set<string>();
  for (const row of input.rows) {
    if (seen.has(row.documentNumber)) problems.push({ rowNumber: row.rowNumber, problem: "Documento repetido en el archivo." });
    seen.add(row.documentNumber);
  }
  const existing = await sql<{
    document_number: string; first_name: string; last_name: string; already_enrolled: boolean;
    existing_outcome: "pending" | "eligible" | "not_eligible" | null;
  }>`
    select s.document_number, s.first_name, s.last_name, (e.id is not null) as already_enrolled,
      e.outcome as existing_outcome
    from students s left join enrollments e on e.institution_id = s.institution_id
      and e.student_id = s.id and e.course_id = ${input.courseId}
    where s.institution_id = ${courses[0].institution_id}
      and s.document_number = any(${input.rows.map((r) => r.documentNumber)}::text[])
  `;
  const existingByDocument = new Map(existing.map((row) => [row.document_number, row]));
  let alreadyEnrolled = 0;
  for (const row of input.rows) {
    const found = existingByDocument.get(row.documentNumber);
    if (!found) continue;
    if (found.already_enrolled) alreadyEnrolled++;
    if (found.already_enrolled && row.outcome && row.outcome !== found.existing_outcome) {
      problems.push({ rowNumber: row.rowNumber, problem: "Ya está inscripto con otro resultado; cambialo desde la ficha del curso." });
    }
    if (found.first_name.trim().toLocaleLowerCase() !== row.firstName.toLocaleLowerCase()
      || found.last_name.trim().toLocaleLowerCase() !== row.lastName.toLocaleLowerCase()) {
      problems.push({ rowNumber: row.rowNumber, problem: "Este documento pertenece a un alumno con otro nombre en la institución." });
    }
  }
  return {
    courseName: courses[0].name,
    total: input.rows.length,
    existingStudents: existing.length,
    alreadyEnrolled,
    readyInFile: input.rows.filter((row) => row.outcome === "eligible").length,
    excludedInFile: input.rows.filter((row) => row.outcome === "not_eligible").length,
    problems,
    valid: problems.length === 0,
  };
}

export async function commitStudentImport(sql: Sql, userId: string, input: ValidImport) {
  const preview = await previewStudentImport(sql, userId, input);
  if (!preview.valid) throw new Error("La lista tiene errores. Revisá la vista previa antes de importar.");
  // One SQL statement: student reuse, enrollments and audit commit together.
  // Repeating a request never duplicates an enrollment. No credential is issued here.
  const rows = await sql<{ imported: number; course_name: string }>`
    with permitted as (
      select c.id as course_id, c.name as course_name, i.id as institution_id
      from courses c join institutions i on i.id = c.institution_id
      join memberships m on m.institution_id = i.id
      where i.slug = ${input.slug} and i.status = 'active'
        and c.id = ${input.courseId} and c.status = 'active'
        and m.user_id = ${userId} and m.role in ('owner', 'admin', 'issuer')
    ), data as (
      select x.* from jsonb_to_recordset(${JSON.stringify(input.rows)}::jsonb)
        as x("firstName" text, "lastName" text, "documentNumber" text, email text, outcome text)
    ), saved as (
      insert into students (institution_id, first_name, last_name, document_number, email)
      select p.institution_id, d."firstName", d."lastName", d."documentNumber", nullif(d.email, '')
      from permitted p cross join data d
      on conflict (institution_id, document_number) where document_number is not null
        do update set document_number = excluded.document_number
      returning id, institution_id, document_number
    ), enrolled as (
      insert into enrollments (institution_id, course_id, student_id, outcome)
      select s.institution_id, p.course_id, s.id, coalesce(d.outcome, 'pending')
      from saved s join permitted p on p.institution_id = s.institution_id
        join data d on d."documentNumber" = s.document_number
      on conflict (institution_id, course_id, student_id) do nothing
      returning id, institution_id
    ), audited as (
      insert into audit_events (institution_id, actor_user_id, action, entity_type, entity_id, details)
      select p.institution_id, ${userId}, 'students.imported', 'course', p.course_id,
        jsonb_build_object('submitted', ${input.rows.length}::int, 'enrolled', (select count(*) from enrolled))
      from permitted p
    )
    select (select count(*)::int from enrolled) as imported, p.course_name from permitted p
  `;
  if (!rows.length) throw new Error("No tenés acceso para importar en esta capacitación.");
  return { total: input.rows.length, enrolled: rows[0].imported,
    alreadyEnrolled: input.rows.length - rows[0].imported, courseName: rows[0].course_name };
}

async function requireUser() {
  const { getSessionUser, UnauthorizedError } = await import("./auth/verify.server");
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}

export const previewInstitutionImport = createServerFn({ method: "POST" })
  .validator((input: ImportInput) => importSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUser();
    const { getSql } = await import("./db");
    return previewStudentImport(await getSql(), userId, data);
  });

export const confirmInstitutionImport = createServerFn({ method: "POST" })
  .validator((input: ImportInput) => importSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUser();
    const { getSql } = await import("./db");
    return commitStudentImport(await getSql(), userId, data);
  });
