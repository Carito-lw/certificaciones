import { createRootRoute, HeadContent, Outlet, Scripts, redirect } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const isProduct = import.meta.env.VITE_PRODUCT_MODE === "saas";
const APP_NAME = isProduct ? "Plataforma de credenciales" : "Breakpoint Creativa";

const GA_ID = import.meta.env.VITE_GA_ID || "G-DQBXNVGMST";
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID || "yguguw8cqq";

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (isProduct && !location.pathname.startsWith("/producto")) {
      throw redirect({ to: "/producto" });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: isProduct
          ? "Emisión, administración y validación de credenciales digitales para instituciones."
          : "No somos tendencia, somos la fuerza que la crea. Capacitaciones y consultoría en inteligencia artificial. Mendoza.",
      },
      { name: "theme-color", content: "#0E0D0B" },
    ],
    links: [
      ...(!isProduct ? [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }] : []),
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif:ital@0;1&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
    scripts: [
      ...(!isProduct && GA_ID
        ? [
            {
              async: true,
              src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
            },
            {
              children: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `,
            },
          ]
        : []),
      ...(!isProduct && CLARITY_ID
        ? [
            {
              children: `
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${CLARITY_ID}");
              `,
            },
          ]
        : []),
    ],
  }),
  component: () => (
    <html lang="es" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
