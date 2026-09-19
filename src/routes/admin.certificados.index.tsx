import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  getAdminCertificates,
  revokeCertificate,
  reactivateCertificate,
  updateCertificateDni,
  formatArgentinaDateTime,
  type CertificateStatus,
  type AdminCertificate,
} from "@/lib/certificates";

export const Route = createFileRoute("/admin/certificados/")({
  loader: () => getAdminCertificates(),
  component: AdminCertificatesPage,
});

function AdminCertificatesPage() {
  const router = useRouter();
  const initialData = Route.useLoaderData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [revokingCode, setRevokingCode] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Estado para modal rápido de edición de DNI
  const [editingDniCert, setEditingDniCert] = useState<{ code: string; name: string; dni: string } | null>(null);
  const [dniInputValue, setDniInputValue] = useState("");
  const [isSavingDni, setIsSavingDni] = useState(false);

  const summary = initialData.summary;
  const list = initialData.certificates;

  // Filtrado reactivo en el cliente
  const filtered = list.filter((cert) => {
    if (statusFilter !== "all" && cert.status !== statusFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = cert.participantName.toLowerCase().includes(q);
      const matchCode = cert.code.toLowerCase().includes(q);
      const matchCourse = cert.courseName.toLowerCase().includes(q);
      const matchDni = cert.dni ? cert.dni.toLowerCase().includes(q) : false;
      return matchName || matchCode || matchCourse || matchDni;
    }
    return true;
  });

  const handleRevokeSubmit = async () => {
    if (!revokingCode) return;
    setIsProcessing(true);
    try {
      await revokeCertificate({
        data: {
          code: revokingCode,
          reason: revokeReason || undefined,
        },
      });
      setRevokingCode(null);
      setRevokeReason("");
      await router.invalidate();
    } catch (err) {
      console.error("Error al revocar:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async (code: string) => {
    if (!confirm(`¿Confirmás que querés reactivar el certificado ${code}?`)) return;
    setIsProcessing(true);
    try {
      await reactivateCertificate({
        data: { code },
      });
      await router.invalidate();
    } catch (err) {
      console.error("Error al reactivar:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDniCert) return;
    setIsSavingDni(true);
    try {
      await updateCertificateDni({
        data: {
          code: editingDniCert.code,
          dni: dniInputValue.trim() || null,
        },
      });
      setEditingDniCert(null);
      await router.invalidate();
    } catch (err) {
      console.error("Error al guardar DNI:", err);
    } finally {
      setIsSavingDni(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-border pb-8">
        <div>
          <p className="font-mono text-xs tracking-label text-primary">// PANEL ADMINISTRATIVO</p>
          <h1 className="mt-2 font-display text-4xl italic md:text-5xl">Gestión de Certificados</h1>
          <p className="mt-2 text-sm text-muted">
            Trazabilidad, estados en tiempo real, carga de DNI e historial de consultas.
          </p>
        </div>
      </div>

      {/* Métricas / Resumen */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="TOTAL CERTIFICADOS" value={summary.total} />
        <StatCard label="EMITIDOS" value={summary.issued} sub="Sin consultas" tone="issued" />
        <StatCard label="VERIFICADOS" value={summary.verified} sub="Consultados" tone="verified" />
        <StatCard label="REVOCADOS" value={summary.revoked} sub="Invalidados" tone="revoked" />
      </div>

      {/* Controles: Buscador y Filtros */}
      <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Pestañas de Estado */}
        <div className="flex flex-wrap gap-1 p-1 bg-surface border border-border">
          <FilterTab
            label="Todos"
            count={summary.total}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <FilterTab
            label="Emitidos"
            count={summary.issued}
            active={statusFilter === "issued"}
            onClick={() => setStatusFilter("issued")}
          />
          <FilterTab
            label="Verificados"
            count={summary.verified}
            active={statusFilter === "verified"}
            onClick={() => setStatusFilter("verified")}
          />
          <FilterTab
            label="Revocados"
            count={summary.revoked}
            active={statusFilter === "revoked"}
            onClick={() => setStatusFilter("revoked")}
          />
        </div>

        {/* Barra de Búsqueda */}
        <div className="relative min-w-[280px] md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar alumno, código, DNI, curso..."
            className="w-full border border-border bg-surface px-4 py-2.5 font-mono text-xs text-fg placeholder:text-subtle focus:border-primary focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 font-mono text-xs text-muted hover:text-fg"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Certificados */}
      <div className="mt-6 overflow-x-auto border border-border bg-surface">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-bg/50 font-mono text-micro tracking-label text-muted">
              <th className="px-5 py-3.5">CÓDIGO</th>
              <th className="px-5 py-3.5">ALUMNO</th>
              <th className="px-5 py-3.5">DNI</th>
              <th className="px-5 py-3.5">CAPACITACIÓN</th>
              <th className="px-5 py-3.5">ESTADO</th>
              <th className="px-5 py-3.5">1ª CONSULTA</th>
              <th className="px-5 py-3.5">ÚLTIMA CONSULTA</th>
              <th className="px-5 py-3.5 text-center">CONSULTAS</th>
              <th className="px-5 py-3.5 text-right">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center font-mono text-muted">
                  No se encontraron certificados con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtered.map((cert) => (
                <tr key={cert.code} className="hover:bg-bg/40 transition-colors">
                  <td className="px-5 py-4 font-mono font-medium">
                    <Link
                      to="/admin/certificados/$codigo"
                      params={{ codigo: cert.code }}
                      className="text-primary hover:underline"
                    >
                      {cert.code}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-fg">{cert.participantName}</div>
                  </td>
                  <td className="px-5 py-4">
                    {cert.dni ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDniCert({ code: cert.code, name: cert.participantName, dni: cert.dni || "" });
                          setDniInputValue(cert.dni || "");
                        }}
                        className="font-mono text-xs text-primary/90 hover:text-primary hover:underline"
                        title="Click para editar DNI"
                      >
                        {cert.dni}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDniCert({ code: cert.code, name: cert.participantName, dni: "" });
                          setDniInputValue("");
                        }}
                        className="font-mono text-micro text-subtle hover:text-primary hover:underline"
                      >
                        + Cargar DNI
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-4 max-w-[200px] truncate text-muted" title={cert.courseName}>
                    {cert.courseName}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={cert.status} />
                  </td>
                  <td className="px-5 py-4 font-mono text-micro text-muted">
                    {formatArgentinaDateTime(cert.firstVerifiedAt)}
                  </td>
                  <td className="px-5 py-4 font-mono text-micro text-muted">
                    {formatArgentinaDateTime(cert.lastVerifiedAt)}
                  </td>
                  <td className="px-5 py-4 text-center font-mono font-medium">
                    <span className="inline-block px-2 py-0.5 bg-bg border border-border text-fg rounded">
                      {cert.verificationCount}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 font-mono text-micro">
                      <Link
                        to="/admin/certificados/$codigo"
                        params={{ codigo: cert.code }}
                        className="text-muted hover:text-fg hover:underline"
                      >
                        DETALLE
                      </Link>
                      <a
                        href={`/verificar/${cert.code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-subtle hover:text-muted"
                        title="Abrir vista pública"
                      >
                        ↗
                      </a>
                      {cert.status === "revoked" ? (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleReactivate(cert.code)}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          REACTIVAR
                        </button>
                      ) : (
                        <button
                          disabled={isProcessing}
                          onClick={() => {
                            setRevokingCode(cert.code);
                            setRevokeReason("");
                          }}
                          className="text-red-400/80 hover:text-red-400 transition-colors"
                        >
                          REVOCAR
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Rápido para Cargar/Editar DNI */}
      {editingDniCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-border bg-surface p-6 shadow-2xl">
            <p className="font-mono text-xs tracking-label text-primary">// CARGAR / EDITAR DNI</p>
            <h3 className="mt-3 font-display text-2xl italic">
              {editingDniCert.name}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted">{editingDniCert.code}</p>

            <form onSubmit={handleSaveDniSubmit} className="mt-5">
              <label className="block font-mono text-micro tracking-label text-subtle mb-2">
                NÚMERO DE DNI
              </label>
              <input
                type="text"
                value={dniInputValue}
                onChange={(e) => setDniInputValue(e.target.value)}
                placeholder="Ej: 38123456"
                autoFocus
                className="w-full border border-border bg-bg px-3 py-2 text-sm font-mono text-fg placeholder:text-subtle focus:border-primary focus:outline-none"
              />
              <p className="mt-2 text-micro text-subtle font-mono">
                Este dato es privado y sólo se visualiza en este panel administrativo.
              </p>

              <div className="mt-8 flex justify-end gap-3 font-mono text-xs">
                <button
                  type="button"
                  disabled={isSavingDni}
                  onClick={() => setEditingDniCert(null)}
                  className="px-4 py-2 text-muted hover:text-fg"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSavingDni}
                  className="bg-primary px-4 py-2 text-primary-fg font-medium hover:opacity-90 transition-opacity"
                >
                  {isSavingDni ? "GUARDANDO..." : "GUARDAR DNI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Revocación */}
      {revokingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-border bg-surface p-6 shadow-2xl">
            <p className="font-mono text-xs tracking-label text-red-400">// REVOCAR CERTIFICADO</p>
            <h3 className="mt-3 font-display text-2xl italic">
              ¿Confirmás que querés revocar el certificado?
            </h3>
            <p className="mt-2 font-mono text-xs text-primary">{revokingCode}</p>
            <p className="mt-4 text-xs text-muted leading-relaxed">
              El certificado dejará de figurar como válido en la consulta pública. Esta acción puede ser revertida más tarde mediante la opción Reactivar.
            </p>

            <div className="mt-5">
              <label className="block font-mono text-micro tracking-label text-subtle mb-2">
                MOTIVO DE REVOCACIÓN (OPCIONAL)
              </label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Ej: Error en datos personales, anulación de cohorte..."
                className="w-full border border-border bg-bg px-3 py-2 text-xs font-mono text-fg placeholder:text-subtle focus:border-red-400 focus:outline-none"
              />
            </div>

            <div className="mt-8 flex justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setRevokingCode(null)}
                className="px-4 py-2 text-muted hover:text-fg"
              >
                CANCELAR
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRevokeSubmit}
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

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "issued" | "verified" | "revoked";
}) {
  const borderTone =
    tone === "verified"
      ? "border-primary/40"
      : tone === "revoked"
        ? "border-red-500/30"
        : tone === "issued"
          ? "border-sky-500/30"
          : "border-border";

  return (
    <div className={`border ${borderTone} bg-surface p-5`}>
      <p className="font-mono text-micro tracking-label text-muted">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-4xl italic text-fg">{value}</span>
        {sub && <span className="font-mono text-micro text-subtle">{sub}</span>}
      </div>
    </div>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 font-mono text-xs transition-colors ${
        active
          ? "bg-bg text-fg font-medium border border-border"
          : "text-muted hover:text-fg"
      }`}
    >
      <span>{label}</span>
      <span className="text-micro text-subtle">({count})</span>
    </button>
  );
}

export function StatusBadge({ status }: { status: CertificateStatus }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-micro font-medium text-primary bg-primary/10 border border-primary/20 rounded">
        <span className="size-1.5 rounded-full bg-primary" />
        VERIFICADO
      </span>
    );
  }

  if (status === "revoked") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-micro font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded">
        <span className="size-1.5 rounded-full bg-red-400" />
        REVOCADO
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-micro font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded">
      <span className="size-1.5 rounded-full bg-sky-400" />
      EMITIDO
    </span>
  );
}
