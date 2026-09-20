import * as XLSX from "xlsx";

export interface ParsedStudentRow {
  rowNumber: number;
  nombre: string;
  apellido: string;
  dni: string;
  curso?: string;
  horas?: number;
  periodo?: string;
  fechaEmision?: string;
  raw: Record<string, any>;
}

export interface ValidationErrorItem {
  row: number;
  field: string;
  problem: string;
}

export interface ParseResult {
  rows: ParsedStudentRow[];
  errors: ValidationErrorItem[];
  totalRows: number;
  headers: string[];
}

/**
 * Genera y descarga en el navegador una plantilla Excel (.xlsx) de ejemplo.
 */
export function downloadExcelTemplate(mode: "simple" | "complete" = "simple"): void {
  const wb = XLSX.utils.book_new();

  let data: Record<string, any>[];
  let filename: string;

  if (mode === "simple") {
    filename = "Plantilla_Alumnos_Breakpoint_Simple.xlsx";
    data = [
      {
        Nombre: "Ana",
        Apellido: "Perez",
        DNI: "32.123.456",
      },
      {
        Nombre: "Carlos",
        Apellido: "Gomez",
        DNI: "28.456.789",
      },
      {
        Nombre: "Lucia",
        Apellido: "Fernandez",
        DNI: "41.987.654",
      },
    ];
  } else {
    filename = "Plantilla_Alumnos_Breakpoint_Completa.xlsx";
    data = [
      {
        Nombre: "Ana",
        Apellido: "Perez",
        DNI: "32.123.456",
        Curso: "Python con Análisis de Datos y Vibe Coding",
        Horas: 64,
        Periodo: "abril – julio 2026",
        FechaEmision: "18/09/2026",
      },
      {
        Nombre: "Carlos",
        Apellido: "Gomez",
        DNI: "28.456.789",
        Curso: "Producción y Validación de Contenidos",
        Horas: 40,
        Periodo: "abril – julio 2026",
        FechaEmision: "18/09/2026",
      },
    ];
  }

  const ws = XLSX.utils.json_to_sheet(data);

  // Ajustar anchos de columna
  ws["!cols"] = [
    { wch: 18 }, // Nombre
    { wch: 18 }, // Apellido
    { wch: 16 }, // DNI
    { wch: 44 }, // Curso
    { wch: 10 }, // Horas
    { wch: 24 }, // Periodo
    { wch: 16 }, // FechaEmision
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Alumnos");
  XLSX.writeFile(wb, filename);
}

/**
 * Normaliza nombres de encabezados para soportar variaciones comunes.
 */
function normalizeHeaderName(header: string): string {
  const clean = header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (["nombre", "nombres", "name", "firstname"].includes(clean)) return "nombre";
  if (["apellido", "apellidos", "lastname", "surname"].includes(clean)) return "apellido";
  if (["dni", "documento", "doc", "identificacion", "cedula"].includes(clean)) return "dni";
  if (["curso", "capacitacion", "nombrecurso", "course", "cursada"].includes(clean)) return "curso";
  if (["horas", "duracion", "duracionhoras", "hours"].includes(clean)) return "horas";
  if (["periodo", "period", "fechas", "cohorte"].includes(clean)) return "periodo";
  if (["fechaemision", "fecha", "emision", "fechaemisiondelcertificado", "issuedate", "date"].includes(clean)) {
    return "fechaEmision";
  }

  return clean;
}

/**
 * Parsea un ArrayBuffer de archivo Excel (.xlsx, .xls) o CSV y extrae las filas mapeadas.
 */
export function parseUploadedSpreadsheet(fileBuffer: ArrayBuffer | Uint8Array): ParseResult {
  const wb = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return {
      rows: [],
      errors: [{ row: 0, field: "Archivo", problem: "El archivo no contiene hojas válidas." }],
      totalRows: 0,
      headers: [],
    };
  }

  const ws = wb.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (rawRows.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, field: "Archivo", problem: "El archivo no contiene encabezados o filas de datos." }],
      totalRows: 0,
      headers: [],
    };
  }

  const headerRow = (rawRows[0] as any[]).map((h) => String(h || "").trim());
  const headerMap: Record<number, string> = {};

  headerRow.forEach((h, colIdx) => {
    if (h) {
      headerMap[colIdx] = normalizeHeaderName(h);
    }
  });

  const parsedRows: ParsedStudentRow[] = [];
  const errors: ValidationErrorItem[] = [];
  const dniSet = new Set<string>();

  // Máximo límite recomendado: 1000 filas
  const MAX_ROWS = 1000;
  const dataRows = rawRows.slice(1);

  if (dataRows.length > MAX_ROWS) {
    errors.push({
      row: 0,
      field: "Límite de filas",
      problem: `El archivo contiene ${dataRows.length} filas. El límite por tanda es de ${MAX_ROWS} filas. Por favor dividí el archivo en lotes.`,
    });
  }

  const rowsToProcess = dataRows.slice(0, MAX_ROWS);

  rowsToProcess.forEach((rawRow, idx) => {
    const rowNumber = idx + 2; // 1-indexed, fila 1 son headers
    const rowObj: Record<string, any> = {};

    if (Array.isArray(rawRow)) {
      rawRow.forEach((cellVal, colIdx) => {
        const fieldKey = headerMap[colIdx];
        if (fieldKey) {
          rowObj[fieldKey] = cellVal;
        }
      });
    } else if (typeof rawRow === "object" && rawRow !== null) {
      Object.entries(rawRow).forEach(([k, v]) => {
        const fieldKey = normalizeHeaderName(k);
        rowObj[fieldKey] = v;
      });
    }

    const nombre = String(rowObj.nombre || "").trim();
    const apellido = String(rowObj.apellido || "").trim();
    let dni = String(rowObj.dni || "").trim();

    // Limpiar formato DNI si viene con decimales de excel
    if (typeof rowObj.dni === "number") {
      dni = String(Math.floor(rowObj.dni));
    }

    const curso = rowObj.curso ? String(rowObj.curso).trim() : undefined;
    let horas: number | undefined = undefined;
    if (rowObj.horas !== undefined && rowObj.horas !== "") {
      const parsedHours = Number(rowObj.horas);
      if (!isNaN(parsedHours)) horas = parsedHours;
    }

    const periodo = rowObj.periodo ? String(rowObj.periodo).trim() : undefined;

    let fechaEmision: string | undefined = undefined;
    if (rowObj.fechaEmision) {
      if (rowObj.fechaEmision instanceof Date) {
        fechaEmision = rowObj.fechaEmision.toISOString().slice(0, 10);
      } else {
        fechaEmision = String(rowObj.fechaEmision).trim();
      }
    }

    // Validaciones por fila
    if (!nombre) {
      errors.push({ row: rowNumber, field: "Nombre", problem: "El nombre es obligatorio." });
    }
    if (!apellido) {
      errors.push({ row: rowNumber, field: "Apellido", problem: "El apellido es obligatorio." });
    }
    if (!dni) {
      errors.push({ row: rowNumber, field: "DNI", problem: "El DNI es obligatorio." });
    } else {
      // Normalizar DNI para detección de duplicados en el mismo archivo
      const cleanDni = dni.replace(/[^0-9A-Za-z]/g, "");
      if (dniSet.has(cleanDni)) {
        errors.push({
          row: rowNumber,
          field: "DNI",
          problem: `DNI duplicado dentro del archivo (${dni}).`,
        });
      } else {
        dniSet.add(cleanDni);
      }
    }

    if (rowObj.horas !== undefined && rowObj.horas !== "" && (horas === undefined || horas <= 0)) {
      errors.push({
        row: rowNumber,
        field: "Horas",
        problem: "Las horas deben ser un número mayor a 0.",
      });
    }

    parsedRows.push({
      rowNumber,
      nombre,
      apellido,
      dni,
      curso,
      horas,
      periodo,
      fechaEmision,
      raw: rowObj,
    });
  });

  return {
    rows: parsedRows,
    errors,
    totalRows: dataRows.length,
    headers: headerRow,
  };
}
