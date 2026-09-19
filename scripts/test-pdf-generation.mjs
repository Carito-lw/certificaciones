import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { renderCertificateHtml, generateCertificateQrSvg } from "../src/lib/certificates/template.ts";

const outputDir = resolve("generated/certificates/pdf");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const bgPath = resolve("public/certificate-assets/certificate-template-bg.png");
const bgBase64 = readFileSync(bgPath).toString("base64");
const bgDataUri = `data:image/png;base64,${bgBase64}`;

const testStudents = [
  {
    certificateCode: "BPC-PYVC-2026-0001",
    participantName: "Ana Maria Medina",
    dni: "32.855.417",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    issueDate: "18 de septiembre de 2026",
  },
  {
    certificateCode: "BPC-PYVC-2026-0003",
    participantName: "Luz Ceneri",
    dni: "42.009.891",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    issueDate: "18 de septiembre de 2026",
  },
  {
    certificateCode: "BPC-PYVC-2026-0008",
    participantName: "Alejandro Morales",
    dni: "29.996.320",
    courseName: "Python con Análisis de Datos y Vibe Coding",
    hours: 64,
    period: "abril – julio 2026",
    issueDate: "18 de septiembre de 2026",
  },
];

function sanitizeFilename(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");
}

async function run() {
  console.log("Launching Chromium...");
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome" });
  } catch {
    browser = await chromium.launch();
  }

  for (const student of testStudents) {
    const filename = `Certificado_${student.certificateCode}_${sanitizeFilename(student.participantName)}.pdf`;
    const pdfPath = join(outputDir, filename);
    const pngPreviewPath = resolve("C:/Users/PC/.gemini/antigravity-ide/brain/dd549024-a6ca-48a3-b962-da20b47c60cc", `${filename}.png`);

    const qrSvg = generateCertificateQrSvg(student.certificateCode);
    const html = renderCertificateHtml(student, {
      bgImageDataUri: bgDataUri,
      qrSvg,
    });

    const page = await browser.newPage({
      viewport: { width: 1491, height: 1055 },
      deviceScaleFactor: 2,
    });

    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });

    // Save screenshot preview
    await page.screenshot({ path: pngPreviewPath, fullPage: true });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    writeFileSync(pdfPath, pdfBuffer);
    console.log(`✓ Generated: ${filename} (${pdfBuffer.length} bytes)`);
    await page.close();
  }

  await browser.close();
  console.log("All test certificates generated successfully!");
}

run().catch(console.error);
