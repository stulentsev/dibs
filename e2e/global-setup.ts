import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { e2eDatabaseUrl } from './db';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function databaseName(url: string): string {
  const parsed = new URL(url);
  const name = parsed.pathname.slice(1);
  if (!name) throw new Error('E2E database URL must include a database name.');
  return decodeURIComponent(name);
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function ensureDatabase() {
  const dbName = databaseName(e2eDatabaseUrl);
  const maintenanceUrl = new URL(e2eDatabaseUrl);
  maintenanceUrl.pathname = '/postgres';

  const sql = postgres(maintenanceUrl.toString(), { max: 1, prepare: false });
  try {
    const existing = await sql<{ exists: boolean }[]>`
      select exists(select 1 from pg_database where datname = ${dbName})
    `;
    if (!existing[0]?.exists) {
      await sql.unsafe(`create database ${quoteIdentifier(dbName)}`);
    }
  } finally {
    await sql.end();
  }
}

async function resetSchema() {
  const sql = postgres(e2eDatabaseUrl, { max: 1, prepare: false });
  try {
    await sql`set client_min_messages to warning`;
    await sql`drop schema if exists drizzle cascade`;
    await sql`drop schema if exists public cascade`;
    await sql`create schema public`;
  } finally {
    await sql.end();
  }
}

async function runMigrations() {
  const sql = postgres(e2eDatabaseUrl, { max: 1, prepare: false });
  const db = drizzle(sql);
  try {
    await migrate(db, { migrationsFolder: resolve(projectRoot, 'drizzle') });
  } finally {
    await sql.end();
  }
}

export default async function globalSetup() {
  await mkdir(resolve(projectRoot, 'tmp/e2e-uploads'), { recursive: true });
  await ensureDatabase();
  await resetSchema();
  await runMigrations();
}
