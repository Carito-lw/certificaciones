import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getInstitutionPanel, getProductSession } from "@/lib/product";

export const Route = createFileRoute("/producto/$slug")({
  loader: async ({ params }) => {
    if (!(await getProductSession())) throw redirect({ to: "/producto/login" });
    return getInstitutionPanel({ data: { slug: params.slug } });
  },
  component: InstitutionPanel,
});

function InstitutionPanel() {
  const { institution, courses } = Route.useLoaderData();
  return (
    <main className="min-h-dvh bg-bg px-5 py-12 text-fg md:px-12">
      <div className="mx-auto max-w-5xl">
        <Link to="/producto" className="text-sm text-primary hover:underline">← Instituciones</Link>
        <div className="mt-8 flex items-start gap-4">
          <div className="h-12 w-2 rounded-full" style={{ backgroundColor: institution.primaryColor || "#d9971c" }} />
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Panel institucional</p>
            <h1 className="mt-2 text-4xl font-semibold">{institution.name}</h1>
            <p className="mt-2 text-sm text-muted">Tu rol: {institution.role}</p>
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ["Capacitaciones", institution.courseCount],
            ["Alumnos", institution.studentCount],
            ["Credenciales", institution.credentialCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-surface p-6">
              <p className="text-sm text-muted">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <h2 className="mt-12 text-2xl font-semibold">Capacitaciones</h2>
        {courses.length ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            {courses.map((course) => (
              <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface p-5 last:border-0">
                <div><p className="font-semibold">{course.name}</p><p className="mt-1 text-sm text-muted">{course.code} · {course.hours} horas · {course.period}</p></div>
                <span className="text-xs uppercase text-muted">{course.status === "active" ? "Activa" : "Archivada"}</span>
              </div>
            ))}
          </div>
        ) : <p className="mt-5 rounded-xl border border-border bg-surface p-6 text-muted">Todavía no hay capacitaciones cargadas.</p>}
      </div>
    </main>
  );
}
