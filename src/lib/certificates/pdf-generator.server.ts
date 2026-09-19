import { chromium, type Browser } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  renderCertificateHtml,
  generateCertificateQrSvg,
  type CertificateData,
} from "./template.ts";
import { createZipArchive, type ZipEntry } from "./zip.ts";

import { TEMPLATE_BG_BASE64 } from "./template-bg-base64.ts";

export function getCertificateTemplateBgDataUri(): string {
  if (TEMPLATE_BG_BASE64) {
    return `data:image/png;base64,${TEMPLATE_BG_BASE64}`;
  }
  const bgPath = resolve("public/certificate-assets/certificate-template-bg.png");
  if (existsSync(bgPath)) {
    return `data:image/png;base64,${readFileSync(bgPath).toString("base64")}`;
  }
  return "";
}

export function renderCompleteCertificateHtml(data: CertificateData): { html: string; filename: string } {
  const bgImageDataUri = getCertificateTemplateBgDataUri();
  const qrSvg = generateCertificateQrSvg(data.certificateCode);
  const html = renderCertificateHtml(data, { bgImageDataUri, qrSvg });
  const filename = getCertificatePdfFilename(data);
  return { html, filename };
}


export function slugifyParticipantName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remover tildes y diacríticos
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function getCertificatePdfFilename(data: CertificateData): string {
  const code = data.certificateCode.trim().toUpperCase().replace(/\s+/g, "");
  const name = data.participantName
    ? data.participantName
    : `${data.firstName || ""} ${data.lastName || ""}`.trim();
  const safeName = slugifyParticipantName(name);
  return `Certificado_${code}_${safeName}.pdf`;
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    try {
      return await chromium.launch({ channel: "msedge" });
    } catch {
      return await chromium.launch();
    }
  }
}

/**
 * Genera el PDF de un certificado individual a partir de sus datos dinámicos.
 */
export async function generateSingleCertificatePdf(
  data: CertificateData,
): Promise<{ buffer: Buffer; filename: string }> {
  const filename = getCertificatePdfFilename(data);
  const bgImageDataUri = getCertificateTemplateBgDataUri();
  const qrSvg = generateCertificateQrSvg(data.certificateCode);

  const html = renderCertificateHtml(data, {
    bgImageDataUri,
    qrSvg,
  });

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1491, height: 1055 },
      deviceScaleFactor: 2,
    });

    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return {
      buffer: Buffer.from(pdfBuffer),
      filename,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Genera un archivo ZIP que contiene los PDFs individuales de una lista de certificados.
 */
export async function generateCertificatesZip(
  certificates: CertificateData[],
  zipFilename = "Certificados_Breakpoint_Creativa.zip",
): Promise<{ buffer: Buffer; filename: string }> {
  if (certificates.length === 0) {
    throw new Error("No se seleccionaron certificados para generar el archivo ZIP.");
  }

  const bgImageDataUri = getCertificateTemplateBgDataUri();
  const browser = await launchBrowser();
  const entries: ZipEntry[] = [];

  try {
    for (const data of certificates) {
      const filename = getCertificatePdfFilename(data);
      const qrSvg = generateCertificateQrSvg(data.certificateCode);
      const html = renderCertificateHtml(data, {
        bgImageDataUri,
        qrSvg,
      });

      const page = await browser.newPage({
        viewport: { width: 1491, height: 1055 },
        deviceScaleFactor: 2,
      });

      await page.setContent(html, { waitUntil: "networkidle" });
      await page.emulateMedia({ media: "print" });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      entries.push({
        filename,
        data: Buffer.from(pdfBuffer),
      });

      await page.close();
    }

    const zipBuffer = createZipArchive(entries);

    return {
      buffer: zipBuffer,
      filename: zipFilename,
    };
  } finally {
    await browser.close();
  }
}
