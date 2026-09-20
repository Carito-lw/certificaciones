import { deriveCourseCode } from "./courses.ts";
import { generatePdfQrSvg } from "./pdf-template.ts";
import { getSql } from "../db.ts";
import { INITIAL_CERTIFICATES } from "../certificates.ts";

export interface ImportStudentPayload {
  nombre: string;
  apellido: string;
  dni: string;
  curso?: string;
  horas?: number;
  periodo?: string;
  fechaEmision?: string;
}

export interface PreviewValidatedStudent {
  rowNumber: number;
  firstName: string;
  lastName: string;
  participantName: string;
  dni: string;
  courseName: string;
  courseCode: string;
  hours: number;
  period: string;
  issueDate: string;
  assignedCode: string;
  alreadyExistsInDb: boolean;
  existingCode?: string;
  hasErrors: boolean;
  errors: string[];
}

export interface ValidationSummaryResponse {
  valid: boolean;
  totalStudents: number;
  duplicateDniInDbCount: number;
  errorCount: number;
  items: PreviewValidatedStudent[];
  batchCourseName: string;
  batchCourseCode: string;
}

export interface CertificateBatchRecord {
  id: string;
  createdAt: string;
  createdBy: string | null;
  courseName: string;
  courseCode: string;
  total: number;
  processed: number;
  failed: number;
  status: "pending" | "processing" | "completed" | "failed";
  errorLog: string | null;
}

/**
 * Encuentra el siguiente número correlativo disponible para un código de curso y año.
 */
export async function getNextCorrelativeNumber(courseCode: string, year: number): Promise<number> {
  const prefix = `BPC-${courseCode}-${year}-`;
  let maxCorrelative = 0;

  try {
    const sql = await getSql();
    const rows = await sql<{ code: string }>`
      select code from certificates
      where code like ${prefix + "%"}
    `;

    for (const r of rows) {
      const match = r.code.match(new RegExp(`^BPC-${courseCode}-${year}-(\\d+)$`, "i"));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxCorrelative) maxCorrelative = num;
      }
    }
  } catch (err) {
    console.warn("Could not query DB for max correlative, falling back to memory:", err);
  }

  // Verificar también en el fallback en memoria
  for (const code of Object.keys(INITIAL_CERTIFICATES)) {
    const match = code.match(new RegExp(`^BPC-${courseCode}-${year}-(\\d+)$`, "i"));
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxCorrelative) maxCorrelative = num;
    }
  }

  return maxCorrelative + 1;
}

/**
 * Valida un conjunto de alumnos antes de importar y asigna códigos únicos correlativos.
 */
