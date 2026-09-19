-- Migración para trazabilidad, historial de consultas y nuevos estados de certificados

-- 1. Actualizar el check constraint de status en certificates si es necesario
-- Postgres permite alterar columnas agregando nuevos campos y actualizando el constraint
alter table certificates drop constraint if exists certificates_status_check;

-- Migrar 'valid' existente a 'issued' o 'verified'
update certificates set status = 'issued' where status = 'valid';

alter table certificates add constraint certificates_status_check 
  check (status in ('issued', 'verified', 'revoked'));

-- 2. Agregar nuevas columnas a certificates para metadata administrativa y métricas agregadas
alter table certificates add column if not exists dni text;
alter table certificates add column if not exists first_verified_at timestamptz;
alter table certificates add column if not exists last_verified_at timestamptz;
alter table certificates add column if not exists verification_count integer not null default 0;
alter table certificates add column if not exists revoked_at timestamptz;
alter table certificates add column if not exists revoked_reason text;

-- 3. Tabla para el historial cronológico de todas las consultas individuales
create table if not exists certificate_verifications (
  id bigserial primary key,
  certificate_code text not null references certificates(code) on delete cascade,
  verified_at timestamptz not null default now()
);

-- Índices para búsquedas rápidas en panel de administración e historial
create index if not exists certificate_verifications_code_idx on certificate_verifications (certificate_code, verified_at desc);
create index if not exists certificates_created_idx on certificates (created_at desc);
