-- Migración para completar los DNIs, fechas y datos de emisión de los 8 certificados aprobados

update certificates set
  dni = case code
    when 'BPC-PYVC-2026-0001' then '32.855.417'
    when 'BPC-PYVC-2026-0002' then '21.809.918'
    when 'BPC-PYVC-2026-0003' then '42.009.891'
    when 'BPC-PYVC-2026-0004' then '49.082.369'
    when 'BPC-PYVC-2026-0005' then '48.724.809'
    when 'BPC-PYVC-2026-0006' then '43.354.169'
    when 'BPC-PYVC-2026-0007' then '28.917.414'
    when 'BPC-PYVC-2026-0008' then '29.996.320'
    else dni
  end,
  period = case
    when code in ('BPC-PYVC-2026-0001','BPC-PYVC-2026-0002','BPC-PYVC-2026-0003','BPC-PYVC-2026-0004','BPC-PYVC-2026-0005','BPC-PYVC-2026-0006','BPC-PYVC-2026-0007','BPC-PYVC-2026-0008')
      then 'abril – julio 2026'
    else period
  end,
  issued_at = case
    when code in ('BPC-PYVC-2026-0001','BPC-PYVC-2026-0002','BPC-PYVC-2026-0003','BPC-PYVC-2026-0004','BPC-PYVC-2026-0005','BPC-PYVC-2026-0006','BPC-PYVC-2026-0007','BPC-PYVC-2026-0008')
      then '2026-09-18'
    else issued_at
  end
where code in (
  'BPC-PYVC-2026-0001',
  'BPC-PYVC-2026-0002',
  'BPC-PYVC-2026-0003',
  'BPC-PYVC-2026-0004',
  'BPC-PYVC-2026-0005',
  'BPC-PYVC-2026-0006',
  'BPC-PYVC-2026-0007',
  'BPC-PYVC-2026-0008'
);
