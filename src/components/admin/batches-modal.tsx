import { useState, useEffect } from "react";
import {
  getCertificateBatchesServerFn,
  getBatchCertificatesCodesServerFn,
  downloadBatchCertificatesZipServerFn,
  formatArgentinaDate,
  type CertificateBatchRecord,
} from "@/lib/certificates";
import { handleBatchZipDownloadResult } from "@/lib/certificates/client-pdf";

interface BatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImport: () => void;
}

export function BatchesModal({ isOpen, onClose, onOpenImport }: BatchesModalProps) {
  const [batches, setBatches] = useState<CertificateBatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBatches();
    }
  }, [isOpen]);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const list = await getCertificateBatchesServerFn();
      setBatches(list);
    } catch (err) {
      console.error("Error al cargar lotes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadBatchZip = async (batchId: string) => {
    setDownloadingBatchId(batchId);
    try {
      const codes = await getBatchCertificatesCodesServerFn({
        data: { batchId },
      });

      if (!codes.length) {
        alert("No se encontraron certificados para este lote.");
        return;
      }

      const res = await downloadBatchCertificatesZipServerFn({
        data: { codes },
      });
      await handleBatchZipDownloadResult(res);
    } catch (err: any) {
      console.error("Error al descargar ZIP de lote:", err);
      alert(`Error al generar ZIP: ${err?.message || "Intente nuevamente."}`);
    } finally {
      setDownloadingBatchId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-bg border border-border rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-subtle/30">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-primary">// HISTORIAL DE LOTES</span>
            <span className="text-xs text-muted">| Importaciones y Emisiones Masivas</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-fg font-mono text-sm px-2 py-1 rounded hover:bg-subtle transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              Registro histórico de tandas y descargas de certificados emitidos por lote.
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="font-mono text-micro px-3.5 py-1.5 bg-primary text-black font-bold rounded hover:bg-primary/90 transition-colors"
            >
              + NUEVA IMPORTACIÓN
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center font-mono text-xs text-primary flex items-center justify-center gap-2">
              <span className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>Cargando lotes...</span>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 border border-dashed border-border rounded-lg text-center space-y-2">
              <p className="font-mono text-xs text-muted uppercase">No se han registrado importaciones por lote todavía.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="font-mono text-xs text-primary underline"
              >
                Crear primera importación de alumnos
              </button>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left font-mono text-micro border-collapse">
                <thead className="bg-subtle/40 border-b border-border text-muted">
                  <tr>
                    <th className="p-3">FECHA</th>
                    <th className="p-3">CAPACITACIÓN</th>
                    <th className="p-3">CANTIDAD</th>
                    <th className="p-3">ADMIN</th>
                    <th className="p-3">ESTADO</th>
                    <th className="p-3 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-subtle/20">
                      <td className="p-3 text-fg">{formatArgentinaDate(b.createdAt)}</td>
                      <td className="p-3 font-bold text-fg">
                        <div>{b.courseName}</div>
                        <div className="text-micro font-normal text-muted">// {b.courseCode}</div>
                      </td>
                      <td className="p-3 text-fg">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {b.processed} alumnos
                        </span>
                      </td>
                      <td className="p-3 text-muted">{b.createdBy || "Admin"}</td>
                      <td className="p-3">
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded uppercase">
                          {b.status === "completed" ? "COMPLETADO" : b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDownloadBatchZip(b.id)}
                          disabled={downloadingBatchId === b.id}
                          className="font-mono text-micro px-3 py-1 bg-subtle hover:bg-subtle/80 text-fg border border-border rounded transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {downloadingBatchId === b.id && (
                            <span className="size-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                          )}
                          <span>DESCARGAR ZIP 📦</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border">
            <button
              onClick={onClose}
              className="font-mono text-xs px-4 py-2 bg-subtle hover:bg-subtle/80 text-fg rounded transition-colors"
            >
              CERRAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
