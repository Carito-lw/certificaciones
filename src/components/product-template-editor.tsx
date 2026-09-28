import { useState, type FormEvent } from "react";
import { saveInstitutionTemplate } from "@/lib/product-issuance";
import { DEFAULT_TEMPLATE, type TemplateConfiguration } from "@/lib/product-template";

type Template = { id: string; name: string; version: number; configuration: TemplateConfiguration;
  has_signature: boolean; signers: { slot: number; signerName: string; signerRole: string }[] };

async function encodeSignature(file: File) {
  if (!["image/png", "image/jpeg"].includes(file.type) || file.size < 64 || file.size > 150000) {
    throw new Error("Elegí una firma PNG o JPG de hasta 150 KB, preferentemente con fondo transparente.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

export function ProductTemplateEditor({ slug, templates, canManage, onSaved }: {
  slug: string; templates: Template[]; canManage: boolean; onSaved: () => Promise<void>;
}) {
  const [sourceId, setSourceId] = useState("");
  const [name, setName] = useState("");
  const [config, setConfig] = useState<TemplateConfiguration>(DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [secondName, setSecondName] = useState("");
  const [secondRole, setSecondRole] = useState("");
  const [secondFile, setSecondFile] = useState<File | null>(null);

  function choose(value: string) {
    const template = templates.find((item) => item.id === value);
    setSourceId(value); setName(template?.name || "");
    setConfig(template?.configuration || DEFAULT_TEMPLATE);
    setSignerName(""); setSignerRole(""); setSignatureFile(null);
    setSecondName(""); setSecondRole(""); setSecondFile(null);
    setError(""); setMessage("");
  }

  function setField<K extends keyof TemplateConfiguration>(key: K, value: TemplateConfiguration[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const source = templates.find((item) => item.id === sourceId);
      if (!signatureFile && !source?.has_signature) throw new Error("Cargá una firma autorizada antes de guardar la plantilla.");
      if (secondFile && !signatureFile) throw new Error("Cargá primero la firma principal.");
      const signatures: { slot: 1 | 2; signerName: string; signerRole: string;
        mimeType: "image/png" | "image/jpeg"; base64: string }[] = signatureFile ? [{ slot: 1, signerName, signerRole,
        mimeType: signatureFile.type as "image/png" | "image/jpeg", base64: await encodeSignature(signatureFile) }] : [];
      if (secondFile) signatures.push({ slot: 2, signerName: secondName, signerRole: secondRole,
        mimeType: secondFile.type as "image/png" | "image/jpeg", base64: await encodeSignature(secondFile) });
      const result = await saveInstitutionTemplate({ data: {
        slug, name, basedOnId: sourceId || undefined, configuration: config,
        signatures: signatureFile ? signatures : undefined,
      } });
      setMessage(`Plantilla guardada como versión ${result.version}. Podés elegirla al emitir.`);
      setSourceId(result.id);
      await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar la plantilla."); }
    finally { setSaving(false); }
  }

  const input = "mt-2 w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg";
  const source = templates.find((item) => item.id === sourceId);
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
        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Firma institucional</legend>
          <p className="text-xs text-muted">Usá la firma autorizada de la institución. PNG con fondo transparente o JPG, hasta 150 KB. La imagen queda privada y se conserva en esta versión.</p>
          {source?.has_signature && <p className="text-xs text-primary">Esta versión tiene {source.signers.length} firma(s): {source.signers.map((signer) => signer.signerName).join(" y ")}. Si no cargás imágenes nuevas, se copian a la siguiente versión.</p>}
          <label className="block text-sm">Nombre de quien firma
            <input className={input} required={Boolean(signatureFile)} maxLength={100} value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Ej.: María Pérez" />
          </label>
          <label className="block text-sm">Cargo
            <input className={input} required={Boolean(signatureFile)} maxLength={100} value={signerRole} onChange={(event) => setSignerRole(event.target.value)} placeholder="Ej.: Dirección de Formación" />
          </label>
          <label className="block text-sm">Imagen de la firma
            <input key={`principal-${sourceId}`} className={input} type="file" accept="image/png,image/jpeg" onChange={(event) => setSignatureFile(event.target.files?.[0] || null)} />
          </label>
          <p className="pt-2 text-xs text-muted">Segunda firma, si corresponde:</p>
          <label className="block text-sm">Nombre de la segunda persona
            <input className={input} required={Boolean(secondFile)} maxLength={100} value={secondName} onChange={(event) => setSecondName(event.target.value)} />
          </label>
          <label className="block text-sm">Cargo de la segunda persona
            <input className={input} required={Boolean(secondFile)} maxLength={100} value={secondRole} onChange={(event) => setSecondRole(event.target.value)} />
          </label>
          <label className="block text-sm">Imagen de la segunda firma
            <input key={`segunda-${sourceId}`} className={input} type="file" accept="image/png,image/jpeg" onChange={(event) => setSecondFile(event.target.files?.[0] || null)} />
          </label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
        <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50">
          {saving ? "Guardando…" : sourceId ? "Guardar versión nueva" : "Crear plantilla"}
        </button>
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-muted">Vista previa de composición. El PDF incluye el QR y la firma cargada.</p>
        <div className="border-[5px] border-[#172b42] bg-white p-2 text-center text-[#172b42]" style={{ boxShadow: `inset 0 0 0 1px ${config.accentColor}` }}>
          <div className="mx-auto mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#172b42] text-xs font-bold text-white">IN</div>
          <p className="mt-2 font-serif text-xl font-bold">Nombre de la institución</p>
          <p className="text-[10px] uppercase tracking-wide">Emisión institucional / Documento verificable</p>
          <p className="mx-auto mt-5 w-fit rounded-full bg-stone-100 px-5 py-1 text-[10px] font-semibold uppercase">Constancia de formación</p>
          <h3 className="mt-3 break-words font-serif text-3xl font-bold">{config.title}</h3>
          <p className="mx-auto mt-1 w-fit rounded-full bg-stone-100 px-4 py-1 text-[10px] uppercase">Capacitación acreditada</p>
          <p className="mt-4 font-serif text-sm">{config.introduction}</p>
          <p className="mt-3 font-serif text-2xl italic" style={{ color: config.accentColor }}>Nombre Apellido</p>
          <div className="mx-auto mt-2 h-px w-3/4 bg-[#ae9462]" />
          <p className="mt-3 font-serif text-sm">{config.accomplishment}</p>
          <p className="mt-3 font-serif text-lg font-bold">Nombre de la capacitación</p>
          <div className="mt-5 grid grid-cols-4 border border-slate-300 text-[9px]">
            {[["DNI", "00000000"], ["Duración", "40 horas"], ["Período", "2026"], ["Código único", "ABC-000001"]].map(([label, value]) =>
              <div key={label} className="border-r border-slate-300 last:border-0"><p className="bg-[#172b42] p-1 font-semibold uppercase text-white">{label}</p><p className="p-1">{value}</p></div>)}
          </div>
          <div className="mt-4 flex items-end justify-between gap-3 text-left text-[10px]">
            <div className="flex items-center gap-2"><div className="grid h-12 w-12 place-items-center border border-slate-300 font-bold">QR</div><span>Validación pública<br />Escaneá para verificar</span></div>
            <div className="min-w-28 border-b border-[#ae9462] pb-1 text-center">{source?.signers[0]?.signerName || signerName || "Firma autorizada"}</div>
          </div>
          {config.footer && <p className="mt-3 text-xs text-slate-600">{config.footer}</p>}
        </div>
      </div>
    </form>}
    {!canManage && templates.length === 0 && <p className="mt-5 text-muted">La institución todavía no tiene plantillas.</p>}
  </section>;
}
