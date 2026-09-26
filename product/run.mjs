#!/usr/bin/env node
// Product commands use only SAAS_DATABASE_URL. The legacy DATABASE_URL is never
// forwarded to the product process, preventing a build from migrating it.
import { spawnSync } from "node:child_process";

const mode = process.argv[2];
if (!['dev', 'build'].includes(mode)) {
  process.stderr.write('Use: node product/run.mjs dev|build\n');
  process.exit(1);
}
if (process.env.SAAS_DATABASE_URL && process.env.SAAS_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('SAAS_DATABASE_URL debe apuntar a una base distinta de DATABASE_URL.');
}
if (mode === 'build' && process.env.NETLIFY) {
  for (const name of ['SAAS_DATABASE_URL', 'SAAS_PUBLIC_BASE_URL', 'BETTER_AUTH_URL', 'BETTER_AUTH_SECRET']) {
    if (!process.env[name]?.trim()) throw new Error(`${name} es obligatoria para publicar el producto.`);
  }
  if (process.env.PRODUCT_MODE !== 'saas') {
    throw new Error('PRODUCT_MODE=saas debe configurarse en el sitio nuevo para las funciones del producto.');
  }
  if (process.env.SAAS_PUBLIC_BASE_URL !== process.env.BETTER_AUTH_URL || !process.env.SAAS_PUBLIC_BASE_URL.startsWith('https://')) {
    throw new Error('SAAS_PUBLIC_BASE_URL y BETTER_AUTH_URL deben ser la misma URL HTTPS de la demo.');
  }
  if (process.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET debe tener al menos 32 caracteres.');
  }
}
const env = {
  ...process.env,
  PRODUCT_MODE: 'saas',
  VITE_PRODUCT_MODE: 'saas',
  VITE_AUTH_ENABLED: 'true',
  DATABASE_URL: process.env.SAAS_DATABASE_URL ?? '',
};
const args = mode === 'dev'
  ? ['scripts/with-app-env.mjs', 'vite', 'dev', '--host', '0.0.0.0', '--port', '8080']
  : ['scripts/with-app-env.mjs', 'vite', 'build'];
const build = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);
if (mode === 'build' && env.DATABASE_URL) {
  const migrate = spawnSync(process.execPath, ['product/migrate.mjs'], { env, stdio: 'inherit' });
  if (migrate.status !== 0) process.exit(migrate.status || 1);
}
