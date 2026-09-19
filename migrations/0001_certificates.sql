create table if not exists certificates (
  code text primary key,
  participant_name text not null,
  course_name text not null,
  hours integer not null check (hours > 0),
  period text not null,
  status text not null default 'valid' check (status in ('valid', 'revoked')),
  issued_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certificates_status_idx on certificates (status);

insert into certificates (code, participant_name, course_name, hours, period, status)
values
  ('BPC-PYVC-2026-0001', 'Ana Maria Medina', 'Python con Análisis de Datos y Vibe Coding', 64, 'Abril – Julio 2026', 'valid'),
  ('BPC-PYVC-2026-0002', 'Mauricio Bottone', 'Python con Análisis de Datos y Vibe Coding', 64, 'Abril – Julio 2026', 'valid'),
  ('BPC-PYVC-2026-0003', 'Luz Ceneri', 'Python con Análisis de Datos y Vibe Coding', 64, 'Abril – Julio 2026', 'valid'),
  ('BPC-PYVC-2026-0004', 'Octavio Naim', 'Python con Análisis de Datos y Vibe Coding', 64, 'Abril – Julio 2026', 'valid'),
  ('BPC-PYVC-2026-0005', 'German Sosa', 'Python con Análisis de Datos y Vibe Coding', 64, 'Abril – Julio 2026', 'valid'),
  ('BPC-PYVC-2026-0006', 'Milagros Orihuela', 'Python con Análisis de Datos y Vibe Coding', 64, 'Abril – Julio 2026', 'valid'),
  ('BPC-PYVC-2026-0007', 'Ezequiel Aguero', 'Python con Análisis de Datos y Vibe Coding', 64, 'Abril – Julio 2026', 'valid')
on conflict (code) do nothing;