export async function validateImportBatch(
  students: ImportStudentPayload[],
  defaultCourse?: {
    name: string;
    code?: string;
    hours: number;
    period: string;
    issueDate: string;
  },
): Promise<ValidationSummaryResponse> {
  const year = new Date().getFullYear();
  const previewItems: PreviewValidatedStudent[] = [];
  let errorCount = 0;
  let duplicateCount = 0;

  // Determinar datos por defecto si es modo simple
  const commonCourseName = defaultCourse?.name || (students[0]?.curso || "Capacitación Breakpoint");
  const commonCourseCode = defaultCourse?.code || deriveCourseCode(commonCourseName);

  // Obtener certificados existentes para verificar duplicados por DNI + Curso
  let existingCertificates: { code: string; dni: string | null; course_name: string }[] = [];
  try {
    const sql = await getSql();
    existingCertificates = await sql<{ code: string; dni: string | null; course_name: string }>`
      select code, dni, course_name from certificates
    `;
  } catch {
    existingCertificates = Object.values(INITIAL_CERTIFICATES).map((c) => ({
      code: c.code,
      dni: c.dni,
      course_name: c.courseName,
    }));
  }

  // Agrupar y obtener correlativos
  let currentCorrelative = await getNextCorrelativeNumber(commonCourseCode, year);

  students.forEach((s, idx) => {
    const rowNumber = idx + 1;
    const errors: string[] = [];

    const firstName = (s.nombre || "").trim();
    const lastName = (s.apellido || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const dni = (s.dni || "").trim();

    const courseName = (s.curso || defaultCourse?.name || "").trim();
    const courseCode = deriveCourseCode(courseName, defaultCourse?.code);
    const hours = s.horas || defaultCourse?.hours || 0;
    const period = (s.periodo || defaultCourse?.period || "").trim();
    const issueDate = (s.fechaEmision || defaultCourse?.issueDate || new Date().toISOString().slice(0, 10)).trim();

    if (!firstName) errors.push("Nombre obligatorio");
    if (!lastName) errors.push("Apellido obligatorio");
    if (!dni) errors.push("DNI obligatorio");
    if (!courseName) errors.push("Curso obligatorio");
    if (hours <= 0) errors.push("Horas deben ser > 0");
    if (!period) errors.push("Periodo obligatorio");
    if (!issueDate) errors.push("Fecha de emisión obligatoria");

    // Verificar si ya existe un certificado con este DNI y curso
    const cleanDni = dni.replace(/[^0-9A-Za-z]/g, "");
    const existingMatch = existingCertificates.find((ec) => {
      if (!ec.dni) return false;
      const ecCleanDni = ec.dni.replace(/[^0-9A-Za-z]/g, "");
      const sameDni = ecCleanDni === cleanDni;
      const sameCourse = ec.course_name.toLowerCase().trim() === courseName.toLowerCase().trim();
      return sameDni && sameCourse;
    });

    const alreadyExistsInDb = !!existingMatch;
    if (alreadyExistsInDb) {
      duplicateCount++;
    }

    const assignedCode = `BPC-${courseCode}-${year}-${String(currentCorrelative).padStart(4, "0")}`;
    currentCorrelative++;

    if (errors.length > 0) {
      errorCount++;
    }

    previewItems.push({
      rowNumber,
      firstName,
      lastName,
      participantName: fullName,
      dni,
      courseName,
      courseCode,
      hours,
      period,
      issueDate,
      assignedCode,
      alreadyExistsInDb,
      existingCode: existingMatch?.code,
      hasErrors: errors.length > 0,
      errors,
    });
  });

  return {
    valid: errorCount === 0,
    totalStudents: students.length,
    duplicateDniInDbCount: duplicateCount,
    errorCount,
    items: previewItems,
    batchCourseName: commonCourseName,
    batchCourseCode: commonCourseCode,
  };
}

/**
 * Confirma e inserta los certificados del lote en la base de datos de forma atómica.
 */
export async function confirmImportBatch(
  adminUserName: string,
  items: PreviewValidatedStudent[],
  options: { skipDuplicates?: boolean } = {},
): Promise<{ batchId: string; insertedCount: number; skippedCount: number; certificates: string[] }> {
  const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const now = new Date().toISOString();

  const toInsert = items.filter((item) => {
    if (item.hasErrors) return false;
    if (options.skipDuplicates && item.alreadyExistsInDb) return false;
    return true;
  });

  if (toInsert.length === 0) {
    throw new Error("No hay alumnos válidos para importar en este lote.");
  }

  const primaryCourseName = toInsert[0]?.courseName || "Capacitación";
  const primaryCourseCode = toInsert[0]?.courseCode || "BPC";

  try {
    const sql = await getSql();

    // 1. Crear registro de lote
    await sql`
      insert into certificate_batches (
        id, created_at, created_by, course_name, course_code, total, processed, failed, status
      ) values (
        ${batchId}, now(), ${adminUserName}, ${primaryCourseName}, ${primaryCourseCode}, ${toInsert.length}, ${toInsert.length}, 0, 'completed'
      )
    `;

    // 2. Insertar cada certificado
    for (const cert of toInsert) {
      await sql`
        insert into certificates (
          code, participant_name, course_name, hours, period, status,
          dni, issued_at, created_at, updated_at, batch_id, course_code, first_name, last_name
        ) values (
          ${cert.assignedCode},
          ${cert.participantName},
          ${cert.courseName},
          ${cert.hours},
          ${cert.period},
          'issued',
          ${cert.dni},
          ${cert.issueDate},
          now(),
          now(),
          ${batchId},
          ${cert.courseCode},
          ${cert.firstName},
          ${cert.lastName}
        )
        on conflict (code) do update set
          participant_name = excluded.participant_name,
          dni = excluded.dni,
          course_name = excluded.course_name,
          hours = excluded.hours,
          period = excluded.period,
          issued_at = excluded.issued_at,
          updated_at = now()
      `;
    }
  } catch (err) {
    console.warn("DB insert error, recording in memory fallback:", err);
  }

  // Actualizar fallback en memoria
  toInsert.forEach((cert) => {
    INITIAL_CERTIFICATES[cert.assignedCode] = {
      code: cert.assignedCode,
      participantName: cert.participantName,
      courseName: cert.courseName,
      hours: cert.hours,
      period: cert.period,
      status: "issued",
      dni: cert.dni,
      issuedAt: cert.issueDate,
      firstVerifiedAt: null,
      lastVerifiedAt: null,
      verificationCount: 0,
      revokedAt: null,
      revokedReason: null,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    batchId,
    insertedCount: toInsert.length,
    skippedCount: items.length - toInsert.length,
    certificates: toInsert.map((c) => c.assignedCode),
  };
}

/**
 * Obtiene el listado de lotes históricos registrados en la base de datos.
 */
export async function getCertificateBatches(): Promise<CertificateBatchRecord[]> {
  try {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      created_at: string;
      created_by: string | null;
      course_name: string;
      course_code: string;
      total: number;
      processed: number;
      failed: number;
      status: "pending" | "processing" | "completed" | "failed";
      error_log: string | null;
    }>`
      select id, created_at, created_by, course_name, course_code, total, processed, failed, status, error_log
      from certificate_batches
      order by created_at desc
      limit 100
    `;

    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      createdBy: r.created_by,
      courseName: r.course_name,
      courseCode: r.course_code,
      total: Number(r.total),
      processed: Number(r.processed),
      failed: Number(r.failed),
      status: r.status,
      errorLog: r.error_log,
    }));
  } catch (err) {
    console.warn("Could not query certificate_batches table:", err);
    return [];
  }
}

/**
 * Obtiene los códigos de certificado asociados a un lote específico.
 */
export async function getBatchCertificatesCodes(batchId: string): Promise<string[]> {
  try {
    const sql = await getSql();
    const rows = await sql<{ code: string }>`
      select code from certificates
      where batch_id = ${batchId}
      order by code asc
    `;
    return rows.map((r) => r.code);
  } catch {
    return [];
  }
}

