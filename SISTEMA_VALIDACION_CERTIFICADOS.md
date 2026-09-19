# Sistema de validación de certificados — Breakpoint Creativa

## Qué se agregó

- Página pública de búsqueda: `/verificar`
- Página pública individual: `/verificar/:codigo`
- Consulta server-side del certificado (los datos no se cargan como listado en el navegador)
- Tabla PostgreSQL/Neon `certificates`
- 7 certificados iniciales del curso **Python con Análisis de Datos y Vibe Coding**
- Estados públicos contemplados: `valid`, `revoked` y código no encontrado

## Datos públicos

Solo se muestran:

- Nombre y apellido
- Capacitación
- Carga horaria
- Período
- Código del certificado
- Estado

No se publican DNI, correo, teléfono, porcentaje de asistencia ni datos administrativos.

## Primeros códigos cargados

- BPC-PYVC-2026-0001 — Ana Maria Medina
- BPC-PYVC-2026-0002 — Mauricio Bottone
- BPC-PYVC-2026-0003 — Luz Ceneri
- BPC-PYVC-2026-0004 — Octavio Naim
- BPC-PYVC-2026-0005 — German Sosa
- BPC-PYVC-2026-0006 — Milagros Orihuela
- BPC-PYVC-2026-0007 — Ezequiel Aguero

Alejandro Morales no se inserta en la tabla pública porque no certifica.

## Base de datos

El proyecto ya soporta `DATABASE_URL` y Neon/PostgreSQL. La migración nueva está en:

`migrations/0001_certificates.sql`

En un entorno de producción con `DATABASE_URL`, esa tabla debe existir antes de usar la página. El mecanismo de migraciones del proyecto es el encargado de aplicarla durante el flujo normal de build/deploy.

## Generación y URLs para QR

Cada QR codifica directamente su URL pública de validación centralizada:

`https://breakpointcreativa.com/verificar/<CODIGO>`

### Módulo reutilizable de QR
- Ubicación: `src/lib/certificates/qr.ts`
- Funciones principales:
  - `getCertificateValidationUrl(code, baseUrl?)`
  - `generateCertificateQr(code, options?)`
  - `generateCertificateQrSvg(code, options?)`
  - `generateCertificateQrPng(code, options?)`
  - `generateCertificateQrDataUrl(code, options?)`
  - `generateBatchCertificateQrs(codes, options?)`

### Script de generación masiva
Para generar o regenerar los archivos `.png` y `.svg` de los certificados:
```bash
npm run certificates:qr
```
Los archivos quedan almacenados en `generated/certificates/qrs/`.

## Cómo revocar un certificado

Actualizar `status` a `revoked` para el código correspondiente. El registro permanece trazable, pero la página deja de mostrarlo como válido.

Ejemplo SQL:

```sql
update certificates
set status = 'revoked', updated_at = now()
where code = 'BPC-PYVC-2026-0001';
```

## Próxima mejora recomendada

Crear un panel privado de administración para:

1. Alta de nuevos certificados.
2. Importación desde el Registro Maestro de Excel/CSV.
3. Revocación/reactivación.
4. Generación del enlace y QR.
5. Registro de fecha de emisión.
