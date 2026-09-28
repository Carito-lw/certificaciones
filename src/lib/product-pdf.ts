import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Sql } from "./db";
import { readTemplateConfiguration, type TemplateConfiguration } from "./product-template.ts";

const inputSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  credentialId: z.uuid(),
});

export async function getAuthorizedPdfData(sql: Sql, userId: string, input: z.infer<typeof inputSchema>) {
  const rows = await sql<{
    public_id: string; display_code: string; issued_at: string; status: string; document_number: string | null;
    snapshot: { studentName: string; institutionName: string; courseName: string;
      hours: number; period: string; primaryColor: string | null;
      templateConfiguration?: Partial<TemplateConfiguration> };
  }>`
    select cr.public_id, cr.display_code, cr.issued_at, cr.status, cr.snapshot,
      coalesce(nullif(cr.snapshot->>'documentNumber', ''), s.document_number) as document_number
    from credentials cr join institutions i on i.id = cr.institution_id
    join memberships m on m.institution_id = i.id
    left join enrollments e on e.id = cr.enrollment_id and e.institution_id = cr.institution_id
    left join students s on s.id = e.student_id and s.institution_id = cr.institution_id
    where cr.id = ${input.credentialId} and i.slug = ${input.slug}
      and i.status = 'active' and m.user_id = ${userId}
  `;
  if (!rows.length) throw new Error("No tenés acceso a esta credencial.");
  if (rows[0].status !== "issued") throw new Error("La credencial revocada no se puede descargar.");
  return rows[0];
}

