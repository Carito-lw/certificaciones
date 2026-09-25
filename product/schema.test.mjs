import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("tenant foreign keys reject a student from another institution", async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync("migrations/auth/0001_auth.sql", "utf8"));
    await db.exec(readFileSync("product/schema.sql", "utf8"));
    await db.query(`insert into institutions (slug, name, code_prefix) values
      ('municipio-a', 'Municipio A', 'MA'),
      ('instituto-b', 'Instituto B', 'IB')`);
    const { rows: institutions } = await db.query("select id, slug from institutions order by slug");
    const a = institutions.find((i) => i.slug === "municipio-a").id;
    const b = institutions.find((i) => i.slug === "instituto-b").id;
    const { rows: course } = await db.query(
      "insert into courses (institution_id, name, code, hours, period) values ($1, 'Curso', 'CUR', 12, '2026') returning id",
      [a],
    );
    const { rows: student } = await db.query(
      "insert into students (institution_id, first_name, last_name) values ($1, 'Alumno', 'Prueba') returning id",
      [b],
    );

    await assert.rejects(
      db.query(
        "insert into enrollments (institution_id, course_id, student_id) values ($1, $2, $3)",
        [a, course[0].id, student[0].id],
      ),
      /foreign key constraint/,
    );
  } finally {
    await db.close();
  }
});
