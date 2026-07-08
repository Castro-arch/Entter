import { mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Where uploaded credential artwork / certificate templates land on disk, and
 * the base URL they're served back under (see `main.ts`'s `useStaticAssets`
 * and `uploads.controller.ts`). Read directly from `process.env` — like
 * `main.ts`'s own `PORT`/`FRONTEND_URL` reads — rather than via
 * `ConfigService`, since multer's options object is built once at module
 * load time, before Nest's DI container exists.
 */
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? join(process.cwd(), process.env.UPLOADS_DIR)
  : join(process.cwd(), 'uploads');

export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

// Created eagerly so `useStaticAssets` and the first upload both find a real
// directory, even on a fresh clone that never ran the app before.
mkdirSync(UPLOADS_ROOT, { recursive: true });
