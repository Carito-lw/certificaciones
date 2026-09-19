import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  getAdminCertificateDetail,
  revokeCertificate,
  reactivateCertificate,
  updateCertificateDni,
  downloadCertificatePdfServerFn,
  formatArgentinaDateTime,
  formatArgentinaDate,
} from "@/lib/certificates";
import { triggerBase64Download } from "@/lib/certificates/client-download";
import { handleCertificateDownloadResult } from "@/lib/certificates/client-pdf";
import { StatusBadge } from "./admin.certificados.index";

export const Route = createFileRoute("/admin/certificados/$codigo")({
  loader: ({ params }) => getAdminCertificateDetail({ data: { code: params.codigo } }),
  component: AdminCertificateDetailPage,
});

function AdminCertificateDetailPage() {
  const router = useRouter();
  const data = Route.useLoaderData();
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Estado para edición interactiva del DNI
  const [isEditingDni, setIsEditingDni] = useState(false);
  const [dniInput, setDniInput] = useState(data?.certificate.dni || "");
  const [isSavingDni, setIsSavingDni] = useState(false);

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-16 text-center">
        <p className="font-mono text-xs text-muted">// ERROR</p>
        <h1 className="mt-4 font-display text-4xl italic">Certificado no encontrado</h1>
        <div className="mt-8">
          <Link
            to="/admin/certificados"
            className="border border-border bg-surface px-4 py-2 font-mono text-xs text-fg hover:border-primary"
          >
            ← VOLVER AL LISTADO
          </Link>
        </div>
      </div>
    );
  }

  const { certificate, verifications } = data;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await downloadCertificatePdfServerFn({
        data: { code: certificate.code },
      });
      await handleCertificateDownloadResult(res);
    } catch (err: any) {
      console.error("Error descargando PDF:", err);
      alert(`Error al generar el certificado PDF: ${err?.message || "Intente nuevamente"}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleRevoke = async () => {
    setIsProcessing(true);
    try {
      await revokeCertificate({
        data: {
          code: certificate.code,
          reason: revokeReason || undefined,
        },
      });
      setIsRevokeModalOpen(false);
      setRevokeReason("");
      await router.invalidate();
    } catch (err) {
      console.error("Error revocando certificado:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm(`¿Confirmás que querés reactivar el certificado ${certificate.code}?`)) return;
    setIsProcessing(true);
    try {
      await reactivateCertificate({
        data: { code: certificate.code },
      });
      await router.invalidate();
    } catch (err) {
      console.error("Error reactivando certificado:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDni = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingDni(true);
    try {
      await updateCertificateDni({
        data: {
          code: certificate.code,
          dni: dniInput.trim() || null,
        },
      });
      setIsEditingDni(false);
      await router.invalidate();
    } catch (err) {
      console.error("Error guardando DNI:", err);
    } finally {
      setIsSavingDni(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
      {/* Navegación superior */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <Link
          to="/admin/certificados"
          className="font-mono text-xs text-muted hover:text-fg transition-colors"
        >
          ← VOLVER A CERTIFICADOS
        </Link>
        <a
          href={`/verificar/${certificate.code}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-primary hover:underline flex items-center gap-1.5"
        >
          <span>VER VISTA PÚBLICA</span>
          <span>↗</span>
        </a>
      </div>

      {/* Cabecera de Certificado */}
      <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-primary">// DETALLE DE CERTIFICADO</span>
            <StatusBadge status={certificate.status} />
          </div>
          <h1 className="mt-3 font-display text-4xl italic md:text-5xl text-fg">
            {certificate.participantName}
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">{certificate.code}</p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isGeneratingPdf || isProcessing}
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 bg-primary px-5 py-2.5 font-mono text-xs font-semibold text-bg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <>
                <span className="inline-block animate-spin">⟳</span>
                <span>GENERANDO PDF...</span>
              </>
            ) : (
              <>
                <span>↓</span>
                <span>DESCARGAR CERTIFICADO PDF</span>
              </>
            )}
          </button>

          {certificate.status === "revoked" ? (
            <button
              disabled={isProcessing || isGeneratingPdf}
              onClick={handleReactivate}
              className="bg-emerald-500/20 border border-emerald-500/40 px-5 py-2.5 font-mono text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              {isProcessing ? "PROCESANDO..." : "REACTIVAR CERTIFICADO"}
            </button>
          ) : (
            <button
              disabled={isProcessing || isGeneratingPdf}
              onClick={() => {
                setIsRevokeModalOpen(true);
                setRevokeReason("");
              }}
              className="bg-red-500/10 border border-red-500/30 px-5 py-2.5 font-mono text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              REVOCAR CERTIFICADO
            </button>
          )}
        </div>
      </div>

      {/* Alerta si está revocado */}
      {certificate.status === "revoked" && (
        <div className="mt-6 border border-red-500/40 bg-red-500/10 p-4">
          <p className="font-mono text-xs font-medium text-red-400">
            // ESTE CERTIFICADO SE ENCUENTRA REVOCADO
          </p>
          <p className="mt-1 text-xs text-red-200/80">
            Revocado el {formatArgentinaDateTime(certificate.revokedAt)}.
            {certificate.revokedReason && ` Motivo: "${certificate.revokedReason}"`}
          </p>
        </div>
      )}

      {/* Ficha técnica de datos */}
      <div className="mt-8 grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        <DataCell label="CAPACITACIÓN" value={certificate.courseName} />
        <DataCell label="CARGA HORARIA" value={`${certificate.hours} horas`} />
        <DataCell label="PERÍODO" value={certificate.period} />

        {/* Celda interactiva de DNI */}
        <div className="bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-micro tracking-label text-muted">DNI DEL ALUMNO</p>
            {!isEditingDni && (
              <button
                type="button"
                onClick={() => {
                  setDniInput(certificate.dni || "");
                  setIsEditingDni(true);
                }}
                className="font-mono text-micro text-primary hover:underline"
              >
                {certificate.dni ? "EDITAR" : "+ CARGAR DNI"}
              </button>
            )}
          </div>

          {isEditingDni ? (
            <form onSubmit={handleSaveDni} className="mt-3 flex flex-col gap-2">
              <input
                type="text"
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value)}
                placeholder="Ej: 38123456"
                autoFocus
                className="border border-border bg-bg px-3 py-1.5 font-mono text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none"
              />
              <div className="flex items-center gap-2 font-mono text-micro mt-1">
                <button
                  type="submit"
                  disabled={isSavingDni}
                  className="bg-primary px-3 py-1 text-primary-fg font-medium hover:opacity-90 transition-opacity"
                >
                  {isSavingDni ? "GUARDANDO..." : "GUARDAR"}
                </button>
                <button
                  type="button"
                  disabled={isSavingDni}
                  onClick={() => {
                    setIsEditingDni(false);
                    setDniInput(certificate.dni || "");
                  }}
                  className="text-muted hover:text-fg px-2 py-1"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-2 font-mono text-sm text-fg">
              {certificate.dni ? (
                <span className="font-medium text-primary">{certificate.dni}</span>
              ) : (
                <span className="text-subtle italic">No registrado</span>
              )}
            </p>
          )}
        </div>

        <DataCell
          label="FECHA DE EMISIÓN"
          value={formatArgentinaDate(certificate.issuedAt) || "—"}
        />
        <DataCell label="ESTADO" value={certificate.status.toUpperCase()} mono />
        <DataCell
          label="PRIMERA CONSULTA"
          value={formatArgentinaDateTime(certificate.firstVerifiedAt)}
          mono
        />
        <DataCell
          label="ÚLTIMA CONSULTA"
          value={formatArgentinaDateTime(certificate.lastVerifiedAt)}
          mono
        />
        <DataCell
          label="TOTAL DE CONSULTAS"
          value={`${certificate.verificationCount} escaneos`}
          mono
        />
      </div>

      {/* Documento Oficial y Certificación PDF */}
      <div className="mt-10 border border-border bg-surface p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-mono text-xs tracking-label text-primary">// EMISIÓN Y FORMATO DE IMPRESIÓN</p>
            <h3 className="font-display text-2xl italic">Certificado Oficial Breakpoint Creativa (A4 Horizontal)</h3>
            <p className="text-xs text-muted max-w-xl">
              Plantilla programática en alta resolución (297 mm × 210 mm) con QR dinámico trazable,
              firmas vectoriales de Carolina Riveros y Gustavo Rojas, y tipografías editoriales.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-micro text-muted">
              <span>QR DIRECTO: <strong className="text-fg">https://breakpointcreativa.com/verificar/{certificate.code}</strong></span>
              <span>DNI ASOCIADO: <strong className="text-fg">{certificate.dni || "Pendiente"}</strong></span>
            </div>
          </div>
          <div>
            <button
              type="button"
              disabled={isGeneratingPdf || isProcessing}
              onClick={handleDownloadPdf}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary px-6 py-3 font-mono text-xs font-semibold text-bg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  <span>GENERANDO PDF...</span>
                </>
              ) : (
                <>
                  <span>↓</span>
                  <span>DESCARGAR CERTIFICADO PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Historial de Verificaciones */}
      <div className="mt-12">
        <div className="border-b border-border pb-4">
          <p className="font-mono text-xs tracking-label text-primary">// HISTORIAL DE CONSULTAS</p>
          <h2 className="mt-1 font-display text-2xl italic">Trazabilidad de Verificaciones</h2>
          <p className="mt-1 text-xs text-muted">
            Registro cronológico de todas las consultas realizadas a este certificado.
          </p>
        </div>

        <div className="mt-6 border border-border bg-surface">
          {verifications.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-muted">
              Aún no se han registrado consultas para este certificado.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {verifications.map((v, idx) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-bg/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-micro text-subtle">
                      #{verifications.length - idx}
                    </span>
                    <span className="font-mono text-xs text-fg">
                      {formatArgentinaDateTime(v.verifiedAt)}
                    </span>
                  </div>
                  <span className="font-mono text-micro text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Consulta registrada
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal de confirmación para revocar */}
      {isRevokeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-border bg-surface p-6 shadow-2xl">
            <p className="font-mono text-xs tracking-label text-red-400">// REVOCAR CERTIFICADO</p>
            <h3 className="mt-3 font-display text-2xl italic">
              ¿Confirmás la revocación?
            </h3>
            <p className="mt-2 font-mono text-xs text-primary">{certificate.code}</p>
            <p className="mt-4 text-xs text-muted leading-relaxed">
              El certificado dejará de figurar como válido en la consulta pública.
            </p>

            <div className="mt-5">
              <label className="block font-mono text-micro tracking-label text-subtle mb-2">
                MOTIVO DE REVOCACIÓN (OPCIONAL)
              </label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Ej: Anulación de certificado, error de alumno..."
                className="w-full border border-border bg-bg px-3 py-2 text-xs font-mono text-fg placeholder:text-subtle focus:border-red-400 focus:outline-none"
              />
            </div>

            <div className="mt-8 flex justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsRevokeModalOpen(false)}
                className="px-4 py-2 text-muted hover:text-fg"
              >
                CANCELAR
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRevoke}
                className="bg-red-500/90 px-4 py-2 text-white hover:bg-red-500 font-medium transition-colors"
              >
                {isProcessing ? "REVOCANDO..." : "CONFIRMAR REVOCACIÓN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataCell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-surface p-5">
      <p className="font-mono text-micro tracking-label text-muted">{label}</p>
      <p className={`mt-2 text-sm text-fg ${mono ? "font-mono" : "font-sans"}`}>{value}</p>
    </div>
  );
}
