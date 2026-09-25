#!/usr/bin/env node
// One-time controlled onboarding. Never pass passwords on the command line.
import { randomUUID } from "node:crypto";
import pg from "pg";
import { hashPassword } from "@better-auth/utils/password";

const options = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const match = /^--([a-z-]+)=(.*)$/.exec(arg);
  if (!match) throw new Error(`Argumento inválido: ${arg}`);
  return [match[1], match[2]];
}));
const { slug, institution, prefix, email, name } = options;
const password = process.env.SAAS_BOOTSTRAP_PASSWORD;
const databaseUrl = process.env.SAAS_DATABASE_URL;
if (!databaseUrl || !password || password.length < 12 || !slug || !institution || !prefix || !email || !name) {
  throw new Error("Se requieren SAAS_DATABASE_URL, SAAS_BOOTSTRAP_PASSWORD (12+ caracteres) y --slug, --institution, --prefix, --email, --name.");
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !/^[A-Z0-9]{2,12}$/.test(prefix) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error("Slug, prefijo o correo inválidos.");
}
const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  const passwordHash = await hashPassword(password);
  await client.query("begin");
  const userId = randomUUID();
  const accountId = randomUUID();
  try {
    await client.query(`insert into "user" ("id", "name", "email", "emailVerified", "role", "createdAt", "updatedAt")
      values ($1, $2, $3, true, 'user', now(), now())`, [userId, name.trim(), email.trim().toLowerCase()]);
    await client.query(`insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
      values ($1, $2, 'credential', $3, $4, now(), now())`, [accountId, email.trim().toLowerCase(), userId, passwordHash]);
    const { rows } = await client.query(`insert into institutions (slug, name, code_prefix)
      values ($1, $2, $3) returning id`, [slug, institution.trim(), prefix]);
    await client.query(`insert into memberships (institution_id, user_id, role)
      values ($1, $2, 'owner')`, [rows[0].id, userId]);
    await client.query(`insert into certificate_templates (institution_id, name, version, configuration)
      values ($1, 'Institucional', 1, '{}'::jsonb)`, [rows[0].id]);
    await client.query("commit");
    process.stdout.write(`Institución creada: ${slug}\n`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
} finally {
  client.release();
  await pool.end();
}
