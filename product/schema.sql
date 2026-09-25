-- Initial schema for a NEW, empty product database. Do not apply to the
-- existing Breakpoint database. Run after the authentication tables exist.
-- The application must use a database role without unrestricted table access
-- for tenant-facing requests; all writes require server-side membership checks.

create table institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  code_prefix text not null check (code_prefix ~ '^[A-Z0-9]{2,12}$'),
  logo_path text,
  primary_color text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table memberships (
  institution_id uuid not null references institutions(id) on delete cascade,
  user_id text not null references "user"("id") on delete cascade,
  role text not null check (role in ('owner', 'admin', 'issuer', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (institution_id, user_id)
);
create index memberships_user_idx on memberships (user_id, institution_id);

create table courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id),
  name text not null,
  code text not null check (code ~ '^[A-Z0-9]{2,16}$'),
  hours integer not null check (hours > 0),
  period text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique (institution_id, id),
  unique (institution_id, code)
);

create table students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id),
  first_name text not null,
  last_name text not null,
  document_number text,
  email text,
  created_at timestamptz not null default now(),
  unique (institution_id, id)
);
create unique index students_document_idx on students (institution_id, document_number)
  where document_number is not null;

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id),
  course_id uuid not null,
  student_id uuid not null,
  outcome text not null default 'pending' check (outcome in ('pending', 'eligible', 'not_eligible')),
  created_at timestamptz not null default now(),
  unique (institution_id, id),
  unique (institution_id, course_id, student_id),
  foreign key (institution_id, course_id) references courses(institution_id, id),
  foreign key (institution_id, student_id) references students(institution_id, id)
);

create table certificate_templates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id),
  name text not null,
  version integer not null check (version > 0),
  configuration jsonb not null,
  asset_path text,
  created_at timestamptz not null default now(),
  unique (institution_id, id),
  unique (institution_id, name, version)
);

create table issuance_batches (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id),
  course_id uuid not null,
  template_id uuid not null,
  created_by text not null references "user"("id"),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'completed_with_errors', 'failed')),
  total integer not null check (total between 1 and 1000),
  processed integer not null default 0 check (processed >= 0),
  failed integer not null default 0 check (failed >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (institution_id, id),
  foreign key (institution_id, course_id) references courses(institution_id, id),
  foreign key (institution_id, template_id) references certificate_templates(institution_id, id),
  foreign key (institution_id, created_by) references memberships(institution_id, user_id)
);

create table issuance_items (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  batch_id uuid not null,
  enrollment_id uuid not null,
  row_number integer not null check (row_number > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  unique (institution_id, id),
  unique (institution_id, batch_id, row_number),
  unique (institution_id, batch_id, enrollment_id),
  foreign key (institution_id, batch_id) references issuance_batches(institution_id, id),
  foreign key (institution_id, enrollment_id) references enrollments(institution_id, id)
);
create index issuance_items_pending_idx on issuance_items (institution_id, batch_id, status);

create table code_counters (
  institution_id uuid not null references institutions(id),
  course_id uuid not null,
  year integer not null check (year between 2000 and 2200),
  next_number bigint not null default 1 check (next_number > 0),
  primary key (institution_id, course_id, year),
  foreign key (institution_id, course_id) references courses(institution_id, id)
);

create table credentials (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id),
  enrollment_id uuid not null,
  template_id uuid not null,
  issuance_item_id uuid unique,
  public_id uuid not null default gen_random_uuid() unique,
  display_code text not null unique,
  status text not null default 'issued' check (status in ('issued', 'revoked')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  pdf_path text,
  snapshot jsonb not null,
  unique (institution_id, id),
  foreign key (institution_id, enrollment_id) references enrollments(institution_id, id),
  foreign key (institution_id, template_id) references certificate_templates(institution_id, id),
  foreign key (institution_id, issuance_item_id) references issuance_items(institution_id, id),
  constraint revoked_metadata check (
    (status = 'issued' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);
create index credentials_institution_issued_idx on credentials (institution_id, issued_at desc);

create table verification_events (
  id bigint generated always as identity primary key,
  institution_id uuid not null,
  credential_id uuid not null,
  verified_at timestamptz not null default now(),
  foreign key (institution_id, credential_id) references credentials(institution_id, id)
);
create index verification_events_credential_idx on verification_events (institution_id, credential_id, verified_at desc);

create table audit_events (
  id bigint generated always as identity primary key,
  institution_id uuid not null references institutions(id),
  actor_user_id text references "user"("id"),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);
create index audit_events_institution_idx on audit_events (institution_id, occurred_at desc);
