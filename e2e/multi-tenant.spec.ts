import { expect, test } from '@playwright/test';
import {
  adminCredentials,
  installInviteExpirationTrigger,
  removeInviteExpirationTrigger,
  resetCatalog,
  userExists
} from './db';

async function logInAsOwner(page: import('@playwright/test').Page) {
  const { identifier, password } = adminCredentials();

  await page.goto('/admin/login');
  await page.getByLabel('Email or username').fill(identifier);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function fillAfterHydration(
  page: import('@playwright/test').Page,
  locator: import('@playwright/test').Locator,
  value: string
) {
  await expect(async () => {
    await locator.fill(value);
    await page.waitForTimeout(150);
    expect(await locator.inputValue()).toBe(value);
  }).toPass();
}

async function createInviteLink(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/admin/invites');
  const links = page.locator('code.invite-link');
  const count = await links.count();
  await page.getByLabel('Expires after (days)').fill('7');
  await page.getByRole('button', { name: 'Create invite link' }).click();
  await expect(links).toHaveCount(count + 1);
  const link = links.first();
  await expect(link).toBeVisible();
  return (await link.textContent()) ?? '';
}

test('invite-only signup scopes tenants to their own items', async ({ browser }) => {
  const items = await resetCatalog();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await logInAsOwner(ownerPage);
  const inviteLink = await createInviteLink(ownerPage);
  expect(inviteLink).toContain('/signup?token=');

  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();

  // A used-up or bogus token must not allow signup
  await tenantPage.goto('/signup?token=not-a-real-token');
  await expect(tenantPage.getByText('Invalid, expired, or already used', { exact: false })).toBeVisible();

  await tenantPage.goto(inviteLink);
  await expect(tenantPage.getByRole('heading', { name: 'Create your seller account' })).toBeVisible();

  await tenantPage.getByLabel('Email').fill('tess@example.com');
  await tenantPage.getByLabel(/Display name/).fill('Neighbor Tess');
  await tenantPage.getByLabel(/Contact link/).fill('https://example.com/tess');
  await tenantPage.getByLabel(/^Password/).fill('supersafe123');
  await tenantPage.getByRole('button', { name: 'Create account' }).click();
  await expect(tenantPage).toHaveURL(/\/admin$/);

  // Tenant sees an empty catalog, not the owner's items
  await expect(tenantPage.getByRole('heading', { name: 'Items' })).toBeVisible();
  await expect(tenantPage.getByText('No items yet.')).toBeVisible();

  // Tenant cannot open the owner's item by id
  const response = await tenantPage.goto(`/admin/items/${items.table}`);
  expect(response?.status()).toBe(404);

  // Tenant creates a published item
  await tenantPage.goto('/admin/items/new');
  await tenantPage.getByLabel('Title').fill('Tenant bike');
  await tenantPage.getByLabel('Description').fill('A blue city bike.');
  await tenantPage.getByLabel('Status').selectOption('available');
  await tenantPage.getByLabel('Published').check();
  await tenantPage.getByRole('button', { name: 'Create item' }).click();
  await expect(tenantPage).toHaveURL(/\/admin\/items\/\d+$/);

  const crossTenantDelete = await tenantPage.request.post('/admin?/deleteItem', {
    form: { id: String(items.table) },
    headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
  });
  expect(await crossTenantDelete.json()).toMatchObject({ type: 'failure', status: 404 });

  // Public catalog is shared: both sellers appear, tenant detail shows seller name
  const publicPage = await tenantContext.newPage();
  await publicPage.goto('/');
  await expect(publicPage.getByRole('link', { name: /Oak side table/ })).toBeVisible();
  await expect(publicPage.getByRole('link', { name: /Tenant bike/ })).toBeVisible();

  await publicPage.getByRole('link', { name: /Oak side table/ }).click();
  await expect(publicPage.getByRole('link', { name: 'Manage' })).toHaveCount(0);

  await publicPage.goto('/');
  await publicPage.getByRole('link', { name: /Tenant bike/ }).click();
  await expect(publicPage.getByText('Offered by Neighbor Tess')).toBeVisible();
  const contact = publicPage.getByRole('link', { name: 'Message owner' });
  await expect(contact).toHaveAttribute('href', /^https:\/\/example\.com\/tess/);
  await expect(publicPage.getByRole('link', { name: 'Manage' })).toBeVisible();

  await ownerPage.goto(publicPage.url());
  await expect(ownerPage.getByRole('link', { name: 'Manage' })).toBeVisible();

  // Owner still sees everything, including the tenant's item
  await ownerPage.goto('/admin');
  await expect(ownerPage.getByRole('heading', { name: 'Tenant bike' })).toBeVisible();

  // Owner can disable the tenant; the tenant session is revoked immediately
  await ownerPage.goto('/admin/tenants');
  const row = ownerPage.locator('article').filter({ hasText: 'tess@example.com' });
  const tenantId = await row.locator('input[name="id"]').first().getAttribute('value');
  const malformedToggle = await ownerPage.request.post('/admin/tenants?/toggle', {
    form: { id: tenantId!, status: 'unexpected' },
    headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
  });
  expect(await malformedToggle.json()).toMatchObject({ type: 'failure', status: 400 });
  await expect(row.getByText('Active')).toBeVisible();

  await row.getByRole('button', { name: 'Disable' }).click();
  await expect(row.getByText('Disabled')).toBeVisible();

  await tenantPage.goto('/admin');
  await expect(tenantPage).toHaveURL(/\/admin\/login$/);

  // Resetting credentials must not undo an administrative disable.
  await row.getByRole('button', { name: 'Reset password' }).click();
  const temporaryPassword = await ownerPage.locator('.success-note code').textContent();
  expect(temporaryPassword).toBeTruthy();
  await expect(row.getByText('Disabled')).toBeVisible();
  await ownerPage.reload();
  await expect(ownerPage.locator('.success-note')).toHaveCount(0);

  await tenantPage.getByLabel('Email or username').fill('tess@example.com');
  await tenantPage.getByLabel('Password').fill(temporaryPassword!);
  await tenantPage.getByRole('button', { name: 'Log in' }).click();
  await expect(tenantPage.getByText('Invalid credentials.')).toBeVisible();

  // Only the explicit Enable action restores access with the new password.
  await row.getByRole('button', { name: 'Enable' }).click();
  await expect(row.getByText('Active')).toBeVisible();
  await tenantPage.getByLabel('Email or username').fill('tess@example.com');
  await tenantPage.getByLabel('Password').fill(temporaryPassword!);
  await tenantPage.getByRole('button', { name: 'Log in' }).click();
  await expect(tenantPage).toHaveURL(/\/admin$/);

  await ownerContext.close();
  await tenantContext.close();
});

test('an invite link cannot be used twice', async ({ browser }) => {
  await resetCatalog();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await logInAsOwner(ownerPage);
  const inviteLink = await createInviteLink(ownerPage);
  await ownerContext.close();

  const first = await browser.newContext();
  const firstPage = await first.newPage();
  await firstPage.goto(inviteLink);
  await firstPage.getByLabel('Email').fill('first@example.com');
  await firstPage.getByLabel(/^Password/).fill('supersafe123');
  await firstPage.getByRole('button', { name: 'Create account' }).click();
  await expect(firstPage).toHaveURL(/\/admin$/);
  await first.close();

  const second = await browser.newContext();
  const secondPage = await second.newPage();
  await secondPage.goto(inviteLink);
  await expect(secondPage.getByText('Invalid, expired, or already used', { exact: false })).toBeVisible();
  await second.close();
});

test('signup rejects passwords beyond bcrypt limit without consuming the invite', async ({ browser }) => {
  await resetCatalog();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await logInAsOwner(ownerPage);
  const inviteLink = await createInviteLink(ownerPage);
  await ownerContext.close();

  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();
  await tenantPage.goto(inviteLink);
  await tenantPage.getByLabel('Email').fill('long-password@example.com');
  await tenantPage.getByLabel(/^Password/).fill('a'.repeat(73));
  await tenantPage.getByRole('button', { name: 'Create account' }).click();
  await expect(tenantPage.getByText('Password must be at most 72 UTF-8 bytes.')).toBeVisible();

  await tenantPage.getByLabel(/^Password/).fill('supersafe123');
  await tenantPage.getByRole('button', { name: 'Create account' }).click();
  await expect(tenantPage).toHaveURL(/\/admin$/);
  await tenantContext.close();
});

test('signup distinguishes an existing email and leaves the invite usable', async ({ browser }) => {
  await resetCatalog();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await logInAsOwner(ownerPage);
  const firstInviteLink = await createInviteLink(ownerPage);
  const secondInviteLink = await createInviteLink(ownerPage);
  await ownerContext.close();

  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  await firstPage.goto(firstInviteLink);
  await firstPage.getByLabel('Email').fill('duplicate@example.com');
  await firstPage.getByLabel(/^Password/).fill('supersafe123');
  await firstPage.getByRole('button', { name: 'Create account' }).click();
  await expect(firstPage).toHaveURL(/\/admin$/);
  await firstContext.close();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto(secondInviteLink);
  await secondPage.getByLabel('Email').fill('duplicate@example.com');
  await secondPage.getByLabel(/^Password/).fill('supersafe123');
  await secondPage.getByRole('button', { name: 'Create account' }).click();
  await expect(secondPage.getByText('An account with this email already exists.')).toBeVisible();

  await secondPage.goto(secondInviteLink);
  await fillAfterHydration(secondPage, secondPage.getByLabel('Email'), 'replacement@example.com');
  await secondPage.getByLabel(/^Password/).fill('supersafe123');
  await secondPage.getByRole('button', { name: 'Create account' }).click();
  await expect(secondPage).toHaveURL(/\/admin$/);
  await secondContext.close();
});

test('signup rolls back when the invite expires before atomic consumption', async ({ browser }) => {
  await resetCatalog();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await logInAsOwner(ownerPage);
  const inviteLink = await createInviteLink(ownerPage);
  await ownerContext.close();

  const tenantEmail = 'expired-during-signup@example.com';
  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();

  await tenantPage.goto(inviteLink);
  await expect(tenantPage.getByRole('heading', { name: 'Create your seller account' })).toBeVisible();

  await installInviteExpirationTrigger();
  try {
    await tenantPage.getByLabel('Email').fill(tenantEmail);
    await tenantPage.getByLabel(/^Password/).fill('supersafe123');
    await tenantPage.getByRole('button', { name: 'Create account' }).click();

    await expect(tenantPage.getByText('This invite link is invalid, expired, or already used.')).toBeVisible();
    expect(await userExists(tenantEmail)).toBe(false);
  } finally {
    await removeInviteExpirationTrigger();
    await tenantContext.close();
  }
});
