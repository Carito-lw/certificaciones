-- This product uses private PostgreSQL connections and authorizes each request
-- in its own server functions. No browser or Supabase Data API role needs table
-- access. Keep this outside product/*.sql: local PGLite has no anon role.
do $$
declare app_table record;
begin
  for app_table in
    select schemaname, tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table %I.%I enable row level security', app_table.schemaname, app_table.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
