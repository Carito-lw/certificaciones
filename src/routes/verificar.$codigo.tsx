import { createFileRoute } from "@tanstack/react-router";
import { Grain, Rail, SiteFooter } from "@/components/site/chrome";
import { getCertificateByCode, formatArgentinaDate } from "@/lib/certificates";

export const Route = createFileRoute("/verificar/$codigo")({
  loader: ({ params }) => getCertificateByCode({ data: { code: params.codigo } }),
  component: CertificateResult,
});

function CertificateResult() {
  const certificate = Route.useLoaderData();
  const isRevoked = certificate?.status === "revoked";

  const firstVerifiedDateFormatted = certificate?.firstVerifiedAt
    ? formatArgentinaDate(certificate.firstVerifiedAt)
    : null;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <Grain />
      <Rail />
      <header className="border-b border-border lg:ml-14">
        <div className="flex h-14 items-center justify-between px-5 md:px-8">
          <a href="/" className="flex items-center gap-2 font-mono text-xs tracking-label">
            <span className="size-1.5 rounded-full bg-primary" />
            BREAKPOINT CREATIVA
          </a>
          <a href="/verificar" className="font-mono text-micro tracking-label text-muted hover:text-fg">
            // OTRA CONSULTA
          </a>
        </div>
      </header>

      <main className="lg:ml-14">
        <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          {!certificate ? (
            <ResultFrame label="// CERTIFICADO NO ENCONTRADO" title="Ese código no existe." tone="muted">
              <p className="max-w-2xl text-lg text-muted">
                El código ingresado no corresponde a un certificado emitido por Breakpoint Creativa. Revisá que el código esté escrito exactamente como figura en el documento o contactanos.
              </p>
            </ResultFrame>
          ) : isRevoked ? (
            <ResultFrame label="// CERTIFICADO REVOCADO" title={certificate.participantName} tone="revoked">
              <div className="space-y-6">
                <p className="max-w-2xl text-lg text-red-400/90 font-medium">
                  Este certificado fue revocado por Breakpoint Creativa.
                </p>
                <div className="mt-8 grid gap-px border border-paper-line bg-paper-line text-ink md:grid-cols-2 opacity-75">
                  <Fact label="CAPACITACIÓN" value={certificate.courseName} />
                  <Fact label="CÓDIGO" value={certificate.code} mono />
                </div>
                <p className="mt-8 font-mono text-xs text-muted">
                  Para más información sobre la validez de este documento, contactá a Breakpoint Creativa.
                </p>
              </div>
            </ResultFrame>
          ) : (
            <ResultFrame label="// CERTIFICADO VERIFICADO" title={certificate.participantName} tone="valid">
              <div className="mt-12 grid gap-px border border-paper-line bg-paper-line text-ink md:grid-cols-2">
                <Fact label="CAPACITACIÓN" value={certificate.courseName} />
                <Fact label="CARGA HORARIA" value={`${certificate.hours} horas`} />
                <Fact label="PERÍODO" value={certificate.period} />
                <Fact label="CÓDIGO" value={certificate.code} mono />
              </div>

              <div className="mt-8 space-y-2">
                <p className="font-mono text-xs text-muted">
                  Emitido y validado por Breakpoint Creativa
                </p>
                {firstVerifiedDateFormatted && (
                  <p className="font-mono text-micro text-subtle">
                    Certificado verificado por primera vez el {firstVerifiedDateFormatted}.
                  </p>
                )}
              </div>
            </ResultFrame>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ResultFrame({
  label,
  title,
  tone,
  children,
}: {
  label: string;
  title: string;
  tone: "valid" | "muted" | "revoked";
  children: React.ReactNode;
}) {
  const dotColor =
    tone === "valid"
      ? "bg-primary"
      : tone === "revoked"
        ? "bg-red-500"
        : "bg-subtle";

  const labelColor =
    tone === "valid"
      ? "text-primary"
      : tone === "revoked"
        ? "text-red-400"
        : "text-muted";

  return (
    <article>
      <div className="flex items-center gap-3 font-mono text-xs tracking-label">
        <span className={`size-2 rounded-full ${dotColor}`} />
        <span className={labelColor}>{label}</span>
      </div>
      <h1 className="mt-7 max-w-5xl font-display text-6xl italic leading-[0.9] md:text-8xl">{title}</h1>
      <div className="mt-10">{children}</div>
    </article>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-paper p-6 md:p-8">
      <p className="font-mono text-micro tracking-label text-paper-muted">{label}</p>
      <p className={`mt-4 text-xl leading-snug md:text-2xl ${mono ? "font-mono text-lg md:text-xl" : "font-sans"}`}>
        {value}
      </p>
    </div>
  );
}
