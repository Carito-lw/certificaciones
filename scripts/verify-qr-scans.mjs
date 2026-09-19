import jsQR from "jsqr";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderCertificateHtml, generateCertificateQrSvg, getCertificateValidationUrl } from "../src/lib/certificates/template.ts";

const bgPath = resolve("public/certificate-assets/certificate-template-bg.png");
const bgBase64 = readFileSync(bgPath).toString("base64");
const bgDataUri = `data:image/png;base64,${bgBase64}`;

const testCases = [
  {
    code: "BPC-PYVC-2026-0001",
    name: "Ana Maria Medina",
    dni: "32.855.417",
    expectedUrl: "https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0001",
  },
  {
    code: "BPC-PYVC-2026-0003",
    name: "Luz Ceneri",
    dni: "42.009.891",
    expectedUrl: "https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0003",
  },
  {
    code: "BPC-PYVC-2026-0008",
    name: "Alejandro Morales",
    dni: "29.996.320",
    expectedUrl: "https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0008",
  },
];

async function verifyQrScans() {
  console.log("=================================================");
  console.log("  Verificación de Escaneo Real de Códigos QR");
  console.log("=================================================\n");

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

  let allPassed = true;

  for (const tc of testCases) {
    const student = {
      certificateCode: tc.code,
      participantName: tc.name,
      dni: tc.dni,
      courseName: "Python con Análisis de Datos y Vibe Coding",
      hours: 64,
      period: "abril – julio 2026",
      issueDate: "18 de septiembre de 2026",
    };

    const qrSvg = generateCertificateQrSvg(tc.code);
    const html = renderCertificateHtml(student, {
      bgImageDataUri: bgDataUri,
      qrSvg,
    });

    await page.setContent(html, { waitUntil: "networkidle" });

    // Extraer imagen del área del QR
    const qrElement = await page.$(".cert-qr-wrapper");
    if (!qrElement) throw new Error("No se encontró el elemento .cert-qr-wrapper");

    const qrPngBuffer = await qrElement.screenshot();

    // Decodificar los píxeles del QR PNG con un canvas temporal en la página
    const pixelData = await page.evaluate(async (pngBase64) => {
      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = "data:image/png;base64," + pngBase64;
      });
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, c.width, c.height);
      return {
        data: Array.from(imgData.data),
        width: c.width,
        height: c.height,
      };
    }, qrPngBuffer.toString("base64"));

    const code = jsQR(
      new Uint8ClampedArray(pixelData.data),
      pixelData.width,
      pixelData.height,
    );

    if (!code) {
      console.error(`❌ ERROR: No se pudo decodificar el QR para ${tc.code}`);
      allPassed = false;
      continue;
    }

    const scannedUrl = code.data;
    console.log(`Certificado: ${tc.code} (${tc.name})`);
    console.log(`URL Escaneada: ${scannedUrl}`);
    console.log(`URL Esperada:  ${tc.expectedUrl}`);

    if (scannedUrl === tc.expectedUrl) {
      console.log(`✅ VERIFICADO: Coincidencia exacta del QR con la URL del certificado.\n`);
    } else {
      console.error(`❌ FALLÓ: La URL escaneada no coincide con la esperada!\n`);
      allPassed = false;
    }
  }

  await browser.close();

  if (!allPassed) {
    process.exit(1);
  }
  console.log("=================================================");
  console.log("  TODOS LOS QR FUERON ESCANEADOS Y VALIDADOS");
  console.log("=================================================");
}

verifyQrScans().catch((err) => {
  console.error(err);
  process.exit(1);
});