type PdfData = Awaited<ReturnType<typeof getAuthorizedPdfData>>;
export async function renderInstitutionPdf(data: PdfData, publicBaseUrl: string) {
  const { jsPDF } = await import("jspdf");
  const { encodeQrMatrix } = await import("./certificates/qr.ts");
  const base = new URL(publicBaseUrl);
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
    throw new Error("SAAS_PUBLIC_BASE_URL debe usar HTTPS.");
  }
  if (base.username || base.password || base.search || base.hash) throw new Error("SAAS_PUBLIC_BASE_URL inválida.");
  const verificationUrl = `${base.origin}/producto/verificar/${data.public_id}`;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const configuration = readTemplateConfiguration(data.snapshot.templateConfiguration);
  const match = /^#[0-9a-fA-F]{6}$/.test(data.snapshot.templateConfiguration?.accentColor || "") ? configuration.accentColor :
    (/^#[0-9a-fA-F]{6}$/.test(data.snapshot.primaryColor || "") ? data.snapshot.primaryColor! : configuration.accentColor);
  const accent = [1, 3, 5].map((i) => Number.parseInt(match.slice(i, i + 2), 16)) as [number, number, number];
  const ink: [number, number, number] = [28, 43, 60];
  const muted: [number, number, number] = [91, 104, 115];
  const accentText = accent[0] * 0.299 + accent[1] * 0.587 + accent[2] * 0.114 > 165 ? ink : accent;
  const fitted = (value: string, x: number, y: number, maxWidth: number, maxLines: number,
    size: number, minSize: number, family: "helvetica" | "times", style: "normal" | "bold", lineHeight: number) => {
    pdf.setFont(family, style);
    let lines: string[] = [];
    for (let fontSize = size; fontSize >= minSize; fontSize -= 0.5) {
      pdf.setFontSize(fontSize);
      lines = pdf.splitTextToSize(value, maxWidth);
      if (lines.length <= maxLines) break;
    }
    if (lines.length > maxLines) throw new Error("El texto del certificado excede el espacio disponible.");
    pdf.text(lines, x, y, { lineHeightFactor: lineHeight });
  };

  // Quiet, formal stationery with the institution's own accent color.
  pdf.setFillColor(246, 245, 242); pdf.rect(0, 0, width, height, "F");
  pdf.setFillColor(255, 255, 255); pdf.rect(12, 11, width - 24, height - 22, "F");
  pdf.setDrawColor(214, 219, 221); pdf.setLineWidth(0.25); pdf.rect(12, 11, width - 24, height - 22);
  pdf.setFillColor(...accent); pdf.rect(12, 11, 3.5, height - 22, "F");
  const initials = data.snapshot.institutionName.split(/\s+/)
    .filter((word) => !/^(de|del|la|el|los|las|y)$/i.test(word)).slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase("es-AR") || "").join("") || "I";
  pdf.setFillColor(...accent); pdf.circle(36, 33.5, 8, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
  pdf.text(initials, 36, 35.1, { align: "center" });
  pdf.setTextColor(...ink); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
  fitted(data.snapshot.institutionName, 49, 32.5, 165, 2, 13, 8, "helvetica", "bold", 1);
  pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
  pdf.text("CREDENCIALES DIGITALES  /  EMISIÓN INSTITUCIONAL", 49, 42);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...accentText);
  pdf.text("DOCUMENTO VERIFICABLE", 269, 34, { align: "right" });
  pdf.setDrawColor(224, 227, 227); pdf.line(28, 49, 269, 49);

  pdf.setTextColor(...accentText); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  pdf.text("CONSTANCIA DE FORMACIÓN", 28, 62);
  pdf.setTextColor(...ink);
  fitted(configuration.title, 28, 76, 183, 2, 27, 17, "times", "bold", 1.0);
  pdf.setTextColor(...muted);
  fitted(configuration.introduction, 28, 88, 183, 2, 10.5, 8.5, "helvetica", "normal", 1.15);
  pdf.setTextColor(...ink);
  fitted(data.snapshot.studentName, 28, 104, 183, 2, 28, 9, "times", "bold", 1.0);
  pdf.setDrawColor(...accent); pdf.setLineWidth(0.7); pdf.line(28, 117, 59, 117);
  pdf.setTextColor(...muted);
  fitted(configuration.accomplishment, 28, 126, 182, 2, 10.5, 9, "helvetica", "normal", 1.15);
  pdf.setFillColor(246, 248, 248); pdf.roundedRect(28, 136, 182, 21, 1, 1, "F");
  pdf.setFillColor(...accent); pdf.rect(28, 136, 1.5, 21, "F");
  pdf.setTextColor(...accentText); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
  pdf.text("CAPACITACIÓN ACREDITADA", 34, 142.5);
  pdf.setTextColor(...ink);
  fitted(data.snapshot.courseName, 34, 149, 170, 2, 16, 9, "times", "bold", 1.04);

  pdf.setDrawColor(224, 227, 227); pdf.setLineWidth(0.3); pdf.line(28, 162, 210, 162);
  pdf.setTextColor(...accentText); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  pdf.text("DNI / DOCUMENTO", 28, 169); pdf.text("DURACIÓN", 101, 169); pdf.text("PERÍODO", 147, 169);
  pdf.setTextColor(...ink); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
  fitted(data.document_number || "No informado", 28, 175, 66, 2, 10, 7, "helvetica", "normal", 1);
  pdf.text(`${data.snapshot.hours} horas`, 101, 175);
  fitted(data.snapshot.period, 147, 175, 62, 2, 10, 7, "helvetica", "normal", 1);

  pdf.setFillColor(247, 249, 249); pdf.rect(224, 59, 47, 119, "F");
  pdf.setDrawColor(224, 227, 227); pdf.line(220, 59, 220, 179);
  pdf.setTextColor(...accentText); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  pdf.text("VALIDACIÓN PÚBLICA", 229, 68);
  pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text(["Escaneá el código para", "consultar el estado actual", "de esta credencial."], 229, 76, { lineHeightFactor: 1.45 });
  const matrix = encodeQrMatrix(verificationUrl, "M");
  const side = 37, x0 = 230, y0 = 104, module = side / (matrix.length + 8);
  pdf.setFillColor(255, 255, 255); pdf.rect(x0 - 2, y0 - 2, side + 4, side + 4, "F");
  pdf.setFillColor(15, 27, 39);
  matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) pdf.rect(x0 + (x + 4) * module, y0 + (y + 4) * module, module, module, "F"); }));
  pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
  pdf.text("Verificá su vigencia online", 248.5, 150, { align: "center" });

  pdf.setFillColor(...ink); pdf.rect(15.5, 183, width - 27.5, 16, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  pdf.text(`CÓDIGO ÚNICO  ${data.display_code}`, 28, 190);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text(`Emitido el ${new Date(data.issued_at).toLocaleDateString("es-AR", { timeZone: "UTC" })}`, 28, 195);
  if (configuration.footer) {
    pdf.setTextColor(220, 228, 232);
    fitted(configuration.footer, 138, 194, 128, 2, 8, 7, "helvetica", "normal", 1.05);
  }
  return { base64: Buffer.from(pdf.output("arraybuffer")).toString("base64"), filename: `Credencial_${data.display_code}.pdf`, verificationUrl };
}

export const downloadInstitutionPdf = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof inputSchema>) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { getSessionUser, UnauthorizedError } = await import("./auth/verify.server");
    const user = await getSessionUser();
    if (!user) throw new UnauthorizedError();
    const { getSql } = await import("./db");
    const credential = await getAuthorizedPdfData(await getSql(), user.id, data);
    if (!process.env.SAAS_PUBLIC_BASE_URL) throw new Error("Configurá SAAS_PUBLIC_BASE_URL antes de descargar PDFs.");
    return renderInstitutionPdf(credential, process.env.SAAS_PUBLIC_BASE_URL);
  });
