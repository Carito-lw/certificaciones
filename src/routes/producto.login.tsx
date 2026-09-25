import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/producto/login")({ component: ProductLogin });

function ProductLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password });
      if (result.error) {
        setError("No pudimos iniciar sesión. Revisá tus credenciales.");
        return;
      }
      await navigate({ to: "/producto" });
    } catch {
      setError("No pudimos iniciar sesión. Intentá nuevamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-5 text-fg">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Plataforma de credenciales</p>
        <h1 className="mt-4 text-3xl font-semibold">Ingresá a tu institución</h1>
        <p className="mt-3 text-sm text-muted">Usá la cuenta que te asignaron para administrar tus capacitaciones.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm">Correo electrónico
            <input className="mt-2 w-full rounded border border-border bg-bg p-3 text-fg" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">Contraseña
            <input className="mt-2 w-full rounded border border-border bg-bg p-3 text-fg" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button className="w-full rounded bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50" disabled={pending} type="submit">
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
