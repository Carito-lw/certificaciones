# Plataforma de credenciales · base del producto

Este directorio define el producto comercial independiente. La aplicación
actual de Breakpoint sirve como fuente de módulos reutilizables, pero su base
de datos, certificados, rutas públicas y despliegue no son el entorno de este
producto. `schema.sql` se aplica únicamente a una base nueva y vacía, después
del esquema de autenticación.

## Estado de la implementación

`npm run dev:product` inicia la aplicación en modo producto con una base local
temporal. `npm run build:product` compila este modo. En un despliegue nuevo,
configurar únicamente `SAAS_DATABASE_URL` con una base vacía y distinta de la
base de Breakpoint; el comando de build del sitio nuevo debe ser
`npm run build:product`. El proceso ejecuta el esquema de autenticación y el
esquema SaaS en orden. Nunca se copia información de los certificados reales.

El panel inicial está en `/producto`: login, instituciones del usuario,
estadísticas básicas, capacitaciones y alumnos por institución. Las consultas
requieren sesión y membresía en la institución. Propietarios y administradores
pueden crear capacitaciones y cargar alumnos; los emisores pueden cargar alumnos;
los lectores solo consultan. Cada alta valida la membresía y el rol en el
servidor y registra un evento de auditoría. El listado muestra los últimos 100
alumnos. Para dar de alta la primera institución
en una base nueva, `npm run institution:create -- --slug=... --institution=...
--prefix=... --email=... --name=...` utiliza la contraseña recibida mediante
`SAAS_BOOTSTRAP_PASSWORD`. No pasar la contraseña como argumento ni guardar
estas variables en el repositorio. Las credenciales existentes no se importan.

La importación masiva, la búsqueda y edición, la asociación de alumnos con
capacitaciones, la emisión, los PDF y las descargas siguen pendientes en el modo
producto. No hay registro público ni datos iniciales de ejemplo.

## Decisiones del MVP

- Cada institución tiene su marca, administradores, cursos, alumnos, plantillas,
  lotes y métricas. Un usuario puede pertenecer a más de una institución con
  roles diferentes.
- La URL de verificación usa `credentials.public_id`, un identificador aleatorio
  global, y muestra solo nombre, institución, curso, horas, período, código,
  fecha de emisión y estado. El DNI y el correo permanecen privados.
- `display_code` identifica la credencial para la institución; se asigna con
  `code_counters` dentro de una transacción. Una vista previa nunca reserva ni
  garantiza un código.
- `issued` y `revoked` son estados de la credencial. Las verificaciones se
  cuentan como eventos; no cambian su estado. `not_eligible` es el resultado
  de una inscripción y no genera credencial.
- Cada PDF conserva una copia inmutable de los datos emitidos en `snapshot` y
  la versión de la plantilla. Los cambios posteriores del curso o del alumno
  no reescriben una credencial ya emitida.
- El PDF y el ZIP se guardan en almacenamiento privado. El panel obtiene una
  descarga autorizada de corta duración; la página pública no expone archivos
  de otros alumnos.

## Lote de hasta 1.000 alumnos

1. El servidor recibe y valida las filas; comprueba duplicados dentro del
   archivo y contra `enrollments`. La vista previa muestra errores, sin emitir.
2. Al confirmar, crea el lote y sus filas en una transacción, verifica la
   membresía y congela la versión de la plantilla.
3. Un trabajador toma filas pendientes con bloqueo, asigna el número bajo
   transacción e inserta la credencial con una clave de idempotencia por fila.
4. Genera el PDF y guarda su ruta. Ante un error, registra la fila fallida;
   reintentar no crea otro código ni otra credencial.
5. El progreso y los errores se leen del servidor. Un proceso independiente
   arma el ZIP a partir de los PDF guardados.

## Autorización

La sesión identifica al usuario; el servidor comprueba `memberships` para la
institución solicitada en cada lectura, escritura y descarga. El ID de una
institución enviado por el navegador nunca concede acceso por sí solo. Los
trabajos reciben la institución desde el lote guardado, no desde un parámetro
libre. Los roles iniciales son `owner`, `admin`, `issuer` y `viewer`.

La base nueva no debe exponerse al navegador mediante una clave privilegiada.
Si se habilita la API de datos de Supabase, hay que añadir políticas RLS y
probar aislamiento entre instituciones antes de dar acceso a clientes.

## Reutilización del sistema existente

| Módulo actual | Tratamiento |
| --- | --- |
| Parser Excel/CSV y vista previa | Adaptar a cursos y alumnos por institución |
| QR | Conservar el motor; usar la nueva URL pública y marca configurable |
| Plantilla PDF | Conservar el render; pasar versión y assets de la institución |
| Panel | Reorganizar por institución y rol |
| Lotes y ZIP síncronos | Sustituir por trabajos persistentes y almacenamiento privado |
| Landing de Breakpoint, certificados de ejemplo y usuarios iniciales | No copiar al producto |

## Próximos hitos

1. Separar una aplicación comercial limpia del sitio institucional dentro de
   un repositorio propio y una base nueva.
2. Implementar registro de instituciones y alta administrativa controlada.
3. Conectar panel, cursos y alumnos al nuevo esquema con aislamiento probado.
4. Integrar importación, emisión y validación; medir un lote de 800 filas.
5. Incorporar PDF en segundo plano, ZIP, estadísticas y piloto con dos
   instituciones de prueba.

No desplegar este esquema junto con las migraciones legadas `migrations/`.
