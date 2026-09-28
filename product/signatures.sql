-- Signature images belong to an immutable template version, not to every issued credential.
-- They are read only by the authenticated PDF endpoint and never returned by public verification.
create table certificate_template_signatures (
  institution_id uuid not null,
  template_id uuid not null,
  slot smallint not null check (slot in (1, 2)),
  signer_name text not null check (length(trim(signer_name)) between 2 and 100),
  signer_role text not null check (length(trim(signer_role)) between 2 and 100),
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg')),
  image_data bytea not null check (octet_length(image_data) between 64 and 150000),
  primary key (institution_id, template_id, slot),
  foreign key (institution_id, template_id) references certificate_templates(institution_id, id)
);

alter table certificate_template_signatures enable row level security;
revoke all on table certificate_template_signatures from public, anon, authenticated;
