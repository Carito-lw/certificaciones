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
    signatures: { slot: number; signerName: string; signerRole: string; mimeType: string; base64: string }[];
    snapshot: { studentName: string; institutionName: string; courseName: string;
      hours: number; period: string; primaryColor: string | null;
      templateConfiguration?: Partial<TemplateConfiguration> };
  }>`
    select cr.public_id, cr.display_code, cr.issued_at, cr.status, cr.snapshot,
      coalesce(nullif(cr.snapshot->>'documentNumber', ''), s.document_number) as document_number,
      coalesce((select jsonb_agg(jsonb_build_object('slot', sig.slot, 'signerName', sig.signer_name,
        'signerRole', sig.signer_role, 'mimeType', sig.mime_type,
        'base64', encode(sig.image_data, 'base64')) order by sig.slot)
        from certificate_template_signatures sig where sig.institution_id = cr.institution_id
          and sig.template_id = cr.template_id), '[]'::jsonb) as signatures
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
    size: number, minSize: number, family: "helvetica" | "times", style: "normal" | "bold" | "italic", lineHeight: number,
    align: "left" | "center" = "left") => {
    pdf.setFont(family, style);
    let lines: string[] = [];
    for (let fontSize = size; fontSize >= minSize; fontSize -= 0.5) {
      pdf.setFontSize(fontSize);
      lines = pdf.splitTextToSize(value, maxWidth);
      if (lines.length <= maxLines) break;
    }
    if (lines.length > maxLines) throw new Error("El texto del certificado excede el espacio disponible.");
    pdf.text(lines, x, y, { lineHeightFactor: lineHeight, align });
  };
  const compactIfWrapped = (value: string, width: number, family: "times" | "helvetica",
    style: "normal" | "bold" | "italic", size: number, singleMin: number, twoLineSize: number) => {
    pdf.setFont(family, style);
    for (let current = size; current >= singleMin; current -= 0.5) {
      pdf.setFontSize(current);
      if (pdf.splitTextToSize(value, width).length === 1) return { size: current, lines: 1 };
    }
    return { size: twoLineSize, lines: 2 };
  };

  // Formal institutional layout based on the supplied reference, without a decorative seal.
  const navy: [number, number, number] = [23, 43, 66];
  const trim: [number, number, number] = [174, 148, 98];
  pdf.setFillColor(248, 246, 240); pdf.rect(0, 0, width, height, "F");
  pdf.setFillColor(255, 255, 255); pdf.rect(10, 9, width - 20, height - 18, "F");
  pdf.setDrawColor(...navy); pdf.setLineWidth(2); pdf.rect(10, 9, width - 20, height - 18);
  pdf.setDrawColor(...trim); pdf.setLineWidth(0.3); pdf.rect(14, 13, width - 28, height - 26);
  pdf.setFillColor(...accent); pdf.rect(10, 9, 48, 1.6, "F"); pdf.rect(width - 58, 9, 48, 1.6, "F");
  const initials = data.snapshot.institutionName.split(/\s+/)
    .filter((word) => !/^(de|del|la|el|los|las|y)$/i.test(word)).slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase("es-AR") || "").join("") || "I";
  pdf.setFillColor(...navy); pdf.circle(width / 2, 23, 7, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
  pdf.text(initials, width / 2, 24.7, { align: "center" });
  pdf.setTextColor(...navy);
  fitted(data.snapshot.institutionName, width / 2, 36, 225, 1, 22, 10, "times", "bold", 1, "center");
  pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text("EMISIÓN INSTITUCIONAL  /  DOCUMENTO VERIFICABLE", width / 2, 41.3, { align: "center" });

  pdf.setFillColor(240, 239, 235); pdf.roundedRect(91, 45, 115, 8, 3, 3, "F");
  pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
  pdf.text("CONSTANCIA DE FORMACIÓN", width / 2, 50.5, { align: "center" });
  fitted(configuration.title, width / 2, 67, 234, 1, 31, 15, "times", "bold", 1, "center");
  pdf.setFillColor(240, 239, 235); pdf.roundedRect(109, 71, 79, 7, 3, 3, "F");
  pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  pdf.text("CAPACITACIÓN ACREDITADA", width / 2, 75.8, { align: "center" });
  pdf.setTextColor(...ink);
  fitted(configuration.introduction, width / 2, 86, 220, 1, 12, 8, "times", "normal", 1, "center");
  pdf.setTextColor(...accentText);
  const nameFit = compactIfWrapped(data.snapshot.studentName, 231, "times", "italic", 29, 16, 17);
  fitted(data.snapshot.studentName, width / 2, 101, 231, nameFit.lines, nameFit.size, 10, "times", "italic", 1, "center");
  pdf.setDrawColor(...trim); pdf.setLineWidth(0.35); pdf.line(55, 111, width - 55, 111);
  pdf.setTextColor(...ink);
  fitted(configuration.accomplishment, width / 2, 119, 230, 2, 11, 8, "times", "normal", 1, "center");
  const courseFit = compactIfWrapped(data.snapshot.courseName, 230, "times", "bold", 19, 12, 12);
  fitted(data.snapshot.courseName, width / 2, 137, 230, courseFit.lines, courseFit.size, 9, "times", "bold", 1, "center");

  const columns = [27, 83, 127, 184, 270];
  pdf.setDrawColor(192, 195, 194); pdf.setLineWidth(0.25); pdf.rect(27, 145, 243, 19);
  pdf.setFillColor(...navy); pdf.rect(27, 145, 243, 8, "F");
  for (const x of columns.slice(1, -1)) pdf.line(x, 145, x, 164);
  const centers = columns.slice(0, -1).map((x, i) => (x + columns[i + 1]) / 2);
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.8);
  ["DNI / DOCUMENTO", "DURACIÓN", "PERÍODO", "CÓDIGO ÚNICO"].forEach((label, i) => pdf.text(label, centers[i], 150.5, { align: "center" }));
  pdf.setTextColor(...ink);
  [data.document_number || "No informado", `${data.snapshot.hours} horas`, data.snapshot.period, data.display_code]
    .forEach((value, i) => fitted(value, centers[i], 160.3, columns[i + 1] - columns[i] - 4, 1, 10, 6.5, "helvetica", "normal", 1, "center"));

  const matrix = encodeQrMatrix(verificationUrl, "M");
  const side = 29, x0 = 29, y0 = 168, module = side / (matrix.length + 8);
  pdf.setFillColor(255, 255, 255); pdf.rect(x0 - 1, y0 - 1, side + 2, side + 2, "F");
  pdf.setFillColor(15, 27, 39);
  matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) pdf.rect(x0 + (x + 4) * module, y0 + (y + 4) * module, module, module, "F"); }));
  pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
  pdf.text("VALIDACIÓN PÚBLICA", 64, 174);
  pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text(["Escaneá el QR para consultar", "el estado actual de esta credencial."], 64, 180, { lineHeightFactor: 1.3 });
  pdf.setDrawColor(...trim); pdf.line(64, 190, 154, 190);
  pdf.text(`Emitido el ${new Date(data.issued_at).toLocaleDateString("es-AR", { timeZone: "UTC" })}`, 64, 195);

  const signatures = data.signatures || [];
  const positions = signatures.length > 1 ? [196, 248] : [222];
  signatures.slice(0, 2).forEach((signature, index) => {
    const center = positions[index];
    const base64 = signature.base64.replace(/\s/g, "");
    const imageType = signature.mimeType === "image/png" ? "PNG" : "JPEG";
    const image = `data:${signature.mimeType};base64,${base64}`;
    const { width: imageWidth, height: imageHeight } = pdf.getImageProperties(image);
    const scale = Math.min(39 / imageWidth, 11 / imageHeight);
    pdf.addImage(image, imageType, center - imageWidth * scale / 2, 168, imageWidth * scale, imageHeight * scale);
    pdf.setDrawColor(...trim); pdf.line(center - 21, 181, center + 21, 181);
    pdf.setTextColor(...ink);
    fitted(signature.signerName, center, 186, 45, 1, 9, 7, "times", "bold", 1, "center");
    fitted(signature.signerRole, center, 191, 45, 1, 7.5, 6, "helvetica", "normal", 1, "center");
  });
  if (!signatures.length) {
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    pdf.text("Firma institucional no configurada", 223, 187, { align: "center" });
  }
  if (configuration.footer) {
    pdf.setTextColor(...muted);
    fitted(configuration.footer, width / 2, 198, 240, 1, 7, 6, "helvetica", "normal", 1, "center");
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
