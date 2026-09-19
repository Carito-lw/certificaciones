import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CALENDAR_URL,
  COURSES,
  FILTERS,
  courseBySlug,
  padIndex,
  type Course,
  type FilterId,
} from "@/lib/content";
import { cn } from "@/lib/utils";

type CatalogProps = {
  courseSlug?: string;
  onSelect: (slug?: string) => void;
};

export function Catalog({ courseSlug, onSelect }: CatalogProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const visible = useMemo(() => {
    if (filter === "all") return COURSES;
    return COURSES.filter((course) => course.tags.includes(filter));
  }, [filter]);

  const ia = visible.filter((course) => course.group === "ia");
  const otras = visible.filter((course) => course.group === "otras");
  const openCourse = courseBySlug(courseSlug);

  return (
    <section id="capacitaciones" className="border-t border-border lg:ml-14">
      <div className="flex flex-col gap-8 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8 md:py-14">
        <div>
          <p className="font-mono text-xs tracking-label text-muted">
            05 — Índice
          </p>
          <h2 className="mt-4 font-display text-hero italic">
            Capacitaciones en IA
          </h2>
          <p className="mt-3 max-w-md text-sm text-muted">
            Programas prácticos para marketing, operaciones, turismo, datos y
            código. El punto rojo aparece cuando el programa se detiene: ahí se
            lee.
          </p>
        </div>
        <p className="font-mono text-xs tabular-nums text-subtle">
          {padIndex(visible.length)} / {padIndex(COURSES.length)}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto border-y border-border px-5 py-3 md:px-8">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "h-11 shrink-0 px-3 font-mono text-xs tracking-label transition-colors duration-150",
              filter === item.id
                ? "bg-fg text-bg"
                : "text-muted hover:text-fg",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {ia.length > 0 ? (
        <CourseGroup
          label="Formación en IA"
          courses={ia}
          offset={0}
          onOpen={onSelect}
        />
      ) : null}

      {otras.length > 0 ? (
        <CourseGroup
          label="Otras capacitaciones"
          courses={otras}
          offset={ia.length}
          onOpen={onSelect}
          bordered
        />
      ) : null}

      {visible.length === 0 ? (
        <p className="px-5 py-16 text-sm text-muted md:px-8">
          No hay programas en este filtro. Probá otra categoría o pedinos una a
          medida.
        </p>
      ) : null}

      <div className="flex flex-col items-start justify-between gap-4 border-t border-border px-5 py-8 md:flex-row md:items-center md:px-8">
        <p className="font-display text-2xl italic">
          No encontraste lo que buscabas, armamos tu capacitación a medida.
        </p>
        <Button asChild variant="outline">
          <a href="#contacto">Contactanos</a>
        </Button>
      </div>

      <CoursePanel course={openCourse} onClose={() => onSelect()} />
    </section>
  );
}

function CourseGroup({
  label,
  courses,
  offset,
  onOpen,
  bordered,
}: {
  label: string;
  courses: Course[];
  offset: number;
  onOpen: (slug: string) => void;
  bordered?: boolean;
}) {
  return (
    <div className={bordered ? "border-t border-border" : undefined}>
      <p className="px-5 py-4 font-mono text-micro tracking-label text-subtle md:px-8">
        {label}
      </p>
      <ul>
        {courses.map((course, i) => (
          <li key={course.slug}>
            <CourseRow
              course={course}
              index={offset + i + 1}
              onOpen={() => onOpen(course.slug)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CourseRow({
  course,
  index,
  onOpen,
}: {
  course: Course;
  index: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="course-row group w-full border-t border-border px-5 py-5 text-left transition-colors duration-150 hover:bg-surface md:px-8"
    >
      <span className="relative font-mono text-xs text-subtle">
        <span className="tabular-nums transition-opacity duration-150 group-hover:opacity-0">
          {padIndex(index)}
        </span>
        <span className="absolute left-0 top-1 size-2 rounded-full bg-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      </span>
      <span>
        <span className="block font-display text-xl leading-snug md:text-2xl">
          {course.title}
        </span>
        <span className="mt-1 block max-w-xl text-sm text-muted">
          {course.summary}
        </span>
      </span>
      <span className="col-start-2 mt-3 font-mono text-xs text-subtle md:col-start-auto md:mt-0 md:text-right">
        {course.duration ?? "A convenir"}
      </span>
      <span className="col-start-2 mt-2 font-mono text-micro tracking-label text-muted transition-colors duration-150 group-hover:text-primary md:col-start-auto md:mt-0">
        ABRIR
      </span>
    </button>
  );
}

function CoursePanel({
  course,
  onClose,
}: {
  course: Course | undefined;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={Boolean(course)} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-in fixed inset-0 z-50 bg-bg/70" />
        <Dialog.Content
          className="panel-in fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-bg text-fg focus:outline-none"
          aria-describedby={undefined}
        >
          {course ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-5 py-4 md:px-8">
                <Dialog.Title className="font-mono text-xs tracking-label text-muted">
                  Expediente · {course.group === "ia" ? "IA" : "Oficio"}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="flex size-11 items-center justify-center text-muted hover:text-fg"
                    aria-label="Cerrar"
                  >
                    <X className="size-4" />
                  </button>
                </Dialog.Close>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-8 md:px-8">
                <p className="font-mono text-xs text-primary">
                  {course.duration ?? "Duración a convenir"}
                  {course.audience ? ` · ${course.audience}` : ""}
                </p>
                <h3 className="mt-4 font-display text-3xl leading-tight md:text-4xl">
                  {course.title}
                </h3>
                <p className="mt-6 text-base leading-relaxed text-fg/90">
                  {course.description}
                </p>
                <ul className="mt-8 flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <li
                      key={tag}
                      className="border border-border px-3 py-1 font-mono text-micro uppercase tracking-label text-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border px-5 py-4 md:px-8">
                <Button asChild className="w-full">
                  <a href={CALENDAR_URL} target="_blank" rel="noreferrer">
                    Agendar esta formación
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
