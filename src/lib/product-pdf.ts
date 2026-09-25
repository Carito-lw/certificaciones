import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Sql } from "./db";

const inputSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  credentialId: z.uuid(),
});

export async function getAuthorizedPdfData(sql: Sql, userId: string, input: z.infer<typeof inputSchema>) {
  const rows = await sql<{
    public_id: string; display_code: string; issued_at: string; status: string;
    snapshot: { studentName: string; institutionName: string; courseName: string;
      hours: number; period: string; primaryColor: string | null };
  }>`
    select cr.public_id, cr.display_code, cr.issued_at, cr.status, cr.snapshot
    from credentials cr join institutions i on i.id = cr.institution_id
    join memberships m on m.institution_id = i.id
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
  const match = /^#[0-9a-fA-F]{6}$/.test(data.snapshot.primaryColor || "") ? data.snapshot.primaryColor! : "#2A5070";
  const rgb = [1, 3, 5].map((i) => Number.parseInt(match.slice(i, i + 2), 16)) as [number, number, number];
  pdf.setFillColor(...rgb); pdf.rect(0, 0, width, 12, "F");
  pdf.setFillColor(247, 248, 249); pdf.rect(0, 12, width, height - 12, "F");
  pdf.setDrawColor(...rgb); pdf.setLineWidth(0.7); pdf.rect(12, 22, width - 24, height - 34);
  pdf.setTextColor(...rgb); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
  pdf.text(data.snapshot.institutionName, width / 2, 36, { align: "center", maxWidth: 230 });
  pdf.setTextColor(30, 38, 50); pdf.setFontSize(24); pdf.text("CERTIFICADO", width / 2, 62, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(12);
  pdf.text("Se certifica que", width / 2, 78, { align: "center" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(22);
  pdf.text(data.snapshot.studentName, width / 2, 93, { align: "center", maxWidth: 236 });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(12);
  pdf.text("participó y cumplió los requisitos de la capacitación", width / 2, 108, { align: "center" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
  const courseLines = pdf.splitTextToSize(data.snapshot.courseName, 190).slice(0, 3);
  pdf.text(courseLines, width / 2, 122, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
  pdf.text(`${data.snapshot.hours} horas · ${data.snapshot.period}`, width / 2, 148, { align: "center", maxWidth: 220 });
  pdf.setFontSize(9); pdf.setTextColor(65, 70, 78);
  pdf.text(`Código: ${data.display_code}`, 24, 177);
  pdf.text(`Emisión: ${new Date(data.issued_at).toLocaleDateString("es-AR", { timeZone: "UTC" })}`, 24, 184);
  const matrix = encodeQrMatrix(verificationUrl, "M");
  const side = 39, x0 = width - 68, y0 = height - 64, module = side / (matrix.length + 8);
  pdf.setFillColor(255, 255, 255); pdf.rect(x0 - 2, y0 - 2, side + 4, side + 4, "F");
  pdf.setFillColor(10, 16, 25);
  matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) pdf.rect(x0 + (x + 4) * module, y0 + (y + 4) * module, module, module, "F"); }));
  pdf.setTextColor(40, 47, 56); pdf.setFontSize(8); pdf.text("Verificá el estado con este QR", x0 + 17, y0 + 46, { align: "center" });
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
