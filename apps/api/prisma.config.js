// Prisma 7 config — replaces the `url` field that used to live in schema.prisma's datasource block.
// Used by the prisma CLI (`migrate dev`, `migrate deploy`, `db push`, etc.).
// The runtime PrismaClient gets its connection via the adapter (see src/db.js).
//
// Loaded by the prisma CLI before reading the schema, so dotenv must run first
// to put DATABASE_URL on process.env when running locally. In production
// (Railway), env vars are injected directly and dotenv just no-ops on a missing file.

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
