import { FormEvent, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Grain, Rail, SiteFooter } from "@/components/site/chrome";

export const Route = createFileRoute("/verificar/")({
  component: VerifySearch,
});

function VerifySearch() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!normalized) return;
    void navigate({ to: "/verificar/$codigo", params: { codigo: normalized } });
  };

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
          <span className="font-mono text-micro tracking-label text-muted">// VALIDAR</span>
        </div>
      </header>

      <main className="lg:ml-14">
        <section className="mx-auto flex min-h-[75dvh] max-w-6xl items-center px-5 py-20 md:px-8">
          <div className="grid w-full gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="font-mono text-xs tracking-label text-primary">// CERTIFICADOS</p>
              <h1 className="mt-6 max-w-4xl font-display text-6xl italic leading-[0.9] md:text-8xl">
                Validá un certificado.
              </h1>
              <p className="mt-8 max-w-xl text-lg text-muted">
                Ingresá el código que figura en el certificado emitido por Breakpoint Creativa.
              </p>
            </div>

            <form onSubmit={submit} className="border border-border bg-surface p-6 md:p-8">
              <label htmlFor="certificate-code" className="font-mono text-xs tracking-label text-muted">
                CÓDIGO DE CERTIFICADO
              </label>
              <input
                id="certificate-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="BPC-PYVC-2026-0001"
                autoComplete="off"
                spellCheck={false}
                className="mt-5 w-full border-b border-border bg-transparent py-4 font-mono text-lg uppercase outline-none transition-colors placeholder:text-subtle focus:border-primary"
              />
              <button
                type="submit"
                className="mt-8 flex h-12 w-full items-center justify-center bg-primary px-6 font-mono text-xs font-medium tracking-label text-primary-fg transition-opacity hover:opacity-90"
              >
                VERIFICAR
              </button>
              <p className="mt-5 font-mono text-micro leading-relaxed text-subtle">
                Breakpoint no muestra DNI, correo, teléfono ni información administrativa en esta consulta pública.
              </p>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
