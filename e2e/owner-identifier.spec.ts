import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import postgres from 'postgres';
import { getSqlClient } from '../src/lib/server/db/client';
import {
  claimOwnerWithBootstrapCredentials,
  ensureOwner,
  LEGACY_OWNER_EMAIL
} from '../src/lib/server/users';
import { adminCredentials, adminPasswordHash, e2eDatabaseUrl } from './db';

const sql = postgres(e2eDatabaseUrl, { max: 1, prepare: false });
const migrations = readMigrationFiles({ migrationsFolder: resolve('drizzle') });

let savedEnv: Record<string, string | undefined>;

test.beforeAll(() => {
  savedEnv = { ...process.env };
  process.env.ADMIN_PASSWORD_HASH = adminPasswordHash;
  process.env.DATABASE_URL = e2eDatabaseUrl;
});

test.afterAll(async () => {
  for (const key of ['ADMIN_EMAIL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'DATABASE_URL'] as const) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  await getSqlClient().end();
  await sql.end();
});

async function ownerEmails(): Promise<string[]> {
  return (await sql<{ email: string }[]>`select email from users where role = 'owner'`).map((row) => row.email);
}

async function logInWithIdentifier(page: import('@playwright/test').Page, identifier: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Email or username').fill(identifier);
  await page.getByLabel('Password').fill(adminCredentials().password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function resetAndMigrate(count = migrations.length) {
  await sql`drop schema if exists drizzle cascade`;
  await sql`drop schema if exists public cascade`;
  await sql`create schema public`;

  for (const migration of migrations.slice(0, count)) {
    await sql.begin(async (transaction) => {
      for (const statement of migration.sql) await transaction.unsafe(statement);
    });
  }
}

test('first login claims the owner created by a clean migration chain', async ({ page }) => {
  await resetAndMigrate();

  const [sentinel] = await sql<{ id: number }[]>`
    select id from users where email = ${LEGACY_OWNER_EMAIL}
  `;
  expect(sentinel).toBeDefined();

  await logInWithIdentifier(page, adminCredentials().identifier);

  const owners = await sql<{ id: number; email: string; passwordHash: string }[]>`
    select id, email, password_hash as "passwordHash" from users where role = 'owner'
  `;
  expect(owners).toEqual([
    {
      id: sentinel!.id,
      email: adminCredentials().identifier,
      passwordHash: adminPasswordHash
    }
  ]);
});

test('failed bootstrap credentials do not claim the owner', async () => {
  await resetAndMigrate();
  delete process.env.ADMIN_USERNAME;
  process.env.ADMIN_EMAIL = 'wrong-owner@example.com';
  process.env.ADMIN_PASSWORD_HASH = adminPasswordHash;

  expect(
    await claimOwnerWithBootstrapCredentials(
      adminCredentials().identifier,
      adminCredentials().password
    )
  ).toBeNull();
  expect(await ownerEmails()).toEqual([LEGACY_OWNER_EMAIL]);

  process.env.ADMIN_EMAIL = adminCredentials().identifier;
  const owner = await claimOwnerWithBootstrapCredentials(
    adminCredentials().identifier,
    adminCredentials().password
  );

  expect(owner?.email).toBe(adminCredentials().identifier);
  expect(await ownerEmails()).toEqual([adminCredentials().identifier]);
});

test('first login preserves upgraded items on the claimed owner', async ({ page }) => {
  await resetAndMigrate(3);
  const [item] = await sql<{ id: number }[]>`
    insert into items (title, description)
    values ('Legacy table', 'Created before owner accounts existed.')
    returning id
  `;

  const ownerMigration = migrations[3];
  expect(ownerMigration).toBeDefined();
  await sql.begin(async (transaction) => {
    for (const statement of ownerMigration!.sql) await transaction.unsafe(statement);
  });

  const [sentinel] = await sql<{ id: number }[]>`
    select id from users where email = ${LEGACY_OWNER_EMAIL}
  `;
  expect(sentinel).toBeDefined();

  await logInWithIdentifier(page, adminCredentials().identifier);

  const [claimed] = await sql<{ id: number; passwordHash: string }[]>`
    select id, password_hash as "passwordHash"
    from users
    where email = ${adminCredentials().identifier}
  `;
  const [upgradedItem] = await sql<{ ownerId: number }[]>`
    select owner_id as "ownerId" from items where id = ${item!.id}
  `;

  expect(claimed).toEqual({ id: sentinel!.id, passwordHash: adminPasswordHash });
  expect(upgradedItem?.ownerId).toBe(sentinel!.id);
  await expect(page.getByRole('heading', { name: 'Legacy table' })).toBeVisible();
});

test('bootstrap normalizes a mixed-case, whitespace-padded ADMIN_EMAIL', async ({ page }) => {
  await resetAndMigrate();
  await sql`delete from users where role = 'owner'`;

  delete process.env.ADMIN_USERNAME;
  process.env.ADMIN_EMAIL = '  Owner@Example.com ';
  await ensureOwner();

  expect(await ownerEmails()).toEqual(['owner@example.com']);

  await logInWithIdentifier(page, ' Owner@Example.com ');
});

test('bootstrap normalizes a mixed-case, whitespace-padded ADMIN_USERNAME', async ({ page }) => {
  await resetAndMigrate();
  await sql`delete from users where role = 'owner'`;

  delete process.env.ADMIN_EMAIL;
  process.env.ADMIN_USERNAME = ' Admin ';
  await ensureOwner();

  expect(await ownerEmails()).toEqual(['admin']);

  await logInWithIdentifier(page, ' ADMIN ');
});

test('claimed owner remains authoritative when bootstrap credentials change', async () => {
  await resetAndMigrate();
  delete process.env.ADMIN_USERNAME;
  process.env.ADMIN_EMAIL = adminCredentials().identifier;
  process.env.ADMIN_PASSWORD_HASH = adminPasswordHash;
  await ensureOwner();

  const [claimedOwner] = await sql<{ id: number; email: string; passwordHash: string }[]>`
    select id, email, password_hash as "passwordHash" from users where role = 'owner'
  `;
  expect(claimedOwner).toBeDefined();

  process.env.ADMIN_EMAIL = 'replacement@example.com';
  process.env.ADMIN_PASSWORD_HASH = 'replacement-password-hash';
  await ensureOwner();
  await ensureOwner();

  const owners = await sql<{ id: number; email: string; passwordHash: string }[]>`
    select id, email, password_hash as "passwordHash" from users where role = 'owner'
  `;
  expect(owners).toEqual([claimedOwner]);
});
