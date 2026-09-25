import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getMyInstitutions, getProductSession } from "@/lib/product";

export const Route = createFileRoute("/producto/")({
  loader: async () => {
    if (!(await getProductSession())) throw redirect({ to: "/producto/login" });
    return getMyInstitutions();
  },
  component: ProductHome,
});

function ProductHome() {
  const institutions = Route.useLoaderData();
  return (
    <main className="min-h-dvh bg-bg px-5 py-12 text-fg md:px-12">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Plataforma de credenciales</p>
        <h1 className="mt-4 text-4xl font-semibold">Tus instituciones</h1>
        <p className="mt-3 text-muted">Elegí una institución para ver sus capacitaciones y credenciales.</p>
        {institutions.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-surface p-8">
            <h2 className="text-xl font-semibold">Tu cuenta todavía no tiene instituciones asignadas</h2>
            <p className="mt-2 text-muted">Un administrador de la plataforma debe invitarte o asignarte un rol.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {institutions.map((institution) => (
              <Link
                key={institution.id}
                to="/producto/$slug"
                params={{ slug: institution.slug }}
                className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-primary"
              >
                <div className="mb-4 h-2 w-12 rounded-full" style={{ backgroundColor: institution.primaryColor || "#d9971c" }} />
                <h2 className="text-2xl font-semibold">{institution.name}</h2>
                <p className="mt-1 text-sm text-muted">Rol: {institution.role}</p>
                <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted">
                  <span>{institution.courseCount} capacitaciones</span>
                  <span>{institution.studentCount} alumnos</span>
                  <span>{institution.credentialCount} credenciales</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
