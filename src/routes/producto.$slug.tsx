import { useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { createCourseEnrollment, createInstitutionCourse, createInstitutionStudent, getInstitutionPanel, getProductSession } from "@/lib/product";
import { confirmInstitutionImport, previewInstitutionImport, type ImportInput } from "@/lib/product-import";
import { downloadStudentTemplate, parseStudentSheet } from "@/lib/product-spreadsheet";

export const Route = createFileRoute("/producto/$slug")({
  loader: async ({ params }) => {
    if (!(await getProductSession())) throw redirect({ to: "/producto/login" });
    return getInstitutionPanel({ data: { slug: params.slug } });
  },
  component: InstitutionPanel,
});

function InstitutionPanel() {
  const { institution, courses, students, enrollments } = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<"courses" | "students">("courses");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importRows, setImportRows] = useState<ImportInput["rows"]>([]);
  const [importCourseId, setImportCourseId] = useState("");
  const [importPreview, setImportPreview] = useState<Awaited<ReturnType<typeof previewInstitutionImport>> | null>(null);
  const [importResult, setImportResult] = useState("");
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const canManageCourses = institution.role === "owner" || institution.role === "admin";
  const canManageStudents = canManageCourses || institution.role === "issuer";

  async function addCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSaving(true);
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      await createInstitutionCourse({ data: {
        slug: institution.slug, name: String(fields.get("name")), code: String(fields.get("code")),
        hours: Number(fields.get("hours")), period: String(fields.get("period")),
      } });
      form.reset();
      await router.invalidate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar la capacitación.");
    } finally { setSaving(false); }
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSaving(true);
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      await createInstitutionStudent({ data: {
        slug: institution.slug, firstName: String(fields.get("firstName")),
        lastName: String(fields.get("lastName")), documentNumber: String(fields.get("documentNumber")),
        email: String(fields.get("email")),
      } });
      form.reset();
      await router.invalidate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el alumno.");
    } finally { setSaving(false); }
  }

  async function enrollStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSaving(true);
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      await createCourseEnrollment({ data: {
        slug: institution.slug, courseId: String(fields.get("courseId")), studentId: String(fields.get("studentId")),
      } });
      form.reset();
      await router.invalidate();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos asociar al alumno."); }
    finally { setSaving(false); }
  }

  async function selectFile(file?: File) {
    setImportRows([]); setImportPreview(null); setImportResult(""); setImportError("");
    if (!file) return;
    try { setImportRows(await parseStudentSheet(file)); }
    catch (cause) { setImportError(cause instanceof Error ? cause.message : "No pudimos leer el archivo."); }
  }

  async function previewImport() {
    setImportBusy(true); setImportError(""); setImportPreview(null);
    try {
      const result = await previewInstitutionImport({ data: { slug: institution.slug, courseId: importCourseId, rows: importRows } });
      setImportPreview(result);
    } catch (cause) { setImportError(cause instanceof Error ? cause.message : "No pudimos validar la lista."); }
    finally { setImportBusy(false); }
  }

  async function confirmImport() {
    setImportBusy(true); setImportError("");
    try {
      const result = await confirmInstitutionImport({ data: { slug: institution.slug, courseId: importCourseId, rows: importRows } });
      setImportResult(`${result.enrolled} alumnos asociados a ${result.courseName}; ${result.alreadyEnrolled} ya estaban inscriptos.`);
      setImportRows([]); setImportPreview(null);
      await router.invalidate();
    } catch (cause) { setImportPreview(null); setImportError(cause instanceof Error ? cause.message : "No pudimos importar la lista."); }
    finally { setImportBusy(false); }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-fg";
  const labelClass = "block text-sm font-medium";
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
        <nav aria-label="Secciones de la institución" className="mt-12 flex gap-2 border-b border-border">
          {([ ["courses", "Capacitaciones"], ["students", "Alumnos"] ] as const).map(([key, title]) => (
            <button key={key} type="button" onClick={() => { setTab(key); setError(""); }}
              aria-current={tab === key ? "page" : undefined}
              className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === key ? "border-primary text-fg" : "border-transparent text-muted hover:text-fg"}`}>{title}</button>
          ))}
        </nav>
        {tab === "courses" ? <section aria-label="Capacitaciones">
          <h2 className="mt-8 text-2xl font-semibold">Capacitaciones</h2>
          {canManageCourses && <form onSubmit={addCourse} className="mt-5 grid gap-4 rounded-xl border border-border bg-surface p-6 sm:grid-cols-2">
            <h3 className="text-lg font-semibold sm:col-span-2">Nueva capacitación</h3>
            <label className={labelClass}>Nombre<input name="name" required maxLength={160} className={inputClass} placeholder="Ej.: Gestión de proyectos" /></label>
            <label className={labelClass}>Código<input name="code" required maxLength={16} minLength={2} pattern="[A-Za-z0-9]{2,16}" className={inputClass} placeholder="Ej.: GPROY26" /></label>
            <label className={labelClass}>Horas<input name="hours" required type="number" min="1" max="10000" className={inputClass} placeholder="40" /></label>
            <label className={labelClass}>Período<input name="period" required maxLength={100} className={inputClass} placeholder="Ej.: Septiembre 2026" /></label>
            {error && <p role="alert" className="text-sm text-red-400 sm:col-span-2">{error}</p>}
            <button disabled={saving} type="submit" className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50 sm:col-span-2 sm:justify-self-start">{saving ? "Guardando…" : "Crear capacitación"}</button>
          </form>}
          {courses.length ? <div className="mt-5 overflow-hidden rounded-xl border border-border">
            {courses.map((course) => <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface p-5 last:border-0">
              <div><p className="font-semibold">{course.name}</p><p className="mt-1 text-sm text-muted">{course.code} · {course.hours} horas · {course.period}</p></div>
              <span className="text-xs uppercase text-muted">{course.status === "active" ? "Activa" : "Archivada"}</span>
            </div>)}
          </div> : <p className="mt-5 rounded-xl border border-border bg-surface p-6 text-muted">Todavía no hay capacitaciones cargadas.</p>}
        </section> : <section aria-label="Alumnos">
          <h2 className="mt-8 text-2xl font-semibold">Alumnos</h2>
          {canManageStudents && <div className="mt-5 rounded-xl border border-border bg-surface p-6">
            <h3 className="text-lg font-semibold">Importar alumnos de Excel o CSV</h3>
            <p className="mt-2 text-sm text-muted">Elegí una capacitación, cargá hasta 1000 alumnos y revisá la lista antes de confirmar. Importar no emite certificados.</p>
            <button type="button" onClick={() => void downloadStudentTemplate()} className="mt-3 text-sm font-semibold text-primary hover:underline">Descargar plantilla de ejemplo</button>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Capacitación
                <select className={inputClass} value={importCourseId} onChange={(e) => { setImportCourseId(e.target.value); setImportPreview(null); setImportResult(""); }}>
                  <option value="">Seleccionar capacitación</option>
                  {courses.filter((course) => course.status === "active").map((course) => <option key={course.id} value={course.id}>{course.name} · {course.period}</option>)}
                </select>
              </label>
              <label className={labelClass}>Archivo Excel o CSV
                <input type="file" accept=".xlsx,.xls,.csv" className={inputClass} onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  void selectFile(file);
                }} />
              </label>
            </div>
            {importRows.length > 0 && <p className="mt-4 text-sm">{importRows.length} filas leídas. Ejemplo: {importRows.slice(0, 3).map((row) => `${row.lastName}, ${row.firstName}`).join(" · ")}</p>}
            {importError && <p role="alert" className="mt-4 text-sm text-red-400">{importError}</p>}
            {importPreview && <div className="mt-5 rounded-lg border border-border bg-bg p-4 text-sm">
              <p className="font-semibold">Vista previa: {importPreview.courseName} · {importPreview.total} alumnos</p>
              <p className="mt-2 text-muted">{importPreview.existingStudents} ya figuran en la institución; {importPreview.alreadyEnrolled} ya están inscriptos en este curso.</p>
              {importPreview.problems.length > 0 && <ul className="mt-3 list-inside list-disc text-red-400">
                {importPreview.problems.slice(0, 15).map((problem, index) => <li key={`${problem.rowNumber}-${index}`}>Fila {problem.rowNumber}: {problem.problem}</li>)}
                {importPreview.problems.length > 15 && <li>Hay {importPreview.problems.length - 15} errores adicionales.</li>}
              </ul>}
            </div>}
            {importResult && <p role="status" className="mt-4 text-sm text-primary">{importResult}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" disabled={importBusy || !importCourseId || !importRows.length} onClick={() => void previewImport()} className="rounded-lg border border-border px-5 py-3 font-semibold disabled:opacity-50">Revisar lista</button>
              {importPreview?.valid && <button type="button" disabled={importBusy} onClick={() => void confirmImport()} className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50">{importBusy ? "Importando…" : `Confirmar ${importPreview.total} alumnos`}</button>}
            </div>
          </div>}
          {canManageStudents && <form onSubmit={addStudent} className="mt-5 grid gap-4 rounded-xl border border-border bg-surface p-6 sm:grid-cols-2">
            <h3 className="text-lg font-semibold sm:col-span-2">Nuevo alumno</h3>
            <label className={labelClass}>Nombre<input name="firstName" required maxLength={100} className={inputClass} /></label>
            <label className={labelClass}>Apellido<input name="lastName" required maxLength={100} className={inputClass} /></label>
            <label className={labelClass}>Documento (opcional)<input name="documentNumber" maxLength={40} className={inputClass} /></label>
            <label className={labelClass}>Correo (opcional)<input name="email" type="email" maxLength={254} className={inputClass} /></label>
            {error && <p role="alert" className="text-sm text-red-400 sm:col-span-2">{error}</p>}
            <button disabled={saving} type="submit" className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50 sm:col-span-2 sm:justify-self-start">{saving ? "Guardando…" : "Agregar alumno"}</button>
          </form>}
          {canManageStudents && students.length > 0 && courses.some((course) => course.status === "active") && <form onSubmit={enrollStudent} className="mt-5 grid gap-4 rounded-xl border border-border bg-surface p-6 sm:grid-cols-2">
            <h3 className="text-lg font-semibold sm:col-span-2">Asociar un alumno existente</h3>
            <label className={labelClass}>Alumno<select name="studentId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Elegir alumno</option>{students.map((student) => <option key={student.id} value={student.id}>{student.lastName}, {student.firstName} · {student.documentNumber || "sin documento"}</option>)}
            </select></label>
            <label className={labelClass}>Capacitación<select name="courseId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Elegir capacitación</option>{courses.filter((course) => course.status === "active").map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select></label>
            {error && <p role="alert" className="text-sm text-red-400 sm:col-span-2">{error}</p>}
            <button type="submit" disabled={saving} className="rounded-lg border border-border px-5 py-3 font-semibold disabled:opacity-50 sm:col-span-2 sm:justify-self-start">{saving ? "Guardando…" : "Asociar alumno"}</button>
          </form>}
          {students.length ? <div className="mt-5 overflow-hidden rounded-xl border border-border">
            {students.map((student) => <div key={student.id} className="border-b border-border bg-surface p-5 last:border-0">
              <p className="font-semibold">{student.lastName}, {student.firstName}</p>
              <p className="mt-1 text-sm text-muted">{[student.documentNumber && `Documento: ${student.documentNumber}`, student.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
              <p className="mt-1 text-xs text-muted">{enrollments.filter((item) => item.studentId === student.id).map((item) => courses.find((course) => course.id === item.courseId)?.name).filter(Boolean).join(" · ") || "Sin capacitación asignada"}</p>
            </div>)}
          </div> : <p className="mt-5 rounded-xl border border-border bg-surface p-6 text-muted">Todavía no hay alumnos cargados.</p>}
          {institution.studentCount > 100 && <p className="mt-4 text-sm text-muted">Mostrando los últimos 100 alumnos de {institution.studentCount}.</p>}
        </section>}
      </div>
    </main>
  );
}
