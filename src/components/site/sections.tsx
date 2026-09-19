import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CALENDAR_URL, INSTAGRAM_URL, WHATSAPP_URL } from "@/lib/content";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-dvh flex-col justify-end px-5 pb-10 pt-24 md:px-8 lg:ml-14 lg:pb-14"
    >
      <p className="reveal font-mono text-xs tracking-label text-muted">
        Estudio de formación en IA · Mendoza
      </p>
      <h1 className="sr-only">
        Breakpoint Creativa — No somos tendencia, somos la fuerza que la crea
      </h1>
      <p className="reveal d1 mt-8 pr-5 font-display text-hero italic text-fg">
        No somos
        <br />
        tendencia.
      </p>
      <p className="reveal d2 mt-3 max-w-3xl pr-5 font-display text-hero text-fg">
        Somos la fuerza que la crea<span className="text-primary">.</span>
      </p>
      <div className="reveal d3 mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-md text-sm text-muted md:text-base">
          Capacitaciones y consultoría en inteligencia artificial para equipos
          que quieren dejar de reaccionar y empezar a dominar.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={CALENDAR_URL} target="_blank" rel="noreferrer">
              Agenda tu cita
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="#capacitaciones">Ver capacitaciones</a>
          </Button>
        </div>
      </div>
      <div className="reveal d4 mt-16 flex items-center gap-3 font-mono text-micro tracking-label text-subtle">
        <span className="bp-dot size-1.5 rounded-full bg-primary" />
        EN PAUSA
      </div>
    </section>
  );
}

export function Manifesto() {
  return (
    <section id="estudio" className="border-t border-border lg:ml-14">
      <div className="grid md:grid-cols-12">
        <div className="border-b border-border px-5 py-10 md:col-span-4 md:border-b-0 md:border-r md:px-8 md:py-16">
          <p className="font-mono text-xs tracking-label text-muted">01 — Estudio</p>
          <h2 className="mt-6 font-display text-4xl italic md:text-5xl">
            Nuestra fuerza creativa
          </h2>
        </div>
        <div className="px-5 py-10 md:col-span-8 md:px-10 md:py-16">
          <div className="max-w-2xl space-y-6 text-base text-fg/90 md:text-lg">
            <p>
              En Breakpoint Creativa transformamos el potencial de la Inteligencia
              Artificial en conocimiento práctico y estratégico para su negocio y
              equipo. Nos especializamos en capacitaciones innovadoras y
              personalizadas en IA, diseñadas para equipar a profesionales y
              organizaciones con las habilidades necesarias para navegar y
              sobresalir en la era digital.
            </p>
            <p>
              Surgimos de la pasión por fusionar la inteligencia artificial con la
              creatividad humana, rompiendo barreras en la formación digital.
              Fundada por Carolina Riveros y Gustavo Rojas, nuestra misión es
              empoderar empresas y equipos con herramientas de IA que generen
              impacto real, no solo tendencias pasajeras.
            </p>
            <p>
              Somos un equipo experto en IA, desarrollo y tecnologías de
              vanguardia, integrando soluciones personalizadas para cada
              necesidad.
            </p>
          </div>
        </div>
      </div>
      <div className="grid border-t border-border md:grid-cols-3">
        <Stat k="1200+" v="profesionales formados en Mendoza y regiones cercanas" />
        <Stat k="2023" v="año en que se fundó el estudio" />
        <Stat k="MDZ" v="base en Mendoza, con trabajo en la región" last />
      </div>
      <div className="grid border-t border-border md:grid-cols-3">
        <Value n="01" title="Innovación audaz" />
        <Value n="02" title="Accesibilidad" />
        <Value n="03" title="Colaboración" last />
      </div>
    </section>
  );
}

function Stat({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      className={cnBorder(
        "px-5 py-10 md:px-8",
        !last && "border-b border-border md:border-b-0 md:border-r",
      )}
    >
      <p className="font-display text-stat italic">{k}</p>
      <p className="mt-3 max-w-xs text-sm text-muted">{v}</p>
    </div>
  );
}

