import { createServerFn } from "@tanstack/react-start";
import type { Sql } from "./db";
import { z } from "zod";

export type InstitutionSummary = {
  id: string;
  slug: string;
  name: string;
  role: "owner" | "admin" | "issuer" | "viewer";
  primaryColor: string | null;
  courseCount: number;
  studentCount: number;
  credentialCount: number;
};

export type InstitutionCourse = {
  id: string;
  name: string;
  code: string;
  hours: number;
  period: string;
  status: "active" | "archived";
};

export type InstitutionStudent = {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string | null;
  email: string | null;
};

const slugInput = z.object({ slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/) });
const courseInput = slugInput.extend({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,16}$/),
  hours: z.coerce.number().int().positive().max(10000),
  period: z.string().trim().min(1).max(100),
});
const studentInput = slugInput.extend({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  documentNumber: z.string().trim().max(40).optional(),
  email: z.union([z.email().max(254), z.literal("")]).optional(),
});

function safeWriteError(error: unknown, duplicateMessage: string): never {
  // PostgreSQL and PGlite both expose SQLSTATE 23505 for unique constraints.
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    throw new Error(duplicateMessage);
  }
  throw error;
}

/** Queries always derive access from the authenticated user, never from a client-provided user id. */
export async function listUserInstitutions(sql: Sql, userId: string): Promise<InstitutionSummary[]> {
  const rows = await sql<{
    id: string; slug: string; name: string; role: InstitutionSummary["role"];
    primary_color: string | null; course_count: number; student_count: number; credential_count: number;
  }>`
    select i.id, i.slug, i.name, m.role, i.primary_color,
      (select count(*)::int from courses c where c.institution_id = i.id) as course_count,
      (select count(*)::int from students s where s.institution_id = i.id) as student_count,
      (select count(*)::int from credentials cr where cr.institution_id = i.id) as credential_count
    from institutions i
    join memberships m on m.institution_id = i.id
    where m.user_id = ${userId} and i.status = 'active'
    order by i.name
  `;
  return rows.map((r) => ({
    id: r.id, slug: r.slug, name: r.name, role: r.role,
    primaryColor: r.primary_color, courseCount: Number(r.course_count),
    studentCount: Number(r.student_count), credentialCount: Number(r.credential_count),
  }));
}

export async function getInstitutionCourses(sql: Sql, userId: string, slug: string): Promise<{
  institution: InstitutionSummary;
  courses: InstitutionCourse[];
  students: InstitutionStudent[];
}> {
  const institution = (await listUserInstitutions(sql, userId)).find((item) => item.slug === slug);
  if (!institution) throw new Error("No tenés acceso a esta institución.");

  const rows = await sql<{
    id: string; name: string; code: string; hours: number; period: string;
    status: InstitutionCourse["status"];
  }>`
    select c.id, c.name, c.code, c.hours, c.period, c.status
    from courses c
    join memberships m on m.institution_id = c.institution_id
    where c.institution_id = ${institution.id} and m.user_id = ${userId}
    order by c.created_at desc
  `;
  const students = await sql<{
    id: string; first_name: string; last_name: string; document_number: string | null; email: string | null;
  }>`
    select s.id, s.first_name, s.last_name, s.document_number, s.email
    from students s
    join memberships m on m.institution_id = s.institution_id
    where s.institution_id = ${institution.id} and m.user_id = ${userId}
    order by s.created_at desc, s.id desc
    limit 100
  `;
  return { institution, courses: rows, students: students.map((s) => ({
    id: s.id, firstName: s.first_name, lastName: s.last_name,
    documentNumber: s.document_number, email: s.email,
  })) };
}

export async function insertInstitutionCourse(sql: Sql, userId: string, input: z.infer<typeof courseInput>) {
  let rows: { id: string }[];
  try {
    rows = await sql<{ id: string }>`
      with created as (
        insert into courses (institution_id, name, code, hours, period)
        select i.id, ${input.name}, ${input.code}, ${input.hours}, ${input.period}
        from institutions i join memberships m on m.institution_id = i.id
        where i.slug = ${input.slug} and i.status = 'active'
          and m.user_id = ${userId} and m.role in ('owner', 'admin')
        returning id, institution_id
      ), audited as (
        insert into audit_events (institution_id, actor_user_id, action, entity_type, entity_id)
        select institution_id, ${userId}, 'course.created', 'course', id from created
      )
      select id from created
    `;
  } catch (error) { safeWriteError(error, "Ya existe una capacitación con ese código en esta institución."); }
  if (!rows.length) throw new Error("No tenés permiso para crear capacitaciones en esta institución.");
  return rows[0];
}

export async function insertInstitutionStudent(sql: Sql, userId: string, input: z.infer<typeof studentInput>) {
  let rows: { id: string }[];
  try {
    rows = await sql<{ id: string }>`
      with created as (
        insert into students (institution_id, first_name, last_name, document_number, email)
        select i.id, ${input.firstName}, ${input.lastName}, ${input.documentNumber || null}, ${input.email || null}
        from institutions i join memberships m on m.institution_id = i.id
        where i.slug = ${input.slug} and i.status = 'active'
          and m.user_id = ${userId} and m.role in ('owner', 'admin', 'issuer')
        returning id, institution_id
      ), audited as (
        insert into audit_events (institution_id, actor_user_id, action, entity_type, entity_id)
        select institution_id, ${userId}, 'student.created', 'student', id from created
      )
      select id from created
    `;
  } catch (error) { safeWriteError(error, "Ya existe un alumno con ese documento en esta institución."); }
  if (!rows.length) throw new Error("No tenés permiso para cargar alumnos en esta institución.");
  return rows[0];
}

async function requireProductUserId(): Promise<string> {
  const { getSessionUser, UnauthorizedError } = await import("./auth/verify.server");
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}

export const getProductSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("./auth/verify.server");
  return Boolean(await getSessionUser());
});

export const getMyInstitutions = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireProductUserId();
  const { getSql } = await import("./db");
  return listUserInstitutions(await getSql(), userId);
});

export const getInstitutionPanel = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => slugInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireProductUserId();
    const { getSql } = await import("./db");
    return getInstitutionCourses(await getSql(), userId, data.slug);
  });

export const createInstitutionCourse = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof courseInput>) => courseInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireProductUserId();
    const { getSql } = await import("./db");
    return insertInstitutionCourse(await getSql(), userId, data);
  });

export const createInstitutionStudent = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof studentInput>) => studentInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireProductUserId();
    const { getSql } = await import("./db");
    return insertInstitutionStudent(await getSql(), userId, data);
  });
