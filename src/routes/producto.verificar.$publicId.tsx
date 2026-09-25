import { createFileRoute } from "@tanstack/react-router";
import { getPublicCredential } from "@/lib/product-issuance";

export const Route = createFileRoute("/producto/verificar/$publicId")({
  loader: async ({ params }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.publicId)) return null;
    return getPublicCredential({ data: { publicId: params.publicId } });
  },
  component: PublicVerification,
});

function PublicVerification() {
  const credential = Route.useLoaderData();
  return <main className="flex min-h-dvh items-center justify-center bg-bg px-5 py-12 text-fg">
    <article className="w-full max-w-xl rounded-xl border border-border bg-surface p-7 md:p-10">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Verificación de credencial</p>
      {!credential ? <>
        <h1 className="mt-5 text-3xl font-semibold">Credencial no encontrada</h1>
        <p className="mt-3 text-muted">Revisá que el enlace esté completo y sea correcto.</p>
      </> : <>
        <h1 className="mt-5 text-3xl font-semibold" style={{ color: credential.status === "issued" ? (credential.primaryColor || undefined) : undefined }}>
          {credential.status === "issued" ? "Credencial vigente" : "Credencial revocada"}
        </h1>
        <dl className="mt-8 space-y-4 border-t border-border pt-6">
          {[ ["Institución", credential.institutionName], ["Participante", credential.studentName],
            ["Capacitación", credential.courseName], ["Duración", `${credential.hours} horas`],
            ["Período", credential.period], ["Código", credential.code],
            ["Emitida", new Date(credential.issuedAt).toLocaleDateString("es-AR", { timeZone: "UTC" })] ].map(([label, value]) =>
            <div key={label} className="grid gap-1 sm:grid-cols-[130px_1fr]"><dt className="text-sm text-muted">{label}</dt><dd className="font-medium">{value}</dd></div>)}
        </dl>
        {credential.status === "revoked" && <p className="mt-6 rounded-lg border border-red-700 p-4 text-red-300">Esta credencial ya no está vigente.</p>}
      </>}
    </article>
  </main>;
}
