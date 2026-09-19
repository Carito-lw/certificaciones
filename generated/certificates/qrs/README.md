# Códigos QR — Certificados Breakpoint Creativa

Directorio de exportación de códigos QR para certificados de formación.

## URLs codificadas
- `BPC-PYVC-2026-0001`: `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0001`
- `BPC-PYVC-2026-0002`: `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0002`
- `BPC-PYVC-2026-0003`: `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0003`
- `BPC-PYVC-2026-0004`: `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0004`
- `BPC-PYVC-2026-0005`: `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0005`
- `BPC-PYVC-2026-0006`: `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0006`
- `BPC-PYVC-2026-0007`: `https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0007`

## Formatos disponibles
- **SVG**: Gráfico vectorial escalable, ideal para incrustar en PDFs sin pérdida de nitidez a cualquier resolución de impresión (300+ DPI).
- **PNG**: Imagen de mapa de bits de alta resolución (1024x1024 px), alto contraste (`#161310` sobre fondo `#ffffff`), lista para maquetación e impresión.

## Regeneración
Para regenerar o generar nuevas tandas de códigos:
```bash
npm run certificates:qr
```
O especificando códigos particulares:
```bash
node scripts/generate-certificate-qrs.mjs BPC-PYVC-2026-0001 BPC-PYVC-2026-0002
```
