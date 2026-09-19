import { useEffect, useState } from "react";
import { CALENDAR_URL, INSTAGRAM_URL, WHATSAPP_URL } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#estudio", label: "Estudio" },
  { href: "#consultoria", label: "Consultoría" },
  { href: "#capacitaciones", label: "Capacitaciones" },
  { href: "#contacto", label: "Contacto" },
] as const;

export function Grain() {
  return <div className="grain" aria-hidden="true" />;
}

export function MendozaClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("es-AR", {
          timeZone: "America/Argentina/Mendoza",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="inline-block min-w-28 text-right font-mono text-xs tabular-nums tracking-wider text-muted">
      {time ? `${time} MDZ` : "MENDOZA"}
    </span>
  );
}

export function Rail() {
  const [line, setLine] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      setLine(Math.floor(window.scrollY / 28) + 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <aside
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 left-0 z-30 hidden w-14 flex-col items-center border-r border-border py-6 lg:flex"
    >
      <span className="bp-dot mt-1 size-2 rounded-full bg-primary" />
      <span className="writing-vertical mt-6 font-mono text-micro tracking-label text-subtle">
        BREAKPOINT
      </span>
      <span className="mt-auto font-mono text-micro tabular-nums text-muted">
        L.{String(line).padStart(4, "0")}
      </span>
    </aside>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-sm lg:left-14">
      <div className="flex h-14 items-center justify-between px-5 md:px-8">
        <a href="#top" className="flex items-center gap-2 font-mono text-xs tracking-label">
          <span className="size-1.5 rounded-full bg-primary" />
          BP
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-xs tracking-label text-muted transition-colors duration-150 hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <MendozaClock />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <a href={CALENDAR_URL} target="_blank" rel="noreferrer">
              Agendar
            </a>
          </Button>
          <button
            type="button"
            className="flex h-11 items-center px-1 font-mono text-xs tracking-label md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-index"
          >
            {open ? "Cerrar" : "Índice"}
          </button>
        </div>
      </div>

      <div
        id="mobile-index"
        className={cn(
          "overflow-hidden border-t border-border bg-paper text-ink transition-[max-height,opacity] duration-300 ease-out md:hidden",
          open ? "max-h-dvh opacity-100" : "max-h-0 border-t-0 opacity-0",
        )}
      >
        <nav className="flex flex-col px-5 py-6">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex h-14 items-center border-b border-paper-line font-display text-3xl italic"
            >
              {link.label}
            </a>
          ))}
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="mt-6 flex h-12 items-center justify-center bg-ink text-sm text-paper"
          >
            Agendar una cita
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border lg:ml-14">
      <div className="flex flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="flex items-center gap-2 font-mono text-xs tracking-label">
            <span className="size-1.5 rounded-full bg-primary" />
            BREAKPOINT CREATIVA
          </p>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Formación en IA, desarrollo y ciencia de datos. Mendoza y regiones
            cercanas.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs tracking-label text-muted">
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-fg">
            Instagram
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-fg">
            WhatsApp
          </a>
          <a href={CALENDAR_URL} target="_blank" rel="noreferrer" className="hover:text-fg">
            Agenda
          </a>
          <span>Est. 2023</span>
        </div>
      </div>
    </footer>
  );
}

export function SkipLink() {
  return (
    <a
      href="#estudio"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
    >
      Saltar al contenido
    </a>
  );
}
