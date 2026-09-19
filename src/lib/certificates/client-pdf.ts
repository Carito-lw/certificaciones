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
 * con calidad de alta resolución (300 DPI) usando un iframe aislado para ajuste perfecto sin bordes.
 */
export async function renderHtmlToPdfBlob(htmlContent: string): Promise<Blob> {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-99999px";
  iframe.style.top = "0";
  iframe.style.width = "297mm";
  iframe.style.height = "210mm";
  iframe.style.border = "none";
  iframe.style.margin = "0";
  iframe.style.padding = "0";
  iframe.style.overflow = "hidden";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error("No se pudo inicializar el entorno de renderizado.");

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Esperar a que carguen fuentes e imágenes
    if (doc.fonts) {
      await doc.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 450));

    const target = (doc.querySelector(".certificate-container") as HTMLElement) || doc.body;

    const rect = target.getBoundingClientRect();
    const targetWidth = Math.round(rect.width) || target.offsetWidth || 1123;
    const targetHeight = Math.round(rect.height) || target.offsetHeight || 794;

    const canvas = await html2canvas(target, {
      scale: 3, // Ultra alta resolución ~300 DPI
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#FEFEFB",
      width: targetWidth,
      height: targetHeight,
      windowWidth: targetWidth,
      windowHeight: targetHeight,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Ajuste milimétrico exacto 297mm x 210mm (0 márgenes)
    pdf.addImage(imgData, "JPEG", 0, 0, 297, 210, undefined, "FAST");
    return pdf.output("blob");
  } finally {
    document.body.removeChild(iframe);
  }
}

/**
 * Abre el diálogo nativo de impresión para guardar como PDF 100% vectorial
 */
export function openCertificatePrintDialog(htmlContent: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
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
