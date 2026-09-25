import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { getIssuancePanel, issueCourseBatch, lookupPublicCredential, markCourseEligible, revokeInstitutionCredential } from "../src/lib/product-issuance.ts";
import { getAuthorizedPdfData, renderInstitutionPdf } from "../src/lib/product-pdf.ts";

test("issue 800 unique credentials, verify publicly, and revoke with tenant roles", async () => {
  const db = new PGlite();
  try {
    for (const file of ["migrations/auth/0001_auth.sql", "product/0002_auth_role.sql", "product/schema.sql", "product/zz_issuance.sql"]) {
      await db.exec(readFileSync(file, "utf8"));
    }
    await db.query(`insert into "user" ("id", "name", "email", "emailVerified") values
      ('owner', 'Owner', 'owner@example.test', true), ('issuer', 'Issuer', 'issuer@example.test', true),
      ('outsider', 'Outsider', 'outsider@example.test', true)`);
    await db.query("insert into institutions (slug, name, code_prefix) values ('city', 'Ciudad', 'CI'), ('school', 'Escuela', 'ES')");
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'owner', 'owner' from institutions where slug = 'city'`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'issuer', 'issuer' from institutions where slug = 'city'`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'outsider', 'owner' from institutions where slug = 'school'`);
    const course = await db.query(`insert into courses (institution_id, name, code, hours, period)
      select id, 'Informática', 'INFO', 20, '2026' from institutions where slug = 'city' returning id`);
    const template = await db.query(`insert into certificate_templates (institution_id, name, version, configuration)
      select id, 'Institucional', 1, '{}'::jsonb from institutions where slug = 'city' returning id`);
    await db.query(`insert into students (institution_id, first_name, last_name, document_number)
      select i.id, 'Ana', 'Prueba', (30000000 + s.n)::text
      from institutions i cross join generate_series(1, 800) s(n) where i.slug = 'city'`);
    await db.query(`insert into enrollments (institution_id, course_id, student_id)
      select s.institution_id, $1, s.id from students s`, [course.rows[0].id]);
    const sql = (strings, ...values) => {
      let statement = strings[0];
      for (let i = 0; i < values.length; i++) statement += `$${i + 1}${strings[i + 1]}`;
      return db.query(statement, values).then((result) => result.rows);
    };
    assert.equal((await getIssuancePanel(sql, "issuer", "city")).courses[0].pending, 800);
    assert.equal((await markCourseEligible(sql, "issuer", "city", course.rows[0].id)).marked, 800);
    assert.equal((await markCourseEligible(sql, "issuer", "city", course.rows[0].id)).marked, 0);
    const request = { slug: "city", courseId: course.rows[0].id, templateId: template.rows[0].id };
    await assert.rejects(issueCourseBatch(sql, "outsider", request), /No hay alumnos/);
    const issued = await issueCourseBatch(sql, "issuer", request);
    assert.equal(issued.issued, 800);
    await assert.rejects(issueCourseBatch(sql, "issuer", request), /No hay alumnos/);
    const saved = await db.query("select id, public_id, display_code, status from credentials order by display_code");
    assert.equal(saved.rows.length, 800);
    assert.equal(new Set(saved.rows.map((row) => row.display_code)).size, 800);
    assert.match(saved.rows[0].display_code, /^CI-INFO-\d{4}-000001$/);
    const result = await lookupPublicCredential(sql, saved.rows[0].public_id);
    assert.equal(result.status, "issued");
    assert.equal(result.studentName, "Ana Prueba");
    assert.equal("documentNumber" in result, false);
    assert.equal((await db.query("select count(*)::int as n from verification_events")).rows[0].n, 1);
    await assert.rejects(getAuthorizedPdfData(sql, "outsider", { slug: "city", credentialId: saved.rows[0].id }), /No tenés acceso/);
    const pdfData = await getAuthorizedPdfData(sql, "issuer", { slug: "city", credentialId: saved.rows[0].id });
    const pdf = await renderInstitutionPdf(pdfData, "https://credenciales.example.org");
    assert.equal(Buffer.from(pdf.base64, "base64").subarray(0, 5).toString(), "%PDF-");
    assert.equal(pdf.verificationUrl, `https://credenciales.example.org/producto/verificar/${saved.rows[0].public_id}`);
    await assert.rejects(revokeInstitutionCredential(sql, "issuer", { slug: "city", credentialId: saved.rows[0].id, reason: "Error de emisión" }), /No se pudo/);
    await assert.rejects(revokeInstitutionCredential(sql, "outsider", { slug: "city", credentialId: saved.rows[0].id, reason: "Error de emisión" }), /No se pudo/);
    await revokeInstitutionCredential(sql, "owner", { slug: "city", credentialId: saved.rows[0].id, reason: "Error de emisión" });
    await assert.rejects(getAuthorizedPdfData(sql, "owner", { slug: "city", credentialId: saved.rows[0].id }), /revocada/);
    assert.equal((await lookupPublicCredential(sql, saved.rows[0].public_id)).status, "revoked");
    assert.equal((await db.query("select count(*)::int as n from verification_events")).rows[0].n, 2);
  } finally { await db.close(); }
});
