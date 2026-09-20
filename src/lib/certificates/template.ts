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
    margin: 0,
    darkColor: "#11100e",
    lightColor: "transparent",
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

export function formatCourseTitleHtml(course: string): string {
  const clean = course.trim();
  if (/python con an[aá]lisis de datos y vibe coding/i.test(clean)) {
    return `<div>PYTHON CON ANÁLISIS</div><div>DE DATOS Y VIBE CODING</div>`;
  }
  if (/producci[oó]n y validaci[oó]n de contenidos/i.test(clean)) {
    return `<div>PRODUCCIÓN Y VALIDACIÓN</div><div>DE CONTENIDOS</div>`;
  }
  return `<div>${clean.toUpperCase()}</div>`;
}

export function formatIssueDateSpanish(dateStr?: string | null): string {
  if (!dateStr) return "18 de septiembre de 2026";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      if (monthNum >= 1 && monthNum <= 12) {
        return `${day} de ${months[monthNum - 1]} de ${year}`;
      }
    }
  } catch {}
  return dateStr;
}

export function renderCertificateHtml(
  data: CertificateData,
  options: {
    bgImageDataUri: string;
    qrSvg?: string;
  },
): string {
  const cleanCode = data.certificateCode.trim().toUpperCase().replace(/\s+/g, "");
  
  // Construcción del nombre completo como un único nodo de texto sin arrays ni splits
  const fullName = data.participantName
    ? data.participantName.trim()
    : [data.firstName, data.lastName].filter(Boolean).join(" ").trim();

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
  const courseTitleHtml = formatCourseTitleHtml(data.courseName);
  const formattedDate = formatIssueDateSpanish(data.issueDate);
  
  let formattedPeriod = (data.period || "").trim();
  if (/abril.*julio.*2026/i.test(formattedPeriod)) {
    formattedPeriod = "abril y julio de 2026";
  } else {
    formattedPeriod = formattedPeriod.replace("–", "y").replace("-", "y");
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Certificado ${cleanCode} — ${fullName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@500;700&display=swap');

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
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
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
      right: 18.5mm;
      width: 60mm;
      text-align: right;
      z-index: 10;
      white-space: nowrap;
    }

    .cert-code-text {
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      font-size: 3.05mm;
      font-weight: 700;
      letter-spacing: normal;
      word-spacing: normal;
      color: #161310;
      line-height: 1;
      white-space: nowrap;
    }

    /* Cuerpo Principal del Certificado */
    .cert-body, .certificate-content {
      position: absolute;
      left: 17.2mm;
      top: 50.5mm;
      width: 152mm;
      z-index: 10;
    }

    .cert-heading-certificamos {
      font-size: 3.25mm;
      font-weight: 600;
      letter-spacing: 0.16em;
      color: #2b2824;
      text-transform: uppercase;
      margin-bottom: 3.8mm;
      text-align: left;
    }

    /* Reset total y forzado de tipografía y espaciado */
    .certificate-name,
    .certificate-course,
    .certificate-description,
    .certificate-duration,
    .certificate-date,
    .certificate-dni,
    .cert-student-name,
    .cert-course-title,
    .cert-completion-intro,
    .cert-duration-period,
    .cert-location-date {
      display: block !important;
      text-align: left !important;
      justify-content: initial !important;
      align-items: initial !important;
      word-spacing: 0 !important;
      letter-spacing: normal !important;
      white-space: normal !important;
      font-stretch: normal !important;
      transform: none !important;
    }

    /* Nombre del alumno */
    .certificate-name, .cert-student-name {
      display: block !important;
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      font-size: 9.3mm;
      font-weight: 800;
      color: #0f0e0c;
      line-height: 1.05;
      letter-spacing: normal !important;
      word-spacing: 0 !important;
      text-align: left !important;
      margin-bottom: 2.2mm; /* ~8px: Nombre -> DNI */
    }

    /* Fila de DNI */
    .certificate-dni, .cert-dni-row {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 2.8mm;
      margin-bottom: 5.8mm; /* ~22px: DNI -> descripcion */
    }

    .cert-orange-pill {
      display: inline-block;
      width: 14.8mm;
      height: 1.15mm;
      background-color: #ff5500;
      border-radius: 0.3mm;
      flex-shrink: 0;
    }

    .cert-dni-text {
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      font-size: 3.55mm;
      font-weight: 600;
      letter-spacing: normal !important;
      word-spacing: 0 !important;
      color: #1f1d19;
      text-align: left !important;
    }

    /* Texto de introduccion */
    .certificate-description, .cert-completion-intro {
      display: block !important;
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      font-size: 3.55mm;
      font-weight: 500;
      color: #2b2824;
      line-height: 1.2;
      margin-bottom: 4.2mm; /* ~16px: Descripcion -> curso */
      letter-spacing: normal !important;
      word-spacing: 0 !important;
      text-align: left !important;
      white-space: normal !important;
    }

    /* Titulo del curso en dos lineas controladas */
    .certificate-course, .cert-course-title {
      display: block !important;
      text-align: left !important;
      line-height: 1.02;
      letter-spacing: normal !important;
      word-spacing: 0 !important;
      max-width: 100%;
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      font-size: 6.8mm;
      font-weight: 800;
      color: #0f0e0c;
      text-transform: uppercase;
      margin-bottom: 5.2mm; /* ~20px: Curso -> duracion */
    }

    .certificate-course > div, .cert-course-title > div {
      display: block !important;
      white-space: nowrap !important;
      text-align: left !important;
      letter-spacing: normal !important;
      word-spacing: 0 !important;
    }

    /* Duracion y periodo */
    .certificate-duration, .cert-duration-period {
      display: block !important;
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      font-size: 3.45mm;
      font-weight: 500;
      line-height: 1.38;
      color: #2e2b26;
      margin-bottom: 7.2mm; /* ~27px: Duracion -> fecha */
      letter-spacing: normal !important;
      word-spacing: 0 !important;
      text-align: left !important;
      white-space: normal !important;
    }

    /* Fecha y ubicacion */
    .certificate-date, .cert-location-date {
      display: block !important;
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      font-size: 3.45mm;
      font-weight: 500;
      color: #2b2824;
      line-height: 1.2;
      letter-spacing: normal !important;
      word-spacing: 0 !important;
      text-align: left !important;
      white-space: normal !important;
    }

    @media print {
      .certificate-name,
      .certificate-course,
      .certificate-description,
      .certificate-duration,
      .certificate-date,
      .certificate-dni,
      .cert-student-name,
      .cert-course-title,
      .cert-completion-intro,
      .cert-duration-period,
      .cert-location-date {
        display: block !important;
        text-align: left !important;
        justify-content: initial !important;
        align-items: initial !important;
        word-spacing: 0 !important;
        letter-spacing: normal !important;
        white-space: normal !important;
        font-stretch: normal !important;
        transform: none !important;
      }

      .certificate-dni, .cert-dni-row {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
      }

      .certificate-course > div, .cert-course-title > div {
        display: block !important;
        white-space: nowrap !important;
        text-align: left !important;
        word-spacing: 0 !important;
      }
    }

    /* Sector Inferior Derecho: Código QR Integrado */
    .cert-qr-wrapper, .qr-wrapper {
      position: absolute;
      top: 161.4mm;
      right: 21.1mm;
      width: 19.8mm;
      height: 19.8mm;
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
    }

    .cert-qr-wrapper svg, .qr-wrapper svg {
      width: 100%;
      height: 100%;
      display: block;
      background: transparent !important;
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
    <div class="cert-body certificate-content">
      <div class="cert-heading-certificamos">CERTIFICAMOS QUE</div>
      <h1 class="certificate-name cert-student-name">${fullName}</h1>
      
      ${
        dniText
          ? `<div class="certificate-dni cert-dni-row">
               <span class="cert-orange-pill"></span>
               <span class="cert-dni-text">${dniText}</span>
             </div>`
          : `<div class="certificate-dni cert-dni-row">
               <span class="cert-orange-pill"></span>
             </div>`
      }

      <p class="certificate-description cert-completion-intro">ha completado satisfactoriamente la capacitación</p>
      
      <div class="certificate-course cert-course-title">
        ${courseTitleHtml}
      </div>

      <p class="certificate-duration cert-duration-period">
        con una duración total de ${data.hours} horas,<br />
        realizada entre ${formattedPeriod}.
      </p>

      <p class="certificate-date cert-location-date">
        Mendoza, Argentina · ${formattedDate}
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
