import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { triggerBase64Download } from "./client-download";
import type { CertificateDownloadResult, BatchCertificatesDownloadResult } from "../certificates";

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Renderiza el HTML programático de un certificado a un Blob PDF A4 horizontal (297 mm × 210 mm)
 * con calidad de alta resolución (scale: 2 ~ 300 DPI).
 */
export async function renderHtmlToPdfBlob(htmlContent: string): Promise<Blob> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "1491px"; // 297 mm @ ~127dpi
  container.style.height = "1055px"; // 210 mm @ ~127dpi
  container.style.overflow = "hidden";
  container.style.zIndex = "-1000";
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 200));

    const target = container.querySelector(".certificate-container") || container;

    const canvas = await html2canvas(target as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: 1491,
      height: 1055,
      windowWidth: 1491,
      windowHeight: 1055,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);
    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Procesa el resultado de descarga de un certificado individual.
 * Si el servidor generó el PDF en base64, lo descarga directamente.
 * Si el servidor reporta fallback (p. ej. en Netlify Functions sin Chromium nativo),
 * el cliente renderiza el PDF con alta fidelidad y lo descarga automáticamente.
 */
export async function handleCertificateDownloadResult(result: CertificateDownloadResult) {
  if (result.base64) {
    triggerBase64Download(result.base64, result.filename, "application/pdf");
    return;
  }

  if (result.html) {
    const pdfBlob = await renderHtmlToPdfBlob(result.html);
    triggerBlobDownload(pdfBlob, result.filename);
    return;
  }

  throw new Error("No se recibieron datos de PDF ni HTML del certificado.");
}

/**
 * Procesa el resultado de descarga de un lote de certificados en ZIP.
 */
export async function handleBatchZipDownloadResult(result: BatchCertificatesDownloadResult) {
  if (result.base64) {
    triggerBase64Download(result.base64, result.filename, "application/zip");
    return;
  }

  if (result.items && result.items.length > 0) {
    const zip = new JSZip();
    for (const item of result.items) {
      const pdfBlob = await renderHtmlToPdfBlob(item.html);
      zip.file(item.filename, pdfBlob);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    triggerBlobDownload(zipBlob, result.filename);
    return;
  }

  throw new Error("No se recibieron certificados para empaquetar en ZIP.");
}
