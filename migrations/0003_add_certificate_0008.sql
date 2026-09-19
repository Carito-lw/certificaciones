-- Migración para incorporar el certificado de Alejandro Morales (BPC-PYVC-2026-0008)

insert into certificates (
  code,
  participant_name,
  course_name,
  hours,
  period,
  status,
  dni,
  issued_at,
  verification_count
)
values (
  'BPC-PYVC-2026-0008',
  'Alejandro Morales',
  'Python con Análisis de Datos y Vibe Coding',
  64,
  'Abril – Julio 2026',
  'issued',
  '29.996.320',
  '2026-09-18',
  0
)
on conflict (code) do update set
  participant_name = excluded.participant_name,
  course_name = excluded.course_name,
  hours = excluded.hours,
  period = excluded.period,
  dni = coalesce(certificates.dni, excluded.dni),
  issued_at = coalesce(certificates.issued_at, excluded.issued_at);
