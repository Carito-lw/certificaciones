import type { ImportInput } from "./product-import";

type Row = ImportInput["rows"][number];
const normalize = (value: unknown) => String(value ?? "").trim();
const normalizeHeader = (value: unknown) => normalize(value).toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

export async function parseStudentSheet(file: File): Promise<Row[]> {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error("Seleccioná un archivo Excel (.xlsx, .xls) o CSV.");
  if (file.size > 2_000_000) throw new Error("El archivo supera el máximo de 2 MB.");
  const XLSX = await import("xlsx");
  // CSV identifiers are text: SheetJS numeric coercion would discard leading zeroes.
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: /\.csv$/i.test(file.name) });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("El archivo no contiene hojas de cálculo.");
  const values = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: true });
  if (values.length < 2) throw new Error("El archivo debe tener encabezados y al menos un alumno.");
  const headers = (values[0] || []).map(normalizeHeader);
  const aliases: Record<string, string[]> = {
    firstName: ["nombre", "nombres", "firstname"],
    lastName: ["apellido", "apellidos", "lastname"],
    documentNumber: ["dni", "documento", "doc", "identificacion", "cedula"],
    email: ["email", "correo", "correoelectronico"],
  };
  const positions = Object.fromEntries(Object.entries(aliases).map(([field, names]) =>
    [field, headers.findIndex((header) => names.includes(header))]));
  if ([positions.firstName, positions.lastName, positions.documentNumber].some((index) => index < 0)) {
    throw new Error("Faltan columnas obligatorias: Nombre, Apellido y Documento (o DNI).");
  }
  const rows = values.slice(1).map((cells, index) => ({
    rowNumber: index + 2,
    firstName: normalize(cells[positions.firstName]),
    lastName: normalize(cells[positions.lastName]),
    documentNumber: normalize(cells[positions.documentNumber]),
    email: positions.email < 0 ? "" : normalize(cells[positions.email]),
  })).filter((row) => row.firstName || row.lastName || row.documentNumber || row.email);
  if (!rows.length) throw new Error("No hay alumnos para importar.");
  if (rows.length > 1000) throw new Error("El máximo es de 1000 alumnos por archivo.");
  for (const row of rows) {
    if (!row.firstName || !row.lastName || !row.documentNumber) {
      throw new Error(`Fila ${row.rowNumber}: completá nombre, apellido y documento.`);
    }
  }
  return rows;
}

export async function downloadStudentTemplate(): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([["Nombre", "Apellido", "Documento", "Correo"],
    ["Ana", "Pérez", "32123456", "ana@ejemplo.com"]]);
  sheet["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Alumnos");
  XLSX.writeFile(workbook, "plantilla-alumnos.xlsx");
}
