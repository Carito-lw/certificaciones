#!/usr/bin/env node
/**
 * Script CLI seguro para crear o actualizar cuentas de administrador de Breakpoint Creativa.
 *
 * Utiliza Better Auth password hashing y persiste usuarios en la base de datos
 * (PostgreSQL cuando DATABASE_URL está configurado / PGLite en local).
 *
 * Uso:
 * npm run admin:create
 * o con argumentos:
 * node scripts/create-admin.mjs --email carolina@breakpointcreativa.com --name "Carolina Riveros" --password "secreto123"
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { hashPassword } from "@better-auth/utils/password";

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--email=")) {
      params.email = arg.split("=", 2)[1];
    } else if (arg === "--email" && args[i + 1]) {
      params.email = args[++i];
    } else if (arg.startsWith("--name=")) {
      params.name = arg.split("=", 2)[1];
    } else if (arg === "--name" && args[i + 1]) {
      params.name = args[++i];
    } else if (arg.startsWith("--password=")) {
      params.password = arg.split("=", 2)[1];
    } else if (arg === "--password" && args[i + 1]) {
      params.password = args[++i];
    } else if (arg.startsWith("--role=")) {
      params.role = arg.split("=", 2)[1];
    } else if (arg === "--role" && args[i + 1]) {
      params.role = args[++i];
    }
  }
  return params;
}

async function getDatabaseClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
    const client = await pool.connect();
    return {
      query: async (sql, params = []) => {
        const res = await client.query(sql, params);
        return res.rows;
      },
      close: async () => {
        client.release();
        await pool.end();
      },
    };
  }

  // Fallback PGLite local
  const { PGlite } = await import("@electric-sql/pglite");
  const pglite = new PGlite();
  return {
    query: async (sql, params = []) => {
      const res = await pglite.query(sql, params);
      return res.rows;
    },
    close: async () => {
      await pglite.close();
    },
  };
}

async function main() {
  console.log("=================================================");
  console.log(" Breakpoint Creativa — Creador de Administradores");
  console.log("=================================================\n");

  const parsed = parseArgs();
  let email = parsed.email;
  let name = parsed.name;
  let password = parsed.password;
  let role = parsed.role || "admin";

  if (!email || !name || !password) {
    const rl = createInterface({ input, output });

    if (!email) {
      email = await rl.question("Correo electrónico del administrador: ");
    }
    if (!name) {
      name = await rl.question("Nombre y Apellido: ");
    }
    if (!password) {
      password = await rl.question("Contraseña segura: ");
    }

    rl.close();
  }

  email = email.trim().toLowerCase();
  name = name.trim();
  password = password.trim();

  if (!email || !name || !password) {
    console.error("❌ Error: Correo, nombre y contraseña son obligatorios.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ Error: La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  console.log(`\nProcesando credenciales para: ${name} (${email})...`);

  const db = await getDatabaseClient();

  try {
    // 1. Asegurar existencia de tablas de auth
    await db.query(`
      create table if not exists "user" (
        "id" text not null primary key,
        "name" text not null,
        "email" text not null unique,
        "emailVerified" boolean not null default false,
        "image" text,
        "role" text not null default 'admin',
        "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
        "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
      )
    `);
    await db.query(`
      create table if not exists "account" (
        "id" text not null primary key,
        "accountId" text not null,
        "providerId" text not null,
        "userId" text not null references "user" ("id") on delete cascade,
        "accessToken" text,
        "refreshToken" text,
        "idToken" text,
        "accessTokenExpiresAt" timestamptz,
        "refreshTokenExpiresAt" timestamptz,
        "scope" text,
        "password" text,
        "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
        "updatedAt" timestamptz not null
      )
    `);

    // 2. Hashear la contraseña con el algoritmo de Better Auth (scrypt)
    const hashedPassword = await hashPassword(password);

    // 3. Verificar si el usuario ya existe
    const existingUsers = await db.query('select "id" from "user" where lower("email") = $1 limit 1', [email]);

    let userId;
    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;
      console.log(`ℹ️ El usuario ya existe (ID: ${userId}). Actualizando contraseña y datos...`);

      await db.query(
        'update "user" set "name" = $1, "role" = $2, "updatedAt" = now() where "id" = $3',
        [name, role, userId]
      );

      // Verificar si tiene cuenta 'credential'
      const existingAccounts = await db.query(
        'select "id" from "account" where "userId" = $1 and "providerId" = $2',
        [userId, "credential"]
      );

      if (existingAccounts && existingAccounts.length > 0) {
        await db.query(
          'update "account" set "password" = $1, "updatedAt" = now() where "userId" = $2 and "providerId" = $3',
          [hashedPassword, userId, "credential"]
        );
      } else {
        const accountId = randomBytes(16).toString("hex");
        await db.query(
          'insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt") values ($1, $2, $3, $4, $5, now(), now())',
          [accountId, email, "credential", userId, hashedPassword]
        );
      }
    } else {
      userId = randomBytes(16).toString("hex");
      const accountId = randomBytes(16).toString("hex");

      await db.query(
        'insert into "user" ("id", "name", "email", "emailVerified", "role", "createdAt", "updatedAt") values ($1, $2, $3, true, $4, now(), now())',
        [userId, name, email, role]
      );

      await db.query(
        'insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt") values ($1, $2, $3, $4, $5, now(), now())',
        [accountId, email, "credential", userId, hashedPassword]
      );
    }

    console.log("\n✅ ¡Administrador configurado con éxito!");
    console.log("-------------------------------------------------");
    console.log(` Nombre:  ${name}`);
    console.log(` Correo:  ${email}`);
    console.log(` Rol:     ${role}`);
    console.log("-------------------------------------------------");
    console.log("El usuario podrá iniciar sesión en: https://breakpointcreativa.com/admin/login\n");
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error("❌ Error inesperado:", err.message || err);
  process.exit(1);
});
