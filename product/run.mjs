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
