import { useState, type FormEvent } from "react";
import { saveInstitutionTemplate } from "@/lib/product-issuance";
import { DEFAULT_TEMPLATE, type TemplateConfiguration } from "@/lib/product-template";

type Template = { id: string; name: string; version: number; configuration: TemplateConfiguration };

export function ProductTemplateEditor({ slug, templates, canManage, onSaved }: {
  slug: string; templates: Template[]; canManage: boolean; onSaved: () => Promise<void>;
}) {
  const [sourceId, setSourceId] = useState("");
  const [name, setName] = useState("");
  const [config, setConfig] = useState<TemplateConfiguration>(DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function choose(value: string) {
    const template = templates.find((item) => item.id === value);
    setSourceId(value); setName(template?.name || "");
    setConfig(template?.configuration || DEFAULT_TEMPLATE);
    setError(""); setMessage("");
  }

  function setField<K extends keyof TemplateConfiguration>(key: K, value: TemplateConfiguration[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const result = await saveInstitutionTemplate({ data: {
        slug, name, basedOnId: sourceId || undefined, configuration: config,
      } });
      setMessage(`Plantilla guardada como versión ${result.version}. Podés elegirla al emitir.`);
      setSourceId(result.id);
      await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar la plantilla."); }
    finally { setSaving(false); }
  }

  const input = "mt-2 w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg";
  return <section aria-label="Plantillas institucionales">
    <h2 className="mt-8 text-2xl font-semibold">Plantillas institucionales</h2>
    <p className="mt-2 text-sm text-muted">Cada emisión conserva la versión seleccionada. Editar una plantilla crea una versión nueva.</p>
    {templates.length > 0 && <div className="mt-5 flex flex-wrap gap-2">
      {templates.map((template) => <button key={template.id} type="button" onClick={() => choose(template.id)}
        className={`rounded-lg border px-3 py-2 text-sm ${sourceId === template.id ? "border-primary text-primary" : "border-border text-muted"}`}>
        {template.name} · v{template.version}
      </button>)}
    </div>}
    {canManage && <form onSubmit={submit} className="mt-6 grid gap-6 rounded-xl border border-border bg-surface p-6 md:grid-cols-2">
      <div className="space-y-4">
        <label className="block text-sm">Nombre de plantilla
          <input className={input} required minLength={2} maxLength={80} value={name} disabled={Boolean(sourceId)}
            onChange={(event) => setName(event.target.value)} placeholder="Ej.: Certificado de capacitación" />
        </label>
        {sourceId && <button type="button" className="text-sm text-primary hover:underline" onClick={() => choose("")}>Crear una plantilla diferente</button>}
        <label className="block text-sm">Color principal
          <input className="mt-2 block h-12 w-24 cursor-pointer rounded-lg border border-border bg-bg p-1" type="color" value={config.accentColor}
            onChange={(event) => setField("accentColor", event.target.value)} />
        </label>
        <label className="block text-sm">Título del certificado
          <input className={input} required minLength={3} maxLength={45} value={config.title}
            onChange={(event) => setField("title", event.target.value)} />
        </label>
        <label className="block text-sm">Texto anterior al nombre
          <input className={input} required minLength={3} maxLength={120} value={config.introduction}
            onChange={(event) => setField("introduction", event.target.value)} />
        </label>
        <label className="block text-sm">Texto posterior al nombre
          <textarea className={input} required minLength={3} maxLength={180} rows={2} value={config.accomplishment}
            onChange={(event) => setField("accomplishment", event.target.value)} />
        </label>
        <label className="block text-sm">Pie de página (opcional)
          <input className={input} maxLength={120} value={config.footer}
            onChange={(event) => setField("footer", event.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
        <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50">
          {saving ? "Guardando…" : sourceId ? "Guardar versión nueva" : "Crear plantilla"}
        </button>
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-muted">Vista previa del texto y color</p>
        <div className="rounded-lg border-2 bg-white px-5 py-10 text-center text-slate-800" style={{ borderColor: config.accentColor }}>
          <p className="text-sm font-semibold" style={{ color: config.accentColor }}>Nombre de la institución</p>
          <h3 className="mt-7 break-words text-2xl font-bold">{config.title}</h3>
          <p className="mt-6 text-sm">{config.introduction}</p>
          <p className="mt-3 text-xl font-semibold">Nombre Apellido</p>
          <p className="mt-4 text-sm">{config.accomplishment}</p>
          <p className="mt-3 font-semibold">Nombre de la capacitación</p>
          {config.footer && <p className="mt-8 text-xs text-slate-600">{config.footer}</p>}
        </div>
      </div>
    </form>}
    {!canManage && templates.length === 0 && <p className="mt-5 text-muted">La institución todavía no tiene plantillas.</p>}
  </section>;
}
