#!/usr/bin/env node
import { readFileSync } from "node:fs";
import pg from "pg";

const databaseUrl = process.env.SAAS_DATABASE_URL;
if (!databaseUrl) throw new Error("SAAS_DATABASE_URL es obligatoria para migrar el producto.");
if (process.env.DATABASE_URL && databaseUrl === process.env.DATABASE_URL && process.env.PRODUCT_MODE !== "saas") {
  throw new Error("SAAS_DATABASE_URL debe apuntar a una base distinta de DATABASE_URL.");
}
const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  const legacy = await client.query("select to_regclass('public.certificates') as table_name");
  if (legacy.rows[0]?.table_name) throw new Error("Se detectó la tabla legada certificates: no se aplicará el esquema SaaS sobre esa base.");
  await client.query(`create table if not exists _migrations (
    name text primary key, applied_at timestamptz not null default now()
  )`);
  for (const [name, path] of [
    ["saas_auth_v1", "migrations/auth/0001_auth.sql"],
    ["saas_auth_role_v1", "product/0002_auth_role.sql"],
    ["saas_schema_v1", "product/schema.sql"],
    ["saas_issuance_v1", "product/zz_issuance.sql"],
  ]) {
    const applied = await client.query("select 1 from _migrations where name = $1", [name]);
    if (applied.rowCount) continue;
    await client.query("begin");
    try {
      await client.query(readFileSync(path, "utf8"));
      await client.query("insert into _migrations (name) values ($1)", [name]);
      await client.query("commit");
      process.stdout.write(`[product] applied ${name}\n`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}
