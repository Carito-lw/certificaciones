-- Migración para soporte de lotes de importación masiva y metadatos de cursos

create table if not exists certificate_batches (
  id text primary key,
  created_at timestamptz not null default now(),
  created_by text,
  course_name text not null,
  course_code text not null,
  total integer not null default 0,
  processed integer not null default 0,
  failed integer not null default 0,
  status text not null default 'completed' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_log text
);

alter table certificates add column if not exists batch_id text;
alter table certificates add column if not exists course_code text;
alter table certificates add column if not exists first_name text;
alter table certificates add column if not exists last_name text;

create index if not exists certificate_batches_created_idx on certificate_batches (created_at desc);
create index if not exists certificates_batch_id_idx on certificates (batch_id);
