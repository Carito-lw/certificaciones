import { useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { getMyInstitutions, getProductSession } from "@/lib/product";
import { getInstitutionCourseRoster, setEnrollmentOutcome } from "@/lib/product-issuance";

type Outcome = "all" | "pending" | "eligible" | "not_eligible";
const outcomes: Outcome[] = ["all", "pending", "eligible", "not_eligible"];
const label: Record<Outcome, string> = { all: "Todos", pending: "Pendiente", eligible: "Apto", not_eligible: "No apto" };

export const Route = createFileRoute("/producto/$slug/curso/$courseId")({
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q.trim().slice(0, 100) : "",
    page: Number.isInteger(Number(search.page)) && Number(search.page) > 0 ? Math.min(10000, Number(search.page)) : 1,
    outcome: outcomes.includes(search.outcome as Outcome) ? search.outcome as Outcome : "all" as Outcome,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    if (!(await getProductSession())) throw redirect({ to: "/producto/login" });
    const [roster, institutions] = await Promise.all([
      getInstitutionCourseRoster({ data: { slug: params.slug, courseId: params.courseId,
        page: deps.page, search: deps.q, outcome: deps.outcome } }),
      getMyInstitutions(),
    ]);
    return { roster, institution: institutions.find((item) => item.slug === params.slug)! };
  },
  component: CourseRoster,
});

function CourseRoster() {
  const { roster, institution } = Route.useLoaderData();
  const { slug, courseId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [query, setQuery] = useState(search.q);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canEdit = institution.role !== "viewer";
  const pages = Math.ceil(roster.total / roster.pageSize);

  async function changeOutcome(enrollmentId: string, outcome: "pending" | "eligible" | "not_eligible") {
    setBusyId(enrollmentId); setError(""); setNotice("");
    try {
      await setEnrollmentOutcome({ data: { slug, courseId, enrollmentId, outcome } });
      setNotice("Aptitud actualizada y registrada.");
      await router.invalidate();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos actualizar la aptitud."); }
    finally { setBusyId(""); }
  }

  function searchRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate({ to: "/producto/$slug/curso/$courseId", params: { slug, courseId },
      search: { q: query.trim(), page: 1, outcome: search.outcome } });
  }

  return <main className="min-h-dvh bg-bg px-5 py-12 text-fg md:px-12">
    <div className="mx-auto max-w-5xl">
      <Link to="/producto/$slug" params={{ slug }} className="text-sm text-primary hover:underline">← {institution.name}</Link>
      <p className="mt-8 font-mono text-xs uppercase tracking-widest text-primary">Alumnos por capacitación</p>
      <h1 className="mt-3 text-3xl font-semibold">{roster.course.name}</h1>
      <p className="mt-2 text-sm text-muted">{roster.course.code} · {roster.total} alumnos en esta vista · página {roster.page} de {pages || 1}</p>
      <form onSubmit={searchRoster} className="mt-8 flex flex-wrap gap-3">
        <label className="min-w-48 flex-1 text-sm">Buscar por nombre o documento
          <input className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Nombre o documento" />
        </label>
        <button type="submit" className="self-end rounded-lg border border-border px-5 py-3 font-semibold">Buscar</button>
      </form>
      <label className="mt-5 block text-sm">Filtrar aptitud
        <select className="mt-2 w-full max-w-xs rounded-lg border border-border bg-surface px-4 py-3 text-fg" value={search.outcome}
          onChange={(event) => void navigate({ to: "/producto/$slug/curso/$courseId", params: { slug, courseId },
            search: { q: search.q, page: 1, outcome: event.target.value as Outcome } })}>
          {outcomes.map((value) => <option key={value} value={value}>{label[value]}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="mt-5 text-sm text-red-400">{error}</p>}
      {notice && <p role="status" className="mt-5 text-sm text-primary">{notice}</p>}
      {roster.rows.length ? <div className="mt-6 overflow-hidden rounded-xl border border-border">
        {roster.rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface p-5 last:border-0">
          <div><p className="font-semibold">{row.last_name}, {row.first_name}</p>
            <p className="mt-1 text-sm text-muted">{row.document_number || "Sin documento"} · {row.credential_status ? `Credencial ${row.credential_status === "issued" ? "vigente" : "revocada"}` : label[row.outcome]}</p></div>
          {canEdit && !row.credential_status && <label className="text-sm">Aptitud
            <select disabled={busyId === row.id} value={row.outcome} onChange={(event) => void changeOutcome(row.id, event.target.value as "pending" | "eligible" | "not_eligible")}
              className="ml-3 rounded-lg border border-border bg-bg px-3 py-2.5 text-fg disabled:opacity-50">
              {outcomes.filter((value) => value !== "all").map((value) => <option key={value} value={value}>{label[value]}</option>)}
            </select>
          </label>}
        </div>)}
      </div> : <p className="mt-6 rounded-xl border border-border bg-surface p-6 text-muted">No se encontraron alumnos con ese filtro.</p>}
      <div className="mt-6 flex justify-between gap-3 text-sm">
        {search.page > 1 ? <Link to="/producto/$slug/curso/$courseId" params={{ slug, courseId }} search={{ ...search, page: search.page - 1 }} className="text-primary hover:underline">← Anterior</Link> : <span />}
        {search.page < pages && <Link to="/producto/$slug/curso/$courseId" params={{ slug, courseId }} search={{ ...search, page: search.page + 1 }} className="text-primary hover:underline">Siguiente →</Link>}
      </div>
    </div>
  </main>;
}
