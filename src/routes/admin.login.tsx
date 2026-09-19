import { useState, FormEvent } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Grain, Rail, SiteFooter } from "@/components/site/chrome";
import { authClient } from "@/lib/auth/client";
import { getAdminSessionState } from "@/lib/certificates";

export const Route = createFileRoute("/admin/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/admin/certificados",
  }),
  loaderDeps: ({ search }) => ({ redirect: search.redirect }),
  loader: async ({ deps }) => {
    const session = await getAdminSessionState();
    if (session.authenticated) {
      return { alreadyLoggedIn: true, redirectTo: deps.redirect || "/admin/certificados" };
    }
    return { alreadyLoggedIn: false, redirectTo: "/admin/certificados" };
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/admin/login" });
  const loaderData = Route.useLoaderData();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirigir si ya tiene sesión activa
  if (loaderData?.alreadyLoggedIn) {
    void navigate({ to: loaderData.redirectTo, replace: true });
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const trimmed = email.trim();
      const emailToAuth = trimmed.includes("@")
        ? trimmed.toLowerCase()
        : `${trimmed.toLowerCase()}@breakpointcreativa.com`;

      const response = await authClient.signIn.email({
        email: emailToAuth,
        password: password.trim(),
      });

      if (response.error) {
        console.error("Login error:", response.error);
        setErrorMsg(response.error.message || "Usuario o contraseña incorrectos.");
        setLoading(false);
        return;
      }

      // Redirigir tras login exitoso
      const target = search.redirect || "/admin/certificados";
      void navigate({ to: target, replace: true });
    } catch (err: unknown) {
      console.error("Unexpected login error:", err);
      const msg = err instanceof Error ? err.message : "Usuario o contraseña incorrectos.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
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
          <span className="font-mono text-micro tracking-label text-muted">// ACCESO PRIVADO</span>
        </div>
      </header>

      <main className="lg:ml-14">
        <section className="mx-auto flex min-h-[75dvh] max-w-4xl items-center justify-center px-5 py-20 md:px-8">
          <div className="w-full max-w-md border border-border bg-surface p-8 md:p-10 shadow-2xl">
            <p className="font-mono text-xs tracking-label text-primary">// ACCESO ADMINISTRATIVO</p>
            <h1 className="mt-4 font-display text-4xl italic md:text-5xl">Ingresar al Panel</h1>
            <p className="mt-2 text-xs text-muted font-mono">
              Área privada de administración de certificados.
            </p>

            {errorMsg && (
              <div className="mt-6 border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="admin-email"
                  className="block font-mono text-micro tracking-label text-muted mb-2"
                >
                  USUARIO O CORREO ELECTRÓNICO
                </label>
                <input
                  id="admin-email"
                  type="text"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Carolina o Gustavo"
                  className="w-full border border-border bg-bg px-4 py-3 font-mono text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block font-mono text-micro tracking-label text-muted mb-2"
                >
                  CONTRASEÑA
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full border border-border bg-bg px-4 py-3 font-mono text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center bg-primary px-6 font-mono text-xs font-medium tracking-label text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "VERIFICANDO..." : "INGRESAR"}
              </button>
            </form>

            <div className="mt-8 border-t border-border pt-6 text-center">
              <p className="font-mono text-micro text-subtle leading-relaxed">
                Acceso restringido únicamente a personal autorizado de Breakpoint Creativa.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
