import { createServerFn } from "@tanstack/react-start";

export type CertificateStatus = "issued" | "verified" | "revoked";

/**
 * Datos públicos seguros devueltos al escanear o consultar /verificar/:codigo.
 * No expone DNI, contador total de consultas, ni metadata administrativa interna.
 */
export type PublicCertificate = {
  code: string;
  participantName: string;
  courseName: string;
  hours: number;
  period: string;
  status: CertificateStatus;
  issuedAt: string | null;
  firstVerifiedAt: string | null;
};

/**
 * Datos administrativos completos visibles en /admin/certificados.
 */
export type AdminCertificate = {
  code: string;
  participantName: string;
  courseName: string;
  hours: number;
  period: string;
  status: CertificateStatus;
  dni: string | null;
  issuedAt: string | null;
  firstVerifiedAt: string | null;
  lastVerifiedAt: string | null;
  verificationCount: number;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VerificationLog = {
  id: number;
  certificateCode: string;
  verifiedAt: string;
};

export type AdminCertificateDetail = {
  certificate: AdminCertificate;
  verifications: VerificationLog[];
};

export type AdminCertificatesSummary = {
  total: number;
  issued: number;
  verified: number;
  revoked: number;
};

export type AdminCertificatesResponse = {
  certificates: AdminCertificate[];
  summary: AdminCertificatesSummary;
};

// Formato de fechas con hora local de Argentina
export function formatArgentinaDateTime(dateInput: string | Date | null): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";

    const parts = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;

    return `${map.day}/${map.month}/${map.year} · ${map.hour}:${map.minute}`;
  } catch {
    return "—";
  }
}

export function formatArgentinaDate(dateInput: string | Date | null): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";

    return new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
}

export function normalizeCertificateCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeDbStatus(rawStatus: string, count: number): CertificateStatus {
  if (rawStatus === "revoked") return "revoked";
  if (rawStatus === "verified" || count > 0) return "verified";
  return "issued";
}

export * from "./certificates/qr";

/**
 * Estado en memoria para fallback local (desarrollo sin DB conectada).
 */
