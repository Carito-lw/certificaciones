-- Better Auth role is server-owned and never set by registration input.
alter table "user" add column if not exists "role" text not null default 'user';
