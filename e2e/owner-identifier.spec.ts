import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import postgres from 'postgres';
import { getSqlClient } from '../src/lib/server/db/client';
import {
  claimOwnerWithBootstrapCredentials,
  createInvite,
  ensureOwner
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
  for (const key of ['ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'DATABASE_URL'] as const) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  await getSqlClient().end();
  await sql.end();
});

async function ownerUsernames(): Promise<string[]> {
  return (await sql<{ username: string }[]>`select username from users where role = 'owner'`).map(
    (row) => row.username,
  );
}

async function logInWithIdentifier(page: import('@playwright/test').Page, identifier: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Username').fill(identifier);
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

  const [sentinel] = await sql<{ id: number; identity: string }[]>`
    select id, identity from users where bootstrap_pending = true
  `;
  expect(sentinel).toMatchObject({ identity: 'owner' });

  await logInWithIdentifier(page, adminCredentials().identifier);

  const owners = await sql<{ id: number; username: string; passwordHash: string; bootstrapPending: boolean }[]>`
    select id, username, password_hash as "passwordHash", bootstrap_pending as "bootstrapPending"
    from users where role = 'owner'
  `;
  expect(owners).toEqual([
    {
      id: sentinel!.id,
      username: adminCredentials().identifier,
      passwordHash: adminPasswordHash,
      bootstrapPending: false,
    },
  ]);
});

test('failed bootstrap credentials do not claim the owner', async () => {
  await resetAndMigrate();
  process.env.ADMIN_USERNAME = 'wrong-owner';
  process.env.ADMIN_PASSWORD_HASH = adminPasswordHash;

  expect(
    await claimOwnerWithBootstrapCredentials(
      adminCredentials().identifier,
      adminCredentials().password
    )
  ).toBeNull();
  expect(await ownerUsernames()).toEqual(['legacy-owner']);

  process.env.ADMIN_USERNAME = adminCredentials().identifier;
  const owner = await claimOwnerWithBootstrapCredentials(
    adminCredentials().identifier,
    adminCredentials().password
  );

  expect(owner?.username).toBe(adminCredentials().identifier);
  expect(await ownerUsernames()).toEqual([adminCredentials().identifier]);
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
    select id from users where bootstrap_pending = true
  `;
  expect(sentinel).toBeDefined();

  await logInWithIdentifier(page, adminCredentials().identifier);

  const [claimed] = await sql<{ id: number; passwordHash: string }[]>`
    select id, password_hash as "passwordHash"
    from users
    where username = ${adminCredentials().identifier}
  `;
  const [upgradedItem] = await sql<{ ownerId: number }[]>`
    select owner_id as "ownerId" from items where id = ${item!.id}
  `;

  expect(claimed).toEqual({ id: sentinel!.id, passwordHash: adminPasswordHash });
  expect(upgradedItem?.ownerId).toBe(sentinel!.id);
  await expect(page.getByRole('heading', { name: 'Legacy table' })).toBeVisible();
});

test('claimed owner remains authoritative when bootstrap credentials change', async () => {
  await resetAndMigrate();
  process.env.ADMIN_USERNAME = adminCredentials().identifier;
  process.env.ADMIN_PASSWORD_HASH = adminPasswordHash;
  await ensureOwner();

  const [claimedOwner] = await sql<{ id: number; username: string; passwordHash: string }[]>`
    select id, username, password_hash as "passwordHash" from users where role = 'owner'
  `;
  expect(claimedOwner).toBeDefined();

  process.env.ADMIN_USERNAME = 'replacement-owner';
  process.env.ADMIN_PASSWORD_HASH = 'replacement-password-hash';
  await ensureOwner();
  await ensureOwner();

  const owners = await sql<{ id: number; username: string; passwordHash: string }[]>`
    select id, username, password_hash as "passwordHash" from users where role = 'owner'
  `;
  expect(owners).toEqual([claimedOwner]);
});

test('account identity cannot be changed', async () => {
  await resetAndMigrate();

  await expect(
    sql`update users set identity = 'replacement-owner-identity' where role = 'owner'`,
  ).rejects.toThrow('user identity is immutable');
});

test('database rejects incomplete contact methods', async () => {
  await resetAndMigrate();

  await expect(
    sql`update users set contact_type = 'email', contact_value = null where role = 'owner'`,
  ).rejects.toThrow('users_contact_method_valid');
});

test('concurrent invite creation reserves an identity once', async () => {
  await resetAndMigrate();
  process.env.ADMIN_USERNAME = adminCredentials().identifier;
  process.env.ADMIN_PASSWORD_HASH = adminPasswordHash;
  await ensureOwner();
  const [owner] = await sql<{ id: number }[]>`select id from users where role = 'owner'`;
  expect(owner).toBeDefined();

  const results = await Promise.all([
    createInvite(owner!.id, 7, '+15551239999'),
    createInvite(owner!.id, 7, '+15551239999'),
  ]);

  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results.filter((result) => !result.ok)).toHaveLength(1);
});

test('an established owner named like the migration placeholder is not reclaimed', async () => {
  await resetAndMigrate();
  await sql`
    update users
    set username = 'legacy-owner',
        password_hash = ${adminPasswordHash},
        bootstrap_pending = false
    where role = 'owner'
  `;

  process.env.ADMIN_USERNAME = 'replacement-owner';
  process.env.ADMIN_PASSWORD_HASH = 'replacement-password-hash';
  await ensureOwner();

  const [owner] = await sql<{ username: string; passwordHash: string }[]>`
    select username, password_hash as "passwordHash" from users where role = 'owner'
  `;
  expect(owner).toEqual({
    username: 'legacy-owner',
    passwordHash: adminPasswordHash,
  });
});
