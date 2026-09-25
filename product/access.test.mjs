import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { getInstitutionCourses, insertCourseEnrollment, insertInstitutionCourse, insertInstitutionStudent } from "../src/lib/product.ts";
import { previewStudentImport, commitStudentImport } from "../src/lib/product-import.ts";

test("writes enforce institution membership and role; reads and duplicate codes stay scoped", async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync("migrations/auth/0001_auth.sql", "utf8"));
    await db.exec(readFileSync("product/0002_auth_role.sql", "utf8"));
    await db.exec(readFileSync("product/schema.sql", "utf8"));
    await db.query(`insert into "user" ("id", "name", "email", "emailVerified") values
      ('owner', 'Owner', 'owner@example.test', true),
      ('issuer', 'Issuer', 'issuer@example.test', true),
      ('viewer', 'Viewer', 'viewer@example.test', true),
      ('other', 'Other', 'other@example.test', true)`);
    await db.query(`insert into institutions (slug, name, code_prefix) values
      ('alpha', 'Alpha', 'AL'), ('beta', 'Beta', 'BE')`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'owner', 'owner' from institutions where slug = 'alpha'`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'issuer', 'issuer' from institutions where slug = 'alpha'`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'viewer', 'viewer' from institutions where slug = 'alpha'`);
    await db.query(`insert into memberships (institution_id, user_id, role)
      select id, 'other', 'owner' from institutions where slug = 'beta'`);

    const sql = (strings, ...values) => {
      let statement = strings[0];
      for (let i = 0; i < values.length; i++) statement += `$${i + 1}${strings[i + 1]}`;
      return db.query(statement, values).then((result) => result.rows);
    };
    const course = { slug: "alpha", name: "Capacitación inicial", code: "CUR1", hours: 20, period: "2026" };
    const createdCourse = await insertInstitutionCourse(sql, "owner", course);
    await assert.rejects(insertInstitutionCourse(sql, "issuer", { ...course, code: "CUR2" }), /permiso/);
    await assert.rejects(insertInstitutionCourse(sql, "other", { ...course, code: "CUR3" }), /permiso/);
    await assert.rejects(insertInstitutionCourse(sql, "owner", course), /Ya existe/);
    await insertInstitutionCourse(sql, "other", { ...course, slug: "beta" });

    const student = { slug: "alpha", firstName: "Ana", lastName: "Test", documentNumber: "123", email: "" };
    const createdStudent = await insertInstitutionStudent(sql, "issuer", student);
    await assert.rejects(insertInstitutionStudent(sql, "viewer", { ...student, documentNumber: "456" }), /permiso/);
    await assert.rejects(insertInstitutionStudent(sql, "other", { ...student, documentNumber: "456" }), /permiso/);
    await assert.rejects(insertInstitutionStudent(sql, "issuer", student), /Ya existe/);
    await insertInstitutionStudent(sql, "other", { ...student, slug: "beta" });

    await insertCourseEnrollment(sql, "issuer", { slug: "alpha", courseId: createdCourse.id, studentId: createdStudent.id });
    await assert.rejects(insertCourseEnrollment(sql, "viewer", { slug: "alpha", courseId: createdCourse.id, studentId: createdStudent.id }), /No se pudo asociar/);
    await assert.rejects(insertCourseEnrollment(sql, "other", { slug: "alpha", courseId: createdCourse.id, studentId: createdStudent.id }), /No se pudo asociar/);

    const alpha = await getInstitutionCourses(sql, "owner", "alpha");
    assert.equal(alpha.courses.length, 1);
    assert.equal(alpha.students.length, 1);
    assert.equal(alpha.students[0].firstName, "Ana");
    assert.equal(alpha.enrollments.length, 1);
    await assert.rejects(getInstitutionCourses(sql, "owner", "beta"), /No tenés acceso/);
    const audit = await db.query("select action from audit_events order by id");
    assert.deepEqual(audit.rows.map((row) => row.action), ["course.created", "course.created", "student.created", "student.created", "enrollment.created"]);
  } finally {
    await db.close();
  }
});
