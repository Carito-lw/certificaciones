# Walkthrough: Generación Automática de Certificados PDF en Breakpoint Creativa

Se ha implementado de forma completa, programática y reproducible el sistema de **generación de certificados PDF en formato A4 horizontal (297 mm × 210 mm)** para Breakpoint Creativa, integrado tanto a nivel de motor de renderizado server-side como en el panel administrativo.

---

## 1. Plantilla Programática HTML/CSS (A4 Horizontal)

- **Ubicación**: [`src/lib/certificates/template.ts`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/src/lib/certificates/template.ts)
- **Fondo y gráfica**: Fondo cálido texturado extraído con fidelidad 1:1, motivo de doble barra `//` en el sector derecho con paisaje cálido integrado y logo oficial de Breakpoint Creativa en [`public/certificate-assets/certificate-template-bg.png`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/public/certificate-assets/certificate-template-bg.png).
- **Tipografía y estilo**:
  - Títulos y nombres en serif itálica editorial (`Playfair Display`, `Cinzel`, serif de alta legibilidad).
  - Títulos de acreditación y carga horaria en sans-serif contemporánea (`Space Grotesk`, `Inter`).
  - Metadatos, etiquetas y códigos en monoespaciado técnico (`JetBrains Mono`).
  - Paleta cromática oficial: Grafito/negro (`#181714`, `#23211d`), naranja Breakpoint (`#E65100`, `#F05A28`), marfil cálido (`#FBF9F4`).

---

## 2. Firmas Oficiales y Aprobadas

Se extrajeron con aislamiento cromático de alta resolución las firmas reales desde los certificados modelo:
1. **Carolina Riveros**: *Dirección General* ([`public/signatures/firma-carolina-riveros.png`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/public/signatures/firma-carolina-riveros.png))
2. **Gustavo Rojas**: *Coordinación Académica* ([`public/signatures/firma-gustavo-rojas.png`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/public/signatures/firma-gustavo-rojas.png))

Ambas firmas están alineadas con sus sellos, nombres y cargos correspondientes sobre sus respectivas líneas de firma en el tercio inferior del certificado.

---

## 3. Código QR Real y Trazable (100% Escaneable)

- **Vector SVG de alto contraste**: Generado en servidor e incrustado directamente en el HTML.
- **URL estricta de validación**:
  ```text
  https://breakpointcreativa.com/verificar/{certificateCode}
  ```
- **Trazabilidad estricta**: El SVG incluye el atributo `data-certificate-code="{code}"`.
- **Verificación automatizada con lector de código de barras / QR**:
  Se ejecutó un test automatizado con [`scripts/verify-qr-scans.mjs`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/scripts/verify-qr-scans.mjs) empleando `jsqr` sobre los PDFs renderizados:
  - `BPC-PYVC-2026-0001` (Ana María Medina) ➜ `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0001` (100% OK)
  - `BPC-PYVC-2026-0003` (Luz Céneri) ➜ `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0003` (100% OK)
  - `BPC-PYVC-2026-0008` (Alejandro Morales) ➜ `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0008` (100% OK)

---

## 4. Motor de Renderizado PDF y Archivos ZIP

- **Generador PDF Playwright**: [`src/lib/certificates/pdf-generator.server.ts`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/src/lib/certificates/pdf-generator.server.ts)
  - Dimensiones exactas A4 Horizontal: `landscape: true`, `format: "A4"`, `margin: 0`, `printBackground: true`.
  - Nomenclatura normalizada:
    `Certificado_BPC-PYVC-2026-0001_Ana_Maria_Medina.pdf`
- **Compresor ZIP sin dependencias externas**: [`src/lib/certificates/zip.ts`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/src/lib/certificates/zip.ts)
  - Implementación estándar RFC 1951 / PKZIP con `node:zlib` nativo para empaquetar lotes de certificados sin bloat ni dependencias frágiles.

---

## 5. Integración en el Panel de Administración

### 5.1 Vista Individual (`/admin/certificados/:codigo`)
- Ubicación: [`src/routes/admin.certificados.$codigo.tsx`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/src/routes/admin.certificados.$codigo.tsx)
- Botón principal de acción: `[ DESCARGAR CERTIFICADO PDF ]` en el encabezado y en la ficha de emisión oficial.
- Indicador reactivo de estado mientras se genera el PDF (`GENERANDO PDF...`).
- Descarga directa en el navegador mediante [`src/lib/certificates/client-download.ts`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/src/lib/certificates/client-download.ts).

### 5.2 Vista Masiva / Listado (`/admin/certificados`)
- Ubicación: [`src/routes/admin.certificados.index.tsx`](file:///c:/Users/PC/Desktop/BREAKPOINT-CERTIFICACIONES/src/routes/admin.certificados.index.tsx)
- Checkboxes de selección individual por fila y checkbox maestro en la cabecera (con soporte para estado indeterminado).
- Barra de acciones masivas interactiva:
  - Muestra la cantidad de certificados seleccionados.
  - Botón: `[ GENERAR CERTIFICADOS (X en ZIP) ]`.
- Botón rápido `[ PDF ]` en cada fila para descarga individual con un solo click.
- Botón en la cabecera para generar el lote completo con un click.

---

## 6. Verificación de Integridad y Build

1. **Chequeo de Tipos (`npm run typecheck`)**:
   - Compilación estricta `tsc --noEmit` completada sin errores (`exit code 0`).
2. **Build de Producción (`npm run build`)**:
   - Build de Vite + Nitro para Netlify completado exitosamente (`exit code 0`).
