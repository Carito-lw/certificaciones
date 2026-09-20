import { encodeQrMatrix, renderSvg } from "./qr.ts";

export interface CertificatePdfData {
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

export function generatePdfQrSvg(code: string): string {
  const clean = code.trim().toUpperCase().replace(/\s+/g, "");
  const url = `${BREAKPOINT_VALIDATION_BASE_URL}/${clean}`;
  const matrix = encodeQrMatrix(url, "M");
  const rawSvg = renderSvg(matrix, {
    size: 256,
    margin: 0,
    darkColor: "#11100e",
    lightColor: "transparent",
  });
  return rawSvg.replace(
    "<svg ",
    `<svg data-certificate-code="${clean}" data-validation-url="${url}" `,
  );
}

export function formatCourseTitleLines(course: string): { line1: string; line2?: string } {
  const clean = course.trim();
  if (/python con an[aá]lisis de datos y vibe coding/i.test(clean)) {
    return {
      line1: "PYTHON CON ANÁLISIS",
      line2: "DE DATOS Y VIBE CODING",
    };
  }
  if (/producci[oó]n y validaci[oó]n de contenidos/i.test(clean)) {
    return {
      line1: "PRODUCCIÓN Y VALIDACIÓN",
      line2: "DE CONTENIDOS",
    };
  }
  return {
    line1: clean.toUpperCase(),
  };
}

export function formatIssueDate(dateStr?: string | null): string {
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

export function formatPeriod(periodStr?: string | null): string {
  const clean = (periodStr || "").trim();
  if (/abril.*julio.*2026/i.test(clean)) {
    return "abril y julio de 2026";
  }
  return clean.replace("–", "y").replace("-", "y");
}

/**
 * Genera el documento HTML completo y totalmente aislado para la generación de PDF.
 * No depende de Tailwind, ni de CSS global, ni de componentes React.
 * Utiliza exclusivamente estilos inline y reset total.
 */
export function renderIsolatedCertificateHtml(
  data: CertificatePdfData,
  options: {
    bgImageDataUri: string;
    qrSvg?: string;
  },
): string {
  const cleanCode = data.certificateCode.trim().toUpperCase().replace(/\s+/g, "");

  // Construcción limpia y directa del nombre completo
  const fullName = data.participantName
    ? data.participantName.trim()
    : `${(data.firstName || "").trim()} ${(data.lastName || "").trim()}`.trim();

  const qrSvg = options.qrSvg || generatePdfQrSvg(cleanCode);
  const courseLines = formatCourseTitleLines(data.courseName);
  const formattedDate = formatIssueDate(data.issueDate);
  const formattedPeriodText = formatPeriod(data.period);
  const dniText = data.dni ? `DNI ${data.dni}` : "";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Certificado ${cleanCode} — ${fullName}</title>
  <style>
    @page {
      size: 297mm 210mm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 297mm;
      height: 210mm;
      background-color: #FEFEFB;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 16px;
      font-weight: 400;
      font-style: normal;
      font-stretch: normal;
      font-kerning: normal;
      letter-spacing: normal;
      word-spacing: normal;
      text-align: left;
      white-space: normal;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
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

    /* Código superior derecho */
    .cert-code {
      position: absolute;
      top: 13.5mm;
      right: 18.5mm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      font-weight: 700;
      color: #161310;
      text-align: right;
      white-space: nowrap;
      letter-spacing: 0;
      word-spacing: 0;
      z-index: 10;
    }

    /* Contenedor principal de texto */
    .cert-body {
      position: absolute;
      left: 17.2mm;
      top: 58mm;
      width: 152mm;
      z-index: 10;
      text-align: left;
    }

    .student-name {
      margin: 0 0 3mm 0;
      padding: 0;
      display: block;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 28pt;
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: 0;
      word-spacing: 0;
      color: #0f0e0c;
      white-space: normal;
      text-align: left;
    }

    .dni-container {
      display: block;
      margin: 0 0 5.8mm 0;
      padding-left: 17.5mm; /* Alineado a la derecha de la barra naranja del fondo */
      text-align: left;
      line-height: 1;
    }

    .dni-text {
      display: inline-block;
      vertical-align: middle;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      font-weight: 700;
      color: #1f1d19;
      letter-spacing: 0;
      word-spacing: 0;
      text-align: left;
    }

    .description {
      display: block;
      margin: 0 0 4.5mm 0;
      padding: 0;
      text-align: left;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11.5pt;
      font-weight: 400;
      color: #2b2824;
      line-height: 1.3;
      letter-spacing: 0;
      word-spacing: 0;
      white-space: normal;
    }

    .course-name {
      display: block;
      margin: 0 0 5.5mm 0;
      padding: 0;
      text-align: left;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 21.5pt;
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: 0;
      word-spacing: 0;
      color: #0f0e0c;
      text-transform: uppercase;
    }

    .course-name div {
      display: block;
      white-space: nowrap;
      margin: 0;
      padding: 0;
      text-align: left;
      letter-spacing: 0;
      word-spacing: 0;
    }

    .duration {
      display: block;
      margin: 0 0 7.5mm 0;
      padding: 0;
      text-align: left;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      font-weight: 400;
      color: #2e2b26;
      line-height: 1.35;
      letter-spacing: 0;
      word-spacing: 0;
      white-space: normal;
    }

    .date {
      display: block;
      margin: 0;
      padding: 0;
      text-align: left;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      font-weight: 400;
      color: #2b2824;
      line-height: 1.2;
      letter-spacing: 0;
      word-spacing: 0;
      white-space: normal;
    }

    /* QR Code Integrado sobre fondo */
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
    <div class="cert-code">${cleanCode}</div>

    <div class="cert-body">
      <h1 class="student-name">${fullName}</h1>

      ${
        dniText
          ? `<div class="dni-container">
               <span class="dni-text">${dniText}</span>
             </div>`
          : ""
      }

      <p class="description">ha completado satisfactoriamente la capacitación</p>

      <div class="course-name">
        <div>${courseLines.line1}</div>
        ${courseLines.line2 ? `<div>${courseLines.line2}</div>` : ""}
      </div>

      <p class="duration">
        con una duración total de ${data.hours} horas,<br>
        realizada entre ${formattedPeriodText}.
      </p>

      <p class="date">
        Mendoza, Argentina · ${formattedDate}
      </p>
    </div>

    <div class="cert-qr-wrapper">
      ${qrSvg}
    </div>
  </div>
</body>
</html>`;
}
