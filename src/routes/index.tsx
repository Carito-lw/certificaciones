import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Catalog } from "@/components/site/catalog";
import {
  Grain,
  Rail,
  SiteFooter,
  SiteHeader,
  SkipLink,
} from "@/components/site/chrome";
import {
  Consultoria,
  Contact,
  Founders,
  Hero,
  Manifesto,
} from "@/components/site/sections";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search.c === "string" ? search.c : undefined,
  }),
  component: Home,
});

function Home() {
  const { c } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SkipLink />
      <Grain />
      <Rail />
      <SiteHeader />
      <main>
        <Hero />
        <Manifesto />
        <Consultoria />
        <Catalog
          courseSlug={c}
          onSelect={(slug) => {
            void navigate({
              search: { c: slug },
              replace: true,
              resetScroll: false,
            });
          }}
        />
        <Founders />
        <Contact />
      </main>
      <SiteFooter />
    </div>
  );
}
