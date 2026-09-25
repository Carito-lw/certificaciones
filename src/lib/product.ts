import { createServerFn } from "@tanstack/react-start";
import type { Sql } from "./db";

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
  return { institution, courses: rows };
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
  .validator((input: { slug: string }) => ({ slug: input.slug.trim().toLowerCase() }))
  .handler(async ({ data }) => {
    const userId = await requireProductUserId();
    const { getSql } = await import("./db");
    return getInstitutionCourses(await getSql(), userId, data.slug);
  });
