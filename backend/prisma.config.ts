import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

// Prisma v7 no longer auto-loads `.env` when a config file is present, so the
// CLI (generate/migrate) would not see DATABASE_URL. Load it explicitly using
// Node's built-in env-file loader; guard for fresh checkouts without a `.env`.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
