import test from "node:test";
import assert from "node:assert/strict";
import { parseStudentSheet } from "../src/lib/product-spreadsheet.ts";

test("CSV accepts institutional headers, keeps physical row numbers, and enforces file limits", async () => {
  const file = new File(["Nombre,Apellido,DNI,Correo\nAna,Pérez,00123,ana@example.test\n\nLuis,Gómez,00999,\n"], "alumnos.csv");
  const rows = await parseStudentSheet(file);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].documentNumber, "00123");
  assert.equal(rows[1].rowNumber, 4);
  const assessed = await parseStudentSheet(new File(["Nombre,Apellido,DNI,Resultado\nEva,Apta,00123,Apto\nEva,Excluida,00345,No apto"], "resultados.csv"));
  assert.deepEqual(assessed.map((row) => row.outcome), ["eligible", "not_eligible"]);
  await assert.rejects(parseStudentSheet(new File(["Nombre,Apellido,DNI,Resultado\nEva,Sin estado,00123,Quizá"], "mal.csv")), /resultado/);
  await assert.rejects(parseStudentSheet(new File(["Nombre,Apellido,DNI\nAna,,123"], "mal.csv")), /Fila 2/);
  await assert.rejects(parseStudentSheet(new File(["Nombre,Apellido,DNI\nAna,P,123"], "lista.txt")), /Excel/);
});
