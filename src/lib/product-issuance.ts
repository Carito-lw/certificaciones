import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Sql } from "./db";

const scope = z.object({ slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/) });
const courseInput = scope.extend({ courseId: z.uuid() });
const issueInput = courseInput.extend({ templateId: z.uuid() });
const publicInput = z.object({ publicId: z.uuid() });
const revokeInput = scope.extend({ credentialId: z.uuid(), reason: z.string().trim().min(3).max(250) });
const rosterInput = courseInput.extend({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  search: z.string().trim().max(100).default(""),
  outcome: z.enum(["all", "pending", "eligible", "not_eligible"]).default("all"),
});
const outcomeInput = courseInput.extend({
  enrollmentId: z.uuid(), outcome: z.enum(["pending", "eligible", "not_eligible"]),
});

export async function getCourseRoster(sql: Sql, userId: string, input: z.infer<typeof rosterInput>) {
  const courses = await sql<{ id: string; name: string; code: string }>`
    select c.id, c.name, c.code from courses c
    join institutions i on i.id = c.institution_id join memberships m on m.institution_id = i.id
    where i.slug = ${input.slug} and i.status = 'active' and c.id = ${input.courseId} and m.user_id = ${userId}
  `;
  if (!courses.length) throw new Error("No tenés acceso a esta capacitación.");
  const term = `%${input.search.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
  const filter = input.outcome;
  const count = await sql<{ total: number }>`
    select count(*)::int as total from enrollments e
    join courses c on c.id = e.course_id and c.institution_id = e.institution_id
    join institutions i on i.id = e.institution_id
    join memberships m on m.institution_id = e.institution_id
    join students s on s.id = e.student_id and s.institution_id = e.institution_id
    where c.id = ${input.courseId} and i.slug = ${input.slug} and m.user_id = ${userId}
      and (${filter} = 'all' or e.outcome = ${filter})
      and (${input.search} = '' or s.first_name ilike ${term} escape '\\'
        or s.last_name ilike ${term} escape '\\' or s.document_number ilike ${term} escape '\\')
  `;
  const rows = await sql<{
    id: string; student_id: string; first_name: string; last_name: string; document_number: string | null;
    outcome: "pending" | "eligible" | "not_eligible"; credential_status: "issued" | "revoked" | null;
  }>`
    select e.id, s.id as student_id, s.first_name, s.last_name, s.document_number, e.outcome,
      cr.status as credential_status
    from enrollments e join courses c on c.id = e.course_id and c.institution_id = e.institution_id
    join institutions i on i.id = e.institution_id
    join memberships m on m.institution_id = e.institution_id
    join students s on s.id = e.student_id and s.institution_id = e.institution_id
    left join credentials cr on cr.institution_id = e.institution_id and cr.enrollment_id = e.id
    where c.id = ${input.courseId} and i.slug = ${input.slug} and m.user_id = ${userId}
      and (${filter} = 'all' or e.outcome = ${filter})
      and (${input.search} = '' or s.first_name ilike ${term} escape '\\'
        or s.last_name ilike ${term} escape '\\' or s.document_number ilike ${term} escape '\\')
    order by s.last_name, s.first_name, e.id limit 50 offset ${(input.page - 1) * 50}
  `;
  return { course: courses[0], total: count[0].total, page: input.page, pageSize: 50, rows };
}

export async function updateEnrollmentOutcome(sql: Sql, userId: string, input: z.infer<typeof outcomeInput>) {
  const rows = await sql<{ id: string; previous: string; outcome: string }>`
    with permitted as (
      select c.id, i.id as institution_id from courses c
      join institutions i on i.id = c.institution_id join memberships m on m.institution_id = i.id
      where i.slug = ${input.slug} and i.status = 'active' and c.id = ${input.courseId} and c.status = 'active'
        and m.user_id = ${userId} and m.role in ('owner', 'admin', 'issuer')
    ), previous as (
      select e.id, e.outcome from enrollments e join permitted p
        on p.institution_id = e.institution_id and p.id = e.course_id
      where e.id = ${input.enrollmentId} and e.outcome <> ${input.outcome}
        and not exists (select 1 from credentials cr where cr.institution_id = e.institution_id and cr.enrollment_id = e.id)
      for update of e
    ), changed as (
      update enrollments e set outcome = ${input.outcome}
      from previous p where e.id = p.id
      returning e.id, e.institution_id, p.outcome as previous, e.outcome
    ), audited as (
      insert into audit_events (institution_id, actor_user_id, action, entity_type, entity_id, details)
      select institution_id, ${userId}, 'enrollment.outcome_changed', 'enrollment', id,
        jsonb_build_object('previous', previous, 'outcome', outcome) from changed
    )
    select id, previous, outcome from changed
  `;
  if (!rows.length) throw new Error("No se pudo cambiar la aptitud. Puede que ya se haya emitido una credencial.");
  return rows[0];
}

export async function getIssuancePanel(sql: Sql, userId: string, slug: string) {
  const templates = await sql<{ id: string; name: string; version: number }>`
    select t.id, t.name, t.version from certificate_templates t
    join institutions i on i.id = t.institution_id
    join memberships m on m.institution_id = i.id
    where i.slug = ${slug} and i.status = 'active' and m.user_id = ${userId}
    order by t.name, t.version desc
  `;
  const courses = await sql<{ id: string; eligible: number; pending: number }>`
    select c.id,
      count(e.id) filter (where e.outcome = 'eligible' and cr.id is null)::int as eligible,
      count(e.id) filter (where e.outcome = 'pending')::int as pending
    from courses c
    join institutions i on i.id = c.institution_id
    join memberships m on m.institution_id = i.id
    left join enrollments e on e.institution_id = c.institution_id and e.course_id = c.id
    left join credentials cr on cr.institution_id = e.institution_id and cr.enrollment_id = e.id
    where i.slug = ${slug} and i.status = 'active' and m.user_id = ${userId}
    group by c.id
  `;
  const credentials = await sql<{
    id: string; public_id: string; display_code: string; status: "issued" | "revoked";
    participant: string; course: string; issued_at: string;
  }>`
    select cr.id, cr.public_id, cr.display_code, cr.status, cr.issued_at,
      cr.snapshot->>'studentName' as participant, cr.snapshot->>'courseName' as course
    from credentials cr
    join institutions i on i.id = cr.institution_id
    join memberships m on m.institution_id = i.id
    where i.slug = ${slug} and i.status = 'active' and m.user_id = ${userId}
    order by cr.issued_at desc, cr.id desc limit 50
  `;
  return { templates, courses, credentials };
}

export async function markCourseEligible(sql: Sql, userId: string, slug: string, courseId: string) {
  const rows = await sql<{ marked: number }>`
    with permitted as (
      select c.id, i.id as institution_id from courses c
      join institutions i on i.id = c.institution_id
      join memberships m on m.institution_id = i.id
      where i.slug = ${slug} and i.status = 'active' and c.id = ${courseId} and c.status = 'active'
        and m.user_id = ${userId} and m.role in ('owner', 'admin', 'issuer')
    ), marked as (
      update enrollments e set outcome = 'eligible'
      from permitted p where e.institution_id = p.institution_id and e.course_id = p.id and e.outcome = 'pending'
      returning e.id
    ), audited as (
      insert into audit_events (institution_id, actor_user_id, action, entity_type, entity_id, details)
      select p.institution_id, ${userId}, 'course.eligibility_approved', 'course', p.id,
        jsonb_build_object('marked', (select count(*) from marked)) from permitted p
    )
    select (select count(*)::int from marked) as marked from permitted
  `;
  if (!rows.length) throw new Error("No tenés permiso para aprobar alumnos en esta capacitación.");
  return rows[0];
}

export async function issueCourseBatch(sql: Sql, userId: string, input: z.infer<typeof issueInput>) {
  const year = new Date().getUTCFullYear();
  // A single PostgreSQL statement creates the counter reservation, batch,
  // items, credentials and audit event as an atomic unit. SKIP LOCKED allows
  // distinct workers to claim different enrollments without issuing twice.
  const rows = await sql<{ batch_id: string; issued: number }>`
    with permitted as (
      select c.id as course_id, c.code as course_code, c.name as course_name, c.hours, c.period,
        i.id as institution_id, i.name as institution_name, i.code_prefix, i.primary_color,
        t.id as template_id, t.name as template_name, t.version as template_version
      from courses c join institutions i on i.id = c.institution_id
      join memberships m on m.institution_id = i.id
      join certificate_templates t on t.institution_id = i.id and t.id = ${input.templateId}
      where i.slug = ${input.slug} and i.status = 'active'
        and c.id = ${input.courseId} and c.status = 'active'
        and m.user_id = ${userId} and m.role in ('owner', 'admin', 'issuer')
    ), locked as (
      select e.id, e.institution_id, e.student_id
      from enrollments e join permitted p on p.institution_id = e.institution_id and p.course_id = e.course_id
      where e.outcome = 'eligible' and not exists (
        select 1 from credentials cr where cr.institution_id = e.institution_id and cr.enrollment_id = e.id
      )
      order by e.id limit 1000
      for update of e skip locked
    ), eligible as (
      select e.id as enrollment_id, e.institution_id, e.student_id,
        s.first_name, s.last_name,
        row_number() over (order by e.id)::int as position
      from locked e join students s on s.institution_id = e.institution_id and s.id = e.student_id
    ), total as (select count(*)::int as amount from eligible),
    reserved as (
      insert into code_counters (institution_id, course_id, year, next_number)
      select p.institution_id, p.course_id, ${year}, total.amount + 1
      from permitted p cross join total where total.amount > 0
      on conflict (institution_id, course_id, year)
        do update set next_number = code_counters.next_number + excluded.next_number - 1
      returning next_number
    ), batch as (
      insert into issuance_batches (institution_id, course_id, template_id, created_by, status, total, processed, completed_at)
      select p.institution_id, p.course_id, p.template_id, ${userId}, 'completed', total.amount, total.amount, now()
      from permitted p cross join total cross join reserved
      returning id, institution_id
    ), items as (
      insert into issuance_items (institution_id, batch_id, enrollment_id, row_number, status)
      select e.institution_id, b.id, e.enrollment_id, e.position, 'completed'
      from eligible e join batch b on b.institution_id = e.institution_id
      returning id, institution_id, enrollment_id, row_number
    ), generated as (
      insert into credentials (institution_id, enrollment_id, template_id, issuance_item_id, display_code, snapshot)
      select p.institution_id, e.enrollment_id, p.template_id, item.id,
        p.code_prefix || '-' || p.course_code || '-' || ${year}::text || '-' ||
          lpad((r.next_number - total.amount + item.row_number - 1)::text, 6, '0'),
        jsonb_build_object('studentName', e.first_name || ' ' || e.last_name,
          'institutionName', p.institution_name, 'courseName', p.course_name,
          'hours', p.hours, 'period', p.period, 'primaryColor', p.primary_color,
          'templateName', p.template_name, 'templateVersion', p.template_version)
      from items item join eligible e on e.enrollment_id = item.enrollment_id
      join permitted p on p.institution_id = item.institution_id
      cross join reserved r cross join total
      returning id
    ), audited as (
      insert into audit_events (institution_id, actor_user_id, action, entity_type, entity_id, details)
      select b.institution_id, ${userId}, 'batch.issued', 'batch', b.id,
        jsonb_build_object('issued', (select count(*) from generated)) from batch b
    )
    select b.id as batch_id, (select count(*)::int from generated) as issued from batch b
  `;
  if (!rows.length) throw new Error("No hay alumnos aptos pendientes, o no tenés permiso para emitir esta capacitación.");
  return rows[0];
}

export async function lookupPublicCredential(sql: Sql, publicId: string) {
  const rows = await sql<{
    status: "issued" | "revoked"; display_code: string; issued_at: string; revoked_at: string | null;
    snapshot: { studentName: string; institutionName: string; courseName: string; hours: number; period: string; primaryColor: string | null };
  }>`
    with found as (
      select cr.id, cr.institution_id, cr.status, cr.display_code, cr.issued_at, cr.revoked_at, cr.snapshot
      from credentials cr where cr.public_id = ${publicId}
    ), tracked as (
      insert into verification_events (institution_id, credential_id)
      select institution_id, id from found
    )
    select status, display_code, issued_at, revoked_at, snapshot from found
  `;
  if (!rows.length) return null;
  const row = rows[0];
  return { status: row.status, code: row.display_code, issuedAt: row.issued_at,
    revokedAt: row.revoked_at, studentName: row.snapshot.studentName,
    institutionName: row.snapshot.institutionName, courseName: row.snapshot.courseName,
    hours: row.snapshot.hours, period: row.snapshot.period, primaryColor: row.snapshot.primaryColor };
}

export async function revokeInstitutionCredential(sql: Sql, userId: string, input: z.infer<typeof revokeInput>) {
  const rows = await sql<{ id: string }>`
    with changed as (
      update credentials cr set status = 'revoked', revoked_at = now(), revoked_reason = ${input.reason}
      from institutions i join memberships m on m.institution_id = i.id
      where cr.id = ${input.credentialId} and cr.institution_id = i.id and i.slug = ${input.slug}
        and i.status = 'active' and cr.status = 'issued' and m.user_id = ${userId}
        and m.role in ('owner', 'admin')
      returning cr.id, cr.institution_id
    ), audited as (
      insert into audit_events (institution_id, actor_user_id, action, entity_type, entity_id, details)
      select institution_id, ${userId}, 'credential.revoked', 'credential', id,
        jsonb_build_object('reason', ${input.reason}::text) from changed
    )
    select id from changed
  `;
  if (!rows.length) throw new Error("No se pudo revocar la credencial. Revisá tu permiso o su estado.");
  return rows[0];
}

async function requireUser() {
  const { getSessionUser, UnauthorizedError } = await import("./auth/verify.server");
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}

export const getInstitutionIssuance = createServerFn({ method: "GET" })
  .validator((input: z.input<typeof scope>) => scope.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUser();
    const { getSql } = await import("./db");
    return getIssuancePanel(await getSql(), userId, data.slug);
  });
export const approveCourseStudents = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof courseInput>) => courseInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUser();
    const { getSql } = await import("./db");
    return markCourseEligible(await getSql(), userId, data.slug, data.courseId);
  });
export const issueInstitutionBatch = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof issueInput>) => issueInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUser();
    const { getSql } = await import("./db");
    return issueCourseBatch(await getSql(), userId, data);
  });
export const getPublicCredential = createServerFn({ method: "GET" })
  .validator((input: z.input<typeof publicInput>) => publicInput.parse(input))
  .handler(async ({ data }) => {
    const { getSql } = await import("./db");
    return lookupPublicCredential(await getSql(), data.publicId);
  });
export const revokeCredential = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof revokeInput>) => revokeInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUser();
    const { getSql } = await import("./db");
    return revokeInstitutionCredential(await getSql(), userId, data);
  });

export const getInstitutionCourseRoster = createServerFn({ method: "GET" })
  .validator((input: z.input<typeof rosterInput>) => rosterInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUser();
    const { getSql } = await import("./db");
    return getCourseRoster(await getSql(), userId, data);
  });

export const setEnrollmentOutcome = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof outcomeInput>) => outcomeInput.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUser();
    const { getSql } = await import("./db");
    return updateEnrollmentOutcome(await getSql(), userId, data);
  });
