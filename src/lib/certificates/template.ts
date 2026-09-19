import { encodeQrMatrix, renderSvg } from "./qr.ts";

export interface CertificateData {
  certificateCode: string;
  firstName?: string;
  lastName?: string;
  participantName?: string;
  dni?: string | null;
  courseName: string;
  hours: number;
  period: string;
  issueDate?: string | null;
}

export const BREAKPOINT_VALIDATION_BASE_URL = "https://breakpointcreativa.com/verificar";

export function getCertificateValidationUrl(code: string): string {
  const clean = code.trim().toUpperCase().replace(/\s+/g, "");
  return `${BREAKPOINT_VALIDATION_BASE_URL}/${clean}`;
}

export function generateCertificateQrSvg(code: string): string {
  const clean = code.trim().toUpperCase().replace(/\s+/g, "");
  const url = getCertificateValidationUrl(clean);
  const matrix = encodeQrMatrix(url, "M");
  const rawSvg = renderSvg(matrix, {
    size: 256,
    margin: 2,
    darkColor: "#11100e",
    lightColor: "#ffffff",
  });
  // Inyectar atributo de trazabilidad y verificación en el tag raíz <svg>
  return rawSvg.replace(
    "<svg ",
    `<svg data-certificate-code="${clean}" data-validation-url="${url}" `,
  );
}

/**
 * Valida de forma estricta que el código del certificado coincida con el QR.
 */
export function validateCertificateQrMatch(code: string, qrSvg: string): boolean {
  const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
  // Si el SVG tiene el atributo de trazabilidad
  if (qrSvg.includes(`data-certificate-code="${cleanCode}"`)) return true;
  if (qrSvg.includes(cleanCode)) return true;
  return false;
}

export function renderCertificateHtml(
  data: CertificateData,
  options: {
    bgImageDataUri: string;
    qrSvg?: string;
  },
): string {
  const cleanCode = data.certificateCode.trim().toUpperCase().replace(/\s+/g, "");
  
  // Nombre completo
  const fullName = data.participantName
    ? data.participantName
    : `${data.firstName || ""} ${data.lastName || ""}`.trim();

  // QR SVG programático
  const qrSvg = options.qrSvg || generateCertificateQrSvg(cleanCode);

  // Validación de seguridad estricta: nunca permitir discrepancia entre código y QR
  const expectedValidationUrl = getCertificateValidationUrl(cleanCode);
  if (!validateCertificateQrMatch(cleanCode, qrSvg)) {
    throw new Error(
      `Inconsistencia crítica de seguridad: El código [${cleanCode}] no coincide con el QR proporcionado.`,
    );
  }

  // DNI formateado
  const dniText = data.dni ? `DNI ${data.dni}` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Certificado ${cleanCode} — ${fullName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@500;700&display=swap');

    @page {
      size: 297mm 210mm;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 297mm;
      height: 210mm;
      overflow: hidden;
      background-color: #FEFEFB;
      color: #161310;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .certificate-container {
      position: relative;
      width: 297mm;
      height: 210mm;
      background-image: url('${options.bgImageDataUri}');
      background-size: 100% 100%;
      background-position: center;
      background-repeat: no-repeat;
      overflow: hidden;
    }

    /* Sector Superior Derecho: Código de Certificado */
    .cert-code-container {
      position: absolute;
      top: 13.5mm;
      right: 22.2mm;
      width: 38mm;
      text-align: center;
      z-index: 10;
    }

    .cert-code-text {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 3.1mm;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #161310;
      line-height: 1;
    }

    /* Cuerpo Principal del Certificado */
    .cert-body {
      position: absolute;
      left: 17.2mm;
      top: 50.5mm;
      width: 145mm;
      z-index: 10;
    }

    .cert-heading-certificamos {
      font-size: 3.25mm;
      font-weight: 600;
      letter-spacing: 0.16em;
      color: #2b2824;
      text-transform: uppercase;
      margin-bottom: 3.8mm;
    }

    .cert-student-name {
      font-size: 9.8mm;
      font-weight: 800;
      color: #0f0e0c;
      letter-spacing: -0.025em;
      line-height: 1.05;
      margin-bottom: 3.6mm;
    }

    .cert-dni-row {
      display: flex;
      align-items: center;
      gap: 2.8mm;
      margin-bottom: 5.2mm;
    }

    .cert-orange-pill {
      display: inline-block;
      width: 14.8mm;
      height: 1.15mm;
      background-color: #ff5500;
      border-radius: 0.3mm;
    }

    .cert-dni-text {
      font-size: 3.55mm;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #1f1d19;
    }

    .cert-completion-intro {
      font-size: 3.55mm;
      font-weight: 500;
      color: #2b2824;
      margin-bottom: 4.8mm;
      letter-spacing: 0.005em;
    }

    .cert-course-title {
      font-size: 7.7mm;
      font-weight: 800;
      color: #0f0e0c;
      letter-spacing: -0.015em;
      line-height: 1.12;
      text-transform: uppercase;
      margin-bottom: 4.6mm;
      max-width: 138mm;
    }

    .cert-duration-period {
      font-size: 3.45mm;
      font-weight: 500;
      line-height: 1.38;
      color: #2e2b26;
      margin-bottom: 5.2mm;
    }

    .cert-location-date {
      font-size: 3.45mm;
      font-weight: 500;
      color: #2b2824;
      letter-spacing: 0.01em;
    }

    /* Sector Inferior Derecho: Código QR Real */
    .cert-qr-wrapper {
      position: absolute;
      top: 161.4mm;
      right: 21.1mm;
      width: 19.8mm;
      height: 19.8mm;
      background: #ffffff;
      padding: 0.4mm;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
    }

    .cert-qr-wrapper svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <!-- Código de Certificado (Superior Derecho) -->
    <div class="cert-code-container">
      <div class="cert-code-text">${cleanCode}</div>
    </div>

    <!-- Cuerpo Principal (Sector Izquierdo) -->
    <div class="cert-body">
      <div class="cert-heading-certificamos">CERTIFICAMOS QUE</div>
      <h1 class="cert-student-name">${fullName}</h1>
      
      ${
        dniText
          ? `<div class="cert-dni-row">
               <span class="cert-orange-pill"></span>
               <span class="cert-dni-text">${dniText}</span>
             </div>`
          : `<div class="cert-dni-row">
               <span class="cert-orange-pill"></span>
             </div>`
      }

      <p class="cert-completion-intro">ha completado satisfactoriamente la capacitación</p>
      
      <h2 class="cert-course-title">${data.courseName}</h2>

      <p class="cert-duration-period">
        con una duración total de ${data.hours} horas,<br />
        realizada entre ${data.period}.
      </p>

      <p class="cert-location-date">
        Mendoza, Argentina · ${data.issueDate}
      </p>
    </div>

    <!-- Código QR Escaneable Vectorial (Sector Derecho) -->
    <div class="cert-qr-wrapper" title="${expectedValidationUrl}">
      ${qrSvg}
    </div>
  </div>
</body>
</html>`;
}