function Value({ n, title, last }: { n: string; title: string; last?: boolean }) {
  return (
    <div
      className={cnBorder(
        "flex items-baseline gap-4 px-5 py-8 md:px-8",
        !last && "border-b border-border md:border-b-0 md:border-r",
      )}
    >
      <span className="font-mono text-xs text-primary">{n}</span>
      <span className="font-display text-2xl italic">{title}</span>
    </div>
  );
}

function cnBorder(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Consultoria() {
  return (
    <section id="consultoria" className="bg-paper text-ink lg:ml-14">
      <div className="grid md:grid-cols-12">
        <div className="relative h-full min-h-72 md:col-span-5">
          <img
            src="/breakpoint-still.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-right"
          />
          <div className="absolute inset-0 bg-ink/25" />
          <div className="relative flex h-full min-h-72 flex-col justify-between p-5 md:p-8">
            <p className="font-mono text-xs tracking-label text-fg">
              02 — Interrupción
            </p>
            <p className="max-w-48 font-mono text-xs leading-relaxed tracking-label text-fg/80">
              El punto donde el programa deja de correr en automático.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-between px-5 py-12 md:col-span-7 md:px-10 md:py-16">
          <h2 className="max-w-xl font-display text-4xl italic md:text-5xl">
            Transformá tu negocio antes de que lo hagan tus competidores.
          </h2>
          <div className="mt-10 max-w-xl space-y-6">
            <p className="text-base md:text-lg">
              Nuestra consultoría en Inteligencia Artificial está diseñada para
              líderes que no se conforman. Accedé a estrategias personalizadas que
              multiplican resultados y posicionan a tu equipo en la élite digital.
            </p>
            <p className="font-display text-2xl italic md:text-3xl">
              ¿Estás listo para dejar de reaccionar y empezar a dominar?
            </p>
            <Button asChild variant="ink" size="lg">
              <a href={CALENDAR_URL} target="_blank" rel="noreferrer">
                Agenda tu cita
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Founders() {
  return (
    <section className="border-t border-border lg:ml-14">
      <div className="px-5 py-10 md:px-8 md:py-14">
        <p className="font-mono text-xs tracking-label text-muted">03 — Fundadores</p>
      </div>
      <div className="grid border-t border-border md:grid-cols-2">
        <FounderBlock initials="C.R." name="Carolina Riveros" role="Cofundadora" />
        <FounderBlock initials="G.R." name="Gustavo Rojas" role="Cofundador" last />
      </div>
    </section>
  );
}

function FounderBlock({
  initials,
  name,
  role,
  last,
}: {
  initials: string;
  name: string;
  role: string;
  last?: boolean;
}) {
  return (
    <article
      className={cnBorder(
        "px-5 py-12 md:px-8 md:py-16",
        !last && "border-b border-border md:border-b-0 md:border-r",
      )}
    >
      <p className="font-display text-stat italic text-primary">{initials}</p>
      <h3 className="mt-8 font-display text-3xl">{name}</h3>
      <p className="mt-2 font-mono text-xs tracking-label text-muted">{role}</p>
    </article>
  );
}

export function Contact() {
  return (
    <section id="contacto" className="border-t border-border lg:ml-14">
      <div className="grid md:grid-cols-12">
        <div className="border-b border-border px-5 py-12 md:col-span-5 md:border-b-0 md:border-r md:px-8 md:py-16">
          <p className="font-mono text-xs tracking-label text-muted">04 — Contacto</p>
          <h2 className="mt-6 font-display text-hero italic">
            No encontraste lo que buscabas.
          </h2>
          <p className="mt-4 font-display text-3xl text-muted">
            Armamos tu capacitación a medida.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-8 px-5 py-12 md:col-span-7 md:px-10 md:py-16">
          <p className="max-w-md text-muted">
            Escribinos por Instagram, WhatsApp o agendá una llamada. Contanos el
            equipo, el oficio y el problema: diseñamos el programa.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={CALENDAR_URL} target="_blank" rel="noreferrer">
                Agendar
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
                @breakpointcreativa
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
