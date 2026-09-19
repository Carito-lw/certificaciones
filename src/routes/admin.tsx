import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { Grain, MendozaClock, Rail } from "@/components/site/chrome";
import { getAdminSessionState } from "@/lib/certificates";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/admin")({
  loader: async ({ location }) => {
    // Si la ruta actual es /admin/login no redirigir
    if (location.pathname === "/admin/login") {
      return { user: null };
    }

    const session = await getAdminSessionState();
    if (!session.authenticated || !session.user) {
      throw redirect({
        to: "/admin/login",
        search: {
          redirect: location.pathname,
        },
      });
    }

    return { user: session.user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignorar errores de red en logout
    }
    void navigate({
      to: "/admin/login",
      search: { redirect: "/admin/certificados" },
      replace: true,
    });
  };

  // Si estamos en la pantalla de login, renderizar sin la cabecera administrativa autenticada
  if (!data?.user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <Grain />
      <Rail />
      <header className="border-b border-border lg:ml-14 sticky top-0 z-30 bg-bg/90 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 font-mono text-xs tracking-label">
              <span className="size-1.5 rounded-full bg-primary" />
              BREAKPOINT CREATIVA
            </a>
            <span className="font-mono text-micro tracking-label text-primary bg-primary/10 px-2 py-0.5 rounded">
              // ADMIN
            </span>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden sm:flex items-center gap-2 font-mono text-micro text-muted">
              <span className="text-fg font-medium">{data.user.name}</span>
              <span className="text-subtle">// Administrador</span>
            </div>

            <a
              href="/admin/certificados"
              className="font-mono text-micro tracking-label text-muted hover:text-fg transition-colors"
            >
              CERTIFICADOS
            </a>

            <a
              href="/verificar"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-block font-mono text-micro tracking-label text-muted hover:text-fg transition-colors"
            >
              VISTA PÚBLICA ↗
            </a>

            <button
              onClick={handleSignOut}
              className="font-mono text-micro tracking-label text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-2.5 py-1 border border-red-500/20 rounded"
              title="Cerrar sesión administrativa"
            >
              CERRAR SESIÓN
            </button>

            <div className="hidden lg:block">
              <MendozaClock />
            </div>
          </div>
        </div>
      </header>

      <main className="lg:ml-14">
        <Outlet />
      </main>
    </div>
  );
}
