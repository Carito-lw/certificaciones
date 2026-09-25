import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { getCourseRoster, issueCourseBatch, markCourseEligible, updateEnrollmentOutcome } from "../src/lib/product-issuance.ts";

test("course review filters 55 students and excludes a non-eligible student from issuance", async () => {
  const db = new PGlite();
  try {
    for (const path of ["migrations/auth/0001_auth.sql", "product/0002_auth_role.sql", "product/schema.sql", "product/zz_issuance.sql"]) {
      await db.exec(readFileSync(path, "utf8"));
    }
    await db.query(`insert into "user" ("id", "name", "email", "emailVerified") values
      ('issuer', 'Emisor', 'issuer@example.test', true), ('viewer', 'Lector', 'viewer@example.test', true),
      ('other', 'Otro', 'other@example.test', true)`);
    await db.query("insert into institutions (slug, name, code_prefix) values ('city', 'Municipio', 'MU'), ('other', 'Otro', 'OT')");
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'issuer', 'issuer' from institutions where slug = 'city'`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'viewer', 'viewer' from institutions where slug = 'city'`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'other', 'owner' from institutions where slug = 'other'`);
    const course = await db.query(`insert into courses (institution_id, name, code, hours, period)
      select id, 'Curso', 'CUR', 12, '2026' from institutions where slug = 'city' returning id`);
    const template = await db.query(`insert into certificate_templates (institution_id, name, version, configuration)
      select id, 'Institucional', 1, '{}'::jsonb from institutions where slug = 'city' returning id`);
    await db.query(`insert into students (institution_id, first_name, last_name, document_number)
      select i.id, 'Nombre', 'Apellido' || lpad(n::text, 2, '0'), (900000 + n)::text
      from institutions i cross join generate_series(1, 55) n where i.slug = 'city'`);
    await db.query("insert into enrollments (institution_id, course_id, student_id) select institution_id, $1, id from students", [course.rows[0].id]);
    const sql = (strings, ...values) => {
      let query = strings[0];
      for (let i = 0; i < values.length; i++) query += `$${i + 1}${strings[i + 1]}`;
      return db.query(query, values).then((result) => result.rows);
    };
    const input = { slug: "city", courseId: course.rows[0].id, page: 1, search: "", outcome: "all" };
    const first = await getCourseRoster(sql, "viewer", input);
    assert.equal(first.total, 55);
    assert.equal(first.rows.length, 50);
    const second = await getCourseRoster(sql, "issuer", { ...input, page: 2 });
    assert.equal(second.rows.length, 5);
    assert.equal((await getCourseRoster(sql, "viewer", { ...input, search: "Apellido01" })).total, 1);
    assert.equal((await getCourseRoster(sql, "viewer", { ...input, search: "%" })).total, 0);
    await assert.rejects(getCourseRoster(sql, "other", input), /No tenés acceso/);
    const student = first.rows[0];
    const choice = { slug: "city", courseId: course.rows[0].id, enrollmentId: student.id, outcome: "not_eligible" };
    await assert.rejects(updateEnrollmentOutcome(sql, "viewer", choice), /No se pudo/);
    await assert.rejects(updateEnrollmentOutcome(sql, "other", choice), /No se pudo/);
    const changed = await updateEnrollmentOutcome(sql, "issuer", choice);
    assert.equal(changed.previous, "pending");
    assert.equal(changed.outcome, "not_eligible");
    assert.equal((await markCourseEligible(sql, "issuer", "city", course.rows[0].id)).marked, 54);
    assert.equal((await getCourseRoster(sql, "viewer", { ...input, outcome: "not_eligible" })).total, 1);
    const emitted = await issueCourseBatch(sql, "issuer", { slug: "city", courseId: course.rows[0].id, templateId: template.rows[0].id });
    assert.equal(emitted.issued, 54);
    assert.equal((await db.query("select count(*)::int as n from credentials")).rows[0].n, 54);
    await assert.rejects(updateEnrollmentOutcome(sql, "issuer", { ...choice, enrollmentId: first.rows[1].id, outcome: "not_eligible" }), /ya se haya emitido/);
    const audit = await db.query("select details from audit_events where action = 'enrollment.outcome_changed'");
    assert.deepEqual(audit.rows[0].details, { previous: "pending", outcome: "not_eligible" });
  } finally { await db.close(); }
});