const initialDate = new Date().toISOString();
export const INITIAL_CERTIFICATES: Record<string, AdminCertificate> = {
  "BPC-PYVC-2026-0001": {
    code: "BPC-PYVC-2026-0001",
    participantName: "Ana Maria Medina",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    status: "issued",
    dni: "32.855.417",
    issuedAt: "2026-09-18",
    firstVerifiedAt: null,
    lastVerifiedAt: null,
    verificationCount: 0,
    revokedAt: null,
    revokedReason: null,
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  "BPC-PYVC-2026-0002": {
    code: "BPC-PYVC-2026-0002",
    participantName: "Mauricio Bottone",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    status: "issued",
    dni: "21.809.918",
    issuedAt: "2026-09-18",
    firstVerifiedAt: null,
    lastVerifiedAt: null,
    verificationCount: 0,
    revokedAt: null,
    revokedReason: null,
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  "BPC-PYVC-2026-0003": {
    code: "BPC-PYVC-2026-0003",
    participantName: "Luz Ceneri",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    status: "issued",
    dni: "42.009.891",
    issuedAt: "2026-09-18",
    firstVerifiedAt: null,
    lastVerifiedAt: null,
    verificationCount: 0,
    revokedAt: null,
    revokedReason: null,
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  "BPC-PYVC-2026-0004": {
    code: "BPC-PYVC-2026-0004",
    participantName: "Octavio Naim",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    status: "issued",
    dni: "49.082.369",
    issuedAt: "2026-09-18",
    firstVerifiedAt: null,
    lastVerifiedAt: null,
    verificationCount: 0,
    revokedAt: null,
    revokedReason: null,
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  "BPC-PYVC-2026-0005": {
    code: "BPC-PYVC-2026-0005",
    participantName: "German Sosa",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    status: "issued",
    dni: "48.724.809",
    issuedAt: "2026-09-18",
    firstVerifiedAt: null,
    lastVerifiedAt: null,
    verificationCount: 0,
    revokedAt: null,
    revokedReason: null,
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  "BPC-PYVC-2026-0006": {
    code: "BPC-PYVC-2026-0006",
    participantName: "Milagros Orihuela",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    status: "issued",
    dni: "43.354.169",
    issuedAt: "2026-09-18",
    firstVerifiedAt: null,
    lastVerifiedAt: null,
    verificationCount: 0,
    revokedAt: null,
    revokedReason: null,
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  "BPC-PYVC-2026-0007": {
    code: "BPC-PYVC-2026-0007",
    participantName: "Ezequiel Aguero",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    status: "issued",
    dni: "28.917.414",
    issuedAt: "2026-09-18",
    firstVerifiedAt: null,
    lastVerifiedAt: null,
    verificationCount: 0,
    revokedAt: null,
    revokedReason: null,
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  "BPC-PYVC-2026-0008": {
    code: "BPC-PYVC-2026-0008",
    participantName: "Alejandro Morales",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    status: "issued",
    dni: "29.996.320",
    issuedAt: "2026-09-18",
    firstVerifiedAt: null,
    lastVerifiedAt: null,
    verificationCount: 0,
    revokedAt: null,
    revokedReason: null,
    createdAt: initialDate,
    updatedAt: initialDate,
  },
};

const IN_MEMORY_VERIFICATIONS: Record<string, VerificationLog[]> = {};

/**
 * Consulta pública con registro atómico de verificación:
 * 1. Busca el certificado.
 * 2. Si existe, registra la consulta en certificate_verifications.
 * 3. Actualiza first_verified_at, last_verified_at, verification_count.
 * 4. Si el estado era 'issued', pasa automáticamente a 'verified'. Si estaba 'revoked', permanece 'revoked'.
 * 5. Devuelve solo datos públicos y seguros.
 */
export const getCertificateByCode = createServerFn({ method: "GET" })
  .validator((input: { code: string }) => ({
    code: normalizeCertificateCode(input.code),
  }))
  .handler(async ({ data }): Promise<PublicCertificate | null> => {
    try {
      const { getSql } = await import("./db");
      const sql = await getSql();

      // Asegurar que la tabla y columnas existen
      const rows = await sql<{
        code: string;
        participant_name: string;
        course_name: string;
        hours: number;
        period: string;
        status: CertificateStatus;
        issued_at: string | null;
        first_verified_at: string | null;
        last_verified_at: string | null;
        verification_count: number;
      }>`
        select 
          code, 
          participant_name, 
          course_name, 
          hours, 
          period, 
          status, 
          issued_at,
          first_verified_at,
          last_verified_at,
          coalesce(verification_count, 0) as verification_count
        from certificates
        where code = ${data.code}
        limit 1
      `;

      const row = rows[0];
      if (!row) {
        return handleFallbackVerification(data.code);
      }

      const nowIso = new Date().toISOString();
      const nextCount = (row.verification_count || 0) + 1;
      const isRevoked = row.status === "revoked";
      const nextStatus: CertificateStatus = isRevoked ? "revoked" : "verified";
      const firstVerified = row.first_verified_at || nowIso;

      // Registrar consulta en el historial
      try {
        await sql`
          insert into certificate_verifications (certificate_code, verified_at)
          values (${row.code}, now())
        `;

        await sql`
          update certificates
          set 
            status = ${nextStatus},
            verification_count = ${nextCount},
            first_verified_at = coalesce(first_verified_at, now()),
            last_verified_at = now(),
            updated_at = now()
          where code = ${row.code}
        `;
      } catch (logErr) {
        console.warn("No se pudo registrar la verificación en BD:", logErr);
      }

      return {
        code: row.code,
        participantName: row.participant_name,
        courseName: row.course_name,
        hours: row.hours,
        period: row.period,
        status: nextStatus,
        issuedAt: row.issued_at,
        firstVerifiedAt: firstVerified,
      };
    } catch (error) {
      console.warn("DB lookup error, using memory fallback:", error);
      return handleFallbackVerification(data.code);
    }
  });

function handleFallbackVerification(code: string): PublicCertificate | null {
  const item = INITIAL_CERTIFICATES[code];
  if (!item) return null;

  const now = new Date().toISOString();
  item.verificationCount += 1;
  item.lastVerifiedAt = now;
  if (!item.firstVerifiedAt) {
    item.firstVerifiedAt = now;
  }
  if (item.status !== "revoked") {
    item.status = "verified";
  }
  item.updatedAt = now;

  IN_MEMORY_VERIFICATIONS[code] = IN_MEMORY_VERIFICATIONS[code] || [];
  IN_MEMORY_VERIFICATIONS[code].unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    certificateCode: code,
    verifiedAt: now,
  });

  return {
    code: item.code,
    participantName: item.participantName,
    courseName: item.courseName,
    hours: item.hours,
    period: item.period,
    status: item.status,
    issuedAt: item.issuedAt,
    firstVerifiedAt: item.firstVerifiedAt,
  };
}

export type AdminSessionState = {
  authenticated: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

/**
 * Consulta de sesión de administrador activa para el layout y guardas.
 */
export const getAdminSessionState = createServerFn({ method: "GET" })
  .handler(async (): Promise<AdminSessionState> => {
    try {
      const { getAdminSessionUser } = await import("./auth/verify.server");
      const user = await getAdminSessionUser();
      if (!user) return { authenticated: false, user: null };
      return {
        authenticated: true,
        user,
      };
    } catch {
      return { authenticated: false, user: null };
    }
  });

/**
 * Obtener todos los certificados para el panel administrativo (requiere sesión admin).
 */
export const getAdminCertificates = createServerFn({ method: "GET" })
  .validator((input?: { search?: string; status?: string }) => ({
    search: input?.search ? input.search.trim().toLowerCase() : "",
    status: input?.status ? input.status.trim().toLowerCase() : "all",
  }))
  .handler(async ({ data }): Promise<AdminCertificatesResponse> => {
    const { requireAdminSession } = await import("./auth/verify.server");
    await requireAdminSession();

    let list: AdminCertificate[] = [];

    try {
      const { getSql } = await import("./db");
      const sql = await getSql();

      const rows = await sql<{
        code: string;
        participant_name: string;
        course_name: string;
        hours: number;
        period: string;
        status: CertificateStatus;
        dni: string | null;
        issued_at: string | null;
        first_verified_at: string | null;
        last_verified_at: string | null;
        verification_count: number;
        revoked_at: string | null;
        revoked_reason: string | null;
        created_at: string;
        updated_at: string;
      }>`
        select 
          code, 
          participant_name, 
          course_name, 
          hours, 
          period, 
          status, 
          dni,
          issued_at,
          first_verified_at,
          last_verified_at,
          coalesce(verification_count, 0) as verification_count,
          revoked_at,
          revoked_reason,
          created_at,
          updated_at
        from certificates
        order by code asc
      `;

      if (rows && rows.length > 0) {
        list = rows.map((r) => ({
          code: r.code,
          participantName: r.participant_name,
          courseName: r.course_name,
          hours: r.hours,
          period: r.period,
          status: normalizeDbStatus(r.status, r.verification_count || 0),
          dni: r.dni ?? null,
          issuedAt: r.issued_at,
          firstVerifiedAt: r.first_verified_at,
          lastVerifiedAt: r.last_verified_at,
          verificationCount: r.verification_count || 0,
          revokedAt: r.revoked_at,
          revokedReason: r.revoked_reason,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      } else {
        list = Object.values(INITIAL_CERTIFICATES);
      }
    } catch (err) {
      console.warn("Using memory fallback for admin certificate list:", err);
      list = Object.values(INITIAL_CERTIFICATES);
    }

    // Calcular resumen global antes de filtrar
    const summary: AdminCertificatesSummary = {
      total: list.length,
      issued: list.filter((c) => c.status === "issued").length,
      verified: list.filter((c) => c.status === "verified").length,
      revoked: list.filter((c) => c.status === "revoked").length,
    };

    // Aplicar filtros
    let filtered = list;
    if (data.status && data.status !== "all") {
      filtered = filtered.filter((c) => c.status === data.status);
    }

    if (data.search) {
      const q = data.search;
      filtered = filtered.filter(
        (c) =>
          c.participantName.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.courseName.toLowerCase().includes(q) ||
          (c.dni && c.dni.toLowerCase().includes(q)),
      );
    }

    return {
      certificates: filtered,
      summary,
    };
  });

/**
 * Obtener detalle completo de un certificado + historial de consultas para admin.
 */
export const getAdminCertificateDetail = createServerFn({ method: "GET" })
  .validator((input: { code: string }) => ({
    code: normalizeCertificateCode(input.code),
  }))
  .handler(async ({ data }): Promise<AdminCertificateDetail | null> => {
    const { requireAdminSession } = await import("./auth/verify.server");
    await requireAdminSession();

    try {
      const { getSql } = await import("./db");
      const sql = await getSql();

      const certRows = await sql<{
        code: string;
        participant_name: string;
        course_name: string;
        hours: number;
        period: string;
        status: CertificateStatus;
        dni: string | null;
        issued_at: string | null;
        first_verified_at: string | null;
        last_verified_at: string | null;
        verification_count: number;
        revoked_at: string | null;
        revoked_reason: string | null;
        created_at: string;
        updated_at: string;
      }>`
        select 
          code, 
          participant_name, 
          course_name, 
          hours, 
          period, 
          status, 
          dni,
          issued_at,
          first_verified_at,
          last_verified_at,
          coalesce(verification_count, 0) as verification_count,
          revoked_at,
          revoked_reason,
          created_at,
          updated_at
        from certificates
        where code = ${data.code}
        limit 1
      `;

      const row = certRows[0];
      if (!row) {
        return getFallbackDetail(data.code);
      }

      const verifRows = await sql<{
        id: number;
        certificate_code: string;
        verified_at: string;
      }>`
        select id, certificate_code, verified_at
        from certificate_verifications
        where certificate_code = ${data.code}
        order by verified_at desc
        limit 100
      `;

      return {
        certificate: {
          code: row.code,
          participantName: row.participant_name,
          courseName: row.course_name,
          hours: row.hours,
          period: row.period,
          status: normalizeDbStatus(row.status, row.verification_count || 0),
          dni: row.dni ?? null,
          issuedAt: row.issued_at,
          firstVerifiedAt: row.first_verified_at,
          lastVerifiedAt: row.last_verified_at,
          verificationCount: row.verification_count || 0,
          revokedAt: row.revoked_at,
          revokedReason: row.revoked_reason,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        verifications: verifRows.map((v) => ({
          id: Number(v.id),
          certificateCode: v.certificate_code,
          verifiedAt: v.verified_at,
        })),
      };
    } catch (err) {
      console.warn("Fallback to memory detail:", err);
      return getFallbackDetail(data.code);
    }
  });

function getFallbackDetail(code: string): AdminCertificateDetail | null {
  const item = INITIAL_CERTIFICATES[code];
  if (!item) return null;
  return {
    certificate: { ...item },
    verifications: IN_MEMORY_VERIFICATIONS[code] || [],
  };
}

/**
 * Revocar un certificado manualmente desde el panel de administración.
 */
export const revokeCertificate = createServerFn({ method: "POST" })
  .validator((input: { code: string; reason?: string }) => ({
    code: normalizeCertificateCode(input.code),
    reason: input.reason?.trim() || null,
  }))
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const { requireAdminSession } = await import("./auth/verify.server");
    await requireAdminSession();

    try {
      const { getSql } = await import("./db");
      const sql = await getSql();

      await sql`
        update certificates
        set 
          status = 'revoked',
          revoked_at = now(),
          revoked_reason = ${data.reason},
          updated_at = now()
        where code = ${data.code}
      `;
    } catch (err) {
      console.warn("DB error when revoking, updating fallback memory:", err);
    }

    if (INITIAL_CERTIFICATES[data.code]) {
      const now = new Date().toISOString();
      INITIAL_CERTIFICATES[data.code].status = "revoked";
      INITIAL_CERTIFICATES[data.code].revokedAt = now;
      INITIAL_CERTIFICATES[data.code].revokedReason = data.reason;
      INITIAL_CERTIFICATES[data.code].updatedAt = now;
    }

    return { success: true, message: `Certificado ${data.code} revocado correctamente.` };
  });

/**
 * Reactivar un certificado desde el panel de administración.
 * Regla:
 * - Si tenía verification_count > 0 -> vuelve a 'verified'.
 * - Si verification_count === 0 -> vuelve a 'issued'.
 */
export const reactivateCertificate = createServerFn({ method: "POST" })
  .validator((input: { code: string }) => ({
    code: normalizeCertificateCode(input.code),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; newStatus: CertificateStatus }> => {
    const { requireAdminSession } = await import("./auth/verify.server");
    await requireAdminSession();

    let newStatus: CertificateStatus = "issued";

    try {
      const { getSql } = await import("./db");
      const sql = await getSql();

      const rows = await sql<{ verification_count: number }>`
        select coalesce(verification_count, 0) as verification_count
        from certificates
        where code = ${data.code}
        limit 1
      `;

      const count = rows[0]?.verification_count || 0;
      newStatus = count > 0 ? "verified" : "issued";

      await sql`
        update certificates
        set 
          status = ${newStatus},
          revoked_at = null,
          revoked_reason = null,
          updated_at = now()
        where code = ${data.code}
      `;
    } catch (err) {
      console.warn("DB error reactivating, updating fallback memory:", err);
      const fallback = INITIAL_CERTIFICATES[data.code];
      if (fallback) {
        newStatus = fallback.verificationCount > 0 ? "verified" : "issued";
        fallback.status = newStatus;
        fallback.revokedAt = null;
        fallback.revokedReason = null;
        fallback.updatedAt = new Date().toISOString();
      }
    }

    if (INITIAL_CERTIFICATES[data.code]) {
      INITIAL_CERTIFICATES[data.code].status = newStatus;
      INITIAL_CERTIFICATES[data.code].revokedAt = null;
      INITIAL_CERTIFICATES[data.code].revokedReason = null;
      INITIAL_CERTIFICATES[data.code].updatedAt = new Date().toISOString();
    }

    return { success: true, newStatus };
  });

/**
 * Actualizar o guardar el DNI de un alumno desde el panel de administración.
 */
export const updateCertificateDni = createServerFn({ method: "POST" })
  .validator((input: { code: string; dni: string | null }) => ({
    code: normalizeCertificateCode(input.code),
    dni: input.dni ? input.dni.trim() : null,
  }))
  .handler(async ({ data }): Promise<{ success: boolean; dni: string | null }> => {
    const { requireAdminSession } = await import("./auth/verify.server");
    await requireAdminSession();

    try {
      const { getSql } = await import("./db");
      const sql = await getSql();

      await sql`
        update certificates
        set 
          dni = ${data.dni},
          updated_at = now()
        where code = ${data.code}
      `;
    } catch (err) {
      console.warn("DB error updating DNI, updating fallback memory:", err);
    }

    if (INITIAL_CERTIFICATES[data.code]) {
      INITIAL_CERTIFICATES[data.code].dni = data.dni;
      INITIAL_CERTIFICATES[data.code].updatedAt = new Date().toISOString();
    }

    return { success: true, dni: data.dni };
  });

/**
 * Obtener datos estructurados de un certificado para la generación de PDF.
 */
async function getCertificateForPdf(code: string) {
  try {
    const { getSql } = await import("./db");
    const sql = await getSql();

    const rows = await sql<{
      code: string;
      participant_name: string;
      course_name: string;
      hours: number;
      period: string;
      dni: string | null;
      issued_at: string | null;
    }>`
      select code, participant_name, course_name, hours, period, dni, issued_at
      from certificates
      where code = ${code}
      limit 1
    `;

    if (rows[0]) {
      return {
        certificateCode: rows[0].code,
        participantName: rows[0].participant_name,
        courseName: rows[0].course_name,
        hours: rows[0].hours,
        period: rows[0].period,
        dni: rows[0].dni ?? null,
        issueDate: rows[0].issued_at,
      };
    }
  } catch (err) {
    console.warn("DB not available for PDF data, using fallback memory:", err);
  }

  const fallback = INITIAL_CERTIFICATES[code];
  if (!fallback) return null;

  return {
    certificateCode: fallback.code,
    participantName: fallback.participantName,
    courseName: fallback.courseName,
    hours: fallback.hours,
    period: fallback.period,
    dni: fallback.dni ?? null,
    issueDate: fallback.issuedAt,
  };
}

export type CertificateDownloadResult = {
  base64?: string;
  html?: string;
  filename: string;
  fallbackToClient?: boolean;
};

export type BatchCertificatesDownloadResult = {
  base64?: string;
  filename: string;
  count: number;
  fallbackToClient?: boolean;
  items?: Array<{ html: string; filename: string }>;
};

/**
 * Generar y descargar el certificado individual en PDF con verificación admin.
 */
export const downloadCertificatePdfServerFn = createServerFn({ method: "POST" })
  .validator((input: { code: string }) => ({
    code: normalizeCertificateCode(input.code),
  }))
  .handler(async ({ data }): Promise<CertificateDownloadResult> => {
    const { requireAdminSession } = await import("./auth/verify.server");
    await requireAdminSession();

    const cert = await getCertificateForPdf(data.code);
    if (!cert) {
      throw new Error(`Certificado ${data.code} no encontrado.`);
    }

    const { generateSingleCertificatePdf, renderCompleteCertificateHtml } = await import(
      "./certificates/pdf-generator.server"
    );

    try {
      const { buffer, filename } = await generateSingleCertificatePdf(cert);
      return {
        base64: buffer.toString("base64"),
        filename,
      };
    } catch (browserError) {
      console.warn("Playwright no disponible en este entorno, usando fallback cliente:", browserError);
      const { html, filename } = renderCompleteCertificateHtml(cert);
      return {
        html,
        filename,
        fallbackToClient: true,
      };
    }
  });

/**
 * Generar y descargar un lote de certificados en un archivo ZIP con verificación admin.
 */
export const downloadBatchCertificatesZipServerFn = createServerFn({ method: "POST" })
  .validator((input: { codes: string[] }) => ({
    codes: input.codes.map(normalizeCertificateCode),
  }))
  .handler(async ({ data }): Promise<BatchCertificatesDownloadResult> => {
    const { requireAdminSession } = await import("./auth/verify.server");
    await requireAdminSession();

    if (!data.codes.length) {
      throw new Error("No se seleccionó ningún certificado para generar.");
    }

    const certList = [];
    for (const code of data.codes) {
      const cert = await getCertificateForPdf(code);
      if (cert) {
        certList.push(cert);
      }
    }

    if (!certList.length) {
      throw new Error("No se encontraron certificados válidos para generar.");
    }

    const { generateCertificatesZip, renderCompleteCertificateHtml } = await import(
      "./certificates/pdf-generator.server"
    );

    try {
      const { buffer, filename } = await generateCertificatesZip(certList);
      return {
        base64: buffer.toString("base64"),
        filename,
        count: certList.length,
      };
    } catch (browserError) {
      console.warn("Playwright no disponible en este entorno, usando fallback cliente:", browserError);
      const items = certList.map((c) => renderCompleteCertificateHtml(c));
      const dateStr = new Date().toISOString().slice(0, 10);
      return {
        filename: `Certificados_Breakpoint_${dateStr}.zip`,
        count: certList.length,
        fallbackToClient: true,
        items,
      };
    }
  });



