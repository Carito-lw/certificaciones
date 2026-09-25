import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { previewStudentImport, commitStudentImport } from "../src/lib/product-import.ts";

test("800 student rows import atomically in one institution and retries do not duplicate enrollments", async () => {
  const db = new PGlite();
  try {
    for (const file of ["migrations/auth/0001_auth.sql", "product/0002_auth_role.sql", "product/schema.sql"]) {
      await db.exec(readFileSync(file, "utf8"));
    }
    await db.query(`insert into "user" ("id", "name", "email", "emailVerified") values
      ('issuer', 'Issuer', 'issuer@example.test', true), ('viewer', 'Viewer', 'viewer@example.test', true),
      ('outsider', 'Outsider', 'outsider@example.test', true)`);
    await db.query("insert into institutions (slug, name, code_prefix) values ('city', 'Ciudad', 'CI'), ('school', 'Escuela', 'ES')");
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'issuer', 'issuer' from institutions where slug = 'city'`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'viewer', 'viewer' from institutions where slug = 'city'`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'outsider', 'owner' from institutions where slug = 'school'`);
    const course = await db.query(`insert into courses (institution_id, name, code, hours, period)
      select id, 'Curso de prueba', 'CUR', 20, '2026' from institutions where slug = 'city' returning id`);
    const sql = (strings, ...values) => {
      let statement = strings[0];
      for (let i = 0; i < values.length; i++) statement += `$${i + 1}${strings[i + 1]}`;
      return db.query(statement, values).then((result) => result.rows);
    };
    const input = { slug: "city", courseId: course.rows[0].id,
      rows: Array.from({ length: 800 }, (_, i) => ({ rowNumber: i + 2, firstName: "Ana", lastName: "Prueba",
        documentNumber: String(30000000 + i), email: "" })) };
    await assert.rejects(previewStudentImport(sql, "viewer", input), /acceso/);
    await assert.rejects(commitStudentImport(sql, "outsider", input), /acceso/);
    const duplicate = { ...input, rows: [input.rows[0], { ...input.rows[0], rowNumber: 3 }] };
    const rejected = await previewStudentImport(sql, "issuer", duplicate);
    assert.equal(rejected.valid, false);
    await assert.rejects(commitStudentImport(sql, "issuer", duplicate), /errores/);

    const before = await previewStudentImport(sql, "issuer", input);
    assert.equal(before.valid, true);
    assert.equal(before.total, 800);
    const first = await commitStudentImport(sql, "issuer", input);
    assert.equal(first.enrolled, 800);
    const second = await commitStudentImport(sql, "issuer", input);
    assert.equal(second.enrolled, 0);
    assert.equal(second.alreadyEnrolled, 800);
    const city = await db.query(`select count(*)::int as n from students s join institutions i on i.id = s.institution_id where i.slug = 'city'`);
    const school = await db.query(`select count(*)::int as n from students s join institutions i on i.id = s.institution_id where i.slug = 'school'`);
    const enrolled = await db.query("select count(*)::int as n from enrollments");
    assert.equal(city.rows[0].n, 800);
    assert.equal(school.rows[0].n, 0);
    assert.equal(enrolled.rows[0].n, 800);

    const mismatched = { ...input, rows: [{ ...input.rows[0], firstName: "Otra" }] };
    assert.equal((await previewStudentImport(sql, "issuer", mismatched)).valid, false);
    await assert.rejects(commitStudentImport(sql, "issuer", mismatched), /errores/);
  } finally {
    await db.close();
  }
});
