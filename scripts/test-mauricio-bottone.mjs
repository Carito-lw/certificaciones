import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { renderCertificateHtml, generateCertificateQrSvg } from "../src/lib/certificates/template.ts";

const outputDir = resolve("generated/certificates/pdf");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const artifactsDir = resolve("C:/Users/PC/.gemini/antigravity-ide/brain/dd549024-a6ca-48a3-b962-da20b47c60cc");

const bgPath = resolve("public/certificate-assets/certificate-template-bg.png");
const bgBase64 = readFileSync(bgPath).toString("base64");
const bgDataUri = `data:image/png;base64,${bgBase64}`;

const student = {
  certificateCode: "BPC-PYVC-2026-0002",
  participantName: "Mauricio Bottone",
  dni: "21.809.918",
  courseName: "Python con Análisis de Datos y Vibe Coding",
  hours: 64,
  period: "abril – julio 2026",
  issueDate: "18 de septiembre de 2026",
};

async function run() {
  console.log("Iniciando prueba específica para Mauricio Bottone (BPC-PYVC-2026-0002)...");
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome" });
  } catch {
    browser = await chromium.launch();
  }

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
  
  // 12. FUENTES: Esperar fuentes listas
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const fontStatus = await page.evaluate(() => document.fonts.status);
  console.log(`Estado de carga de fuentes: ${fontStatus}`);

  // 10. SCREEN: Emular pantalla y capturar screenshot
  await page.emulateMedia({ media: "screen" });
  
  // 9. COMPUTED STYLES EN SCREEN
  const debugScreen = await page.evaluate(() => {
    const selectors = [
      ".certificate-name",
      ".certificate-course",
      ".certificate-description",
      ".certificate-duration",
      ".certificate-dni"
    ];

    return selectors.map(selector => {
      const el = document.querySelector(selector);
      if (!el) return { selector, missing: true };
      const s = getComputedStyle(el);
      return {
        selector,
        text: el.textContent,
        display: s.display,
        textAlign: s.textAlign,
        wordSpacing: s.wordSpacing,
        letterSpacing: s.letterSpacing,
        whiteSpace: s.whiteSpace,
        justifyContent: s.justifyContent,
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight
      };
    });
  });

  console.log("\n=== COMPUTED STYLES (SCREEN) ===");
  console.log(JSON.stringify(debugScreen, null, 2));

  const screenScreenshotPath = join(artifactsDir, "Mauricio_Bottone_SCREEN.png");
  await page.screenshot({ path: screenScreenshotPath, fullPage: true });
  console.log(`✓ Screenshot SCREEN guardado en: ${screenScreenshotPath}`);

  // 10. PRINT: Emular print y capturar screenshot
  await page.emulateMedia({ media: "print" });
  
  const debugPrint = await page.evaluate(() => {
    const selectors = [
      ".certificate-name",
      ".certificate-course",
      ".certificate-description",
      ".certificate-duration",
      ".certificate-dni"
    ];

    return selectors.map(selector => {
      const el = document.querySelector(selector);
      if (!el) return { selector, missing: true };
      const s = getComputedStyle(el);
      return {
        selector,
        text: el.textContent,
        display: s.display,
        textAlign: s.textAlign,
        wordSpacing: s.wordSpacing,
        letterSpacing: s.letterSpacing,
        whiteSpace: s.whiteSpace,
        justifyContent: s.justifyContent,
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight
      };
    });
  });

  console.log("\n=== COMPUTED STYLES (PRINT) ===");
  console.log(JSON.stringify(debugPrint, null, 2));

  const printScreenshotPath = join(artifactsDir, "Mauricio_Bottone_PRINT.png");
  await page.screenshot({ path: printScreenshotPath, fullPage: true });
  console.log(`✓ Screenshot PRINT guardado en: ${printScreenshotPath}`);

  // 11. GENERAR PDF (usando media: screen para máxima fidelidad)
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const pdfPath = join(outputDir, "Certificado_BPC-PYVC-2026-0002_Mauricio_Bottone.pdf");
  const pdfBuffer = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  writeFileSync(pdfPath, pdfBuffer);
  console.log(`\n✓ PDF final generado: ${pdfPath} (${pdfBuffer.length} bytes)`);

  const pdfPreviewPng = join(artifactsDir, "Certificado_BPC-PYVC-2026-0002_Mauricio_Bottone.pdf.png");
  await page.screenshot({ path: pdfPreviewPng, fullPage: true });
  console.log(`✓ Preview de PDF guardado en: ${pdfPreviewPng}`);

  await browser.close();
}

run().catch(console.error);
