import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { getSqlClient } from '../src/lib/server/db/client';
import { ensureOwner } from '../src/lib/server/users';
import { adminCredentials, adminPasswordHash, e2eDatabaseUrl } from './db';

const sql = postgres(e2eDatabaseUrl, { max: 1, prepare: false });

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

test('bootstrap normalizes a mixed-case, whitespace-padded ADMIN_EMAIL', async ({ page }) => {
  await sql`delete from users where role = 'owner'`;

  delete process.env.ADMIN_USERNAME;
  process.env.ADMIN_EMAIL = '  Owner@Example.com ';
  await ensureOwner();

  expect(await ownerEmails()).toEqual(['owner@example.com']);

  await logInWithIdentifier(page, ' Owner@Example.com ');
});

test('bootstrap normalizes a mixed-case, whitespace-padded ADMIN_USERNAME', async ({ page }) => {
  await sql`delete from users where email = 'admin'`;

  delete process.env.ADMIN_EMAIL;
  process.env.ADMIN_USERNAME = ' Admin ';
  await ensureOwner();

  expect(await ownerEmails()).toContain('admin');

  await logInWithIdentifier(page, ' ADMIN ');

  await sql`delete from users where email = 'admin'`;
});
