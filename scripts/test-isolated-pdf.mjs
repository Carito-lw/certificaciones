import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { renderIsolatedCertificateHtml, generatePdfQrSvg } from "../src/lib/certificates/pdf-template.ts";

const outputDir = resolve("generated/certificates/pdf");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const artifactsDir = resolve("C:/Users/PC/.gemini/antigravity-ide/brain/dd549024-a6ca-48a3-b962-da20b47c60cc");

const bgPath = resolve("public/certificate-assets/certificate-template-bg.png");
const bgBase64 = readFileSync(bgPath).toString("base64");
const bgDataUri = `data:image/png;base64,${bgBase64}`;

const student = {
  certificateCode: "BPC-PYVC-2026-0001",
  participantName: "Ana Maria Medina",
  dni: "32.855.417",
  courseName: "Python con Análisis de Datos y Vibe Coding",
  hours: 64,
  period: "abril – julio 2026",
  issueDate: "18 de septiembre de 2026",
};

async function run() {
  console.log("==================================================");
  console.log("PRUEBA AISLADA: Ana Maria Medina (BPC-PYVC-2026-0001)");
  console.log("==================================================");

  // 1. Verificación del nombre antes de renderizar
  const fullName = student.participantName
    ? student.participantName.trim()
    : `${(student.firstName || "").trim()} ${(student.lastName || "").trim()}`.trim();

  console.log("\n1. JSON / String de fullName antes de renderizar:");
  console.log(JSON.stringify(fullName));

  const qrSvg = generatePdfQrSvg(student.certificateCode);
  const html = renderIsolatedCertificateHtml(student, {
    bgImageDataUri: bgDataUri,
    qrSvg,
  });

  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome" });
  } catch {
    browser = await chromium.launch();
  }

  const page = await browser.newPage({
    viewport: { width: 1491, height: 1055 },
    deviceScaleFactor: 2,
  });

  // Carga del documento aislado
  await page.setContent(html, { waitUntil: "load" });

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  // 2. Verificación de textContent dentro del navegador
  const textCheck = await page.evaluate(() => ({
    name: document.querySelector(".student-name")?.textContent,
    course: document.querySelector(".course-name")?.textContent,
    description: document.querySelector(".description")?.textContent,
    dni: document.querySelector(".dni-text")?.textContent,
  }));

  console.log("\n2. textContent dentro del navegador:");
  console.log(JSON.stringify(textCheck, null, 2));

  // 3. Screenshot del HTML antes del PDF
  const htmlScreenshotPath = join(artifactsDir, "Ana_Maria_Medina_HTML_ISOLATED.png");
  await page.screenshot({ path: htmlScreenshotPath, fullPage: true });
  console.log(`\n3. Screenshot del HTML guardado en:\n${htmlScreenshotPath}`);

  // 4. Generación del PDF A4 landscape
  const pdfPath = join(outputDir, "Certificado_BPC-PYVC-2026-0001_Ana_Maria_Medina.pdf");
  const pdfBuffer = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
    },
  });

  writeFileSync(pdfPath, pdfBuffer);
  console.log(`\n4. PDF generado exitosamente:\n${pdfPath} (${pdfBuffer.length} bytes)`);

  const pdfPreviewPng = join(artifactsDir, "Certificado_BPC-PYVC-2026-0001_Ana_Maria_Medina.pdf.png");
  await page.screenshot({ path: pdfPreviewPng, fullPage: true });
  console.log(`Preview PNG del PDF guardado en:\n${pdfPreviewPng}`);

  await browser.close();
}

run().catch(console.error);
