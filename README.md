# Breakpoint Creativa — Plataforma Web y Sistema de Gestión de Certificaciones

Plataforma integral de **Breakpoint Creativa** que combina el sitio institucional, catálogo interactivo de capacitaciones y servicios de consultoría, con un **Sistema de Validación y Emisión de Certificados Digitales** con códigos QR trazables y un **Panel de Administración** con autenticación segura y control de roles.

---

## 🚀 Características Principales

### 🌐 Sitio Web Institucional
- **Experiencia visual moderna:** Diseño interactivo y responsivo construido con Tailwind CSS v4, animaciones fluidas y tipografía cuidada.
- **Catálogo de Cursos y Workshops:** Vista detallada de programas educativos, temarios y perfiles de egreso.
- **Sección de Consultoría y Servicios:** Presentación de soluciones empresariales en IA, automatización y desarrollo.
- **Información de Fundadores y Contacto:** Enlaces directos a canales oficiales y redes.

### 🛡️ Sistema Público de Verificación de Certificados
- **Búsqueda pública (`/verificar`):** Validación inmediata ingresando el código único de certificado (ej. `BPC-PYVC-2026-0001`).
- **Página individual (`/verificar/:codigo`):** Vista de validación oficial con estados en tiempo real (*Válido*, *Revocado*, *No encontrado*).
- **Validación server-side y privacidad garantizada:** No expone datos sensibles (DNI, email, teléfono, etc.); solo revela datos académicos públicos (nombre, capacitación, carga horaria, período y estado).
- **Códigos QR de validación:** Cada certificado cuenta con QR vectoriales (SVG) y rasterizados (PNG) que apuntan directamente a su URL canónica de verificación.

### 🔐 Panel de Administración (`/admin`)
- **Autenticación robusta:** Basada en [Better Auth](https://www.better-auth.com/) con sesiones seguras y control de acceso basado en roles (RBAC: Admin / Operator).
- **Gestión completa de Certificados:**
  - Creación y edición de certificados con validación de esquemas (Zod).
  - Activación, suspensión y revocación inmediata de certificados.
  - Generación individual y masiva de códigos QR listos para impresión/entrega.
  - Registro y métricas de verificaciones.

---

## 🛠️ Stack Tecnológico

- **Framework & Routing:** [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- **Frontend:** [React 19](https://react.dev/), [Lucide Icons](https://lucide.dev/), [Radix UI](https://www.radix-ui.com/)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Base de Datos & ORM:** [PostgreSQL](https://www.postgresql.org/) (Neon en producción / [PGlite](https://pglite.dev/) en entorno local), [Kysely](https://kysely.dev/)
- **Autenticación:** [Better Auth](https://www.better-auth.com/) + Jose (JWT / Tokens)
- **Validación de Datos:** [Zod](https://zod.dev/) & [React Hook Form](https://react-hook-form.com/)
- **Empaquetador & Dev Server:** [Vite](https://vitejs.dev/)

---

## 📁 Estructura del Proyecto

```text
BREAKPOINT-CERTIFICACIONES/
├── migrations/                # Migraciones SQL de base de datos (PostgreSQL/Neon)
├── public/                    # Archivos estáticos y branding
├── scripts/                   # Scripts de utilidad (migraciones, QR, usuarios admin)
├── src/
│   ├── components/            # Componentes reutilizables de UI y secciones del sitio
│   │   ├── admin/             # Componentes del panel administrativo
│   │   ├── site/              # Secciones de la landing y catálogo
│   │   └── ui/                # Primitivas de interfaz (botones, inputs, modales, etc.)
│   ├── lib/                   # Lógica central (base de datos, auth, validación QR)
│   │   ├── auth/              # Configuración y clientes de Better Auth
│   │   ├── certificates/      # Lógica de certificados y generación de QR
│   │   └── db/                # Conexión Kysely / PGLite / Postgres
│   ├── routes/                # Enrutamiento de TanStack Router (Público, Verificar, Admin)
│   │   ├── __root.tsx         # Shell raíz de la aplicación
│   │   ├── index.tsx          # Landing page principal
│   │   ├── verificar.tsx      # Búsqueda y visualización de certificados
│   │   └── admin.*.tsx        # Rutas protegidas del panel de administración
│   ├── router.tsx             # Configuración del enrutador
│   └── styles.css             # Estilos globales y temas
├── .env.example               # Plantilla de variables de entorno
├── package.json               # Dependencias y scripts de ejecución
└── vite.config.ts             # Configuración de Vite y plugins
```

---

## ⚙️ Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/Carito-lw/certificaciones.git
cd certificaciones
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia el archivo de ejemplo y completa las variables necesarias:
```bash
cp .env.example .env
```

| Variable | Descripción |
| :--- | :--- |
| `BETTER_AUTH_SECRET` | Secreto aleatorio de al menos 32 caracteres para firmas de sesión. |
| `BETTER_AUTH_URL` | URL base de la aplicación (ej: `http://localhost:8080` o `https://breakpointcreativa.com`). |
| `DATABASE_URL` | String de conexión a PostgreSQL (opcional en local; usa PGLite por defecto). |

### 4. Ejecutar migraciones de base de datos
```bash
npm run db:migrate
```

### 5. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:8080`.

---

## 📜 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo con recarga en caliente (HMR).
- `npm run build`: Compila la aplicación para producción y ejecuta migraciones.
- `npm run db:migrate`: Aplica las migraciones SQL pendientes.
- `npm run certificates:qr`: Genera los códigos QR en formato SVG y PNG para los certificados registrados.
- `npm run admin:create`: Crea un usuario administrador inicial para el panel de control.
- `npm run typecheck`: Comprueba tipos de TypeScript sin emitir código.
- `npm run lint`: Ejecuta el análisis estático de código con ESLint.
- `npm run format`: Formatea el código fuente con Prettier.

---

## 🔒 Privacidad y Seguridad

- **Seguridad en la verificación:** El buscador público nunca expone listas completas de alumnos ni datos sensibles como correos o números de documento.
- **Trazabilidad:** Cualquier cambio de estado (emisión, revocación) se refleja instantáneamente mediante consultas al servidor.
- **Protección de endpoints:** Las mutaciones y vistas del panel administrativo están protegidas por middleware de sesión y verificación de roles.

---

## 📄 Licencia

Desarrollado para **Breakpoint Creativa**. Todos los derechos reservados.
