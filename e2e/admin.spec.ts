import { expect, test } from '@playwright/test';
import { adminCredentials, resetCatalog } from './db';

async function logIn(page: import('@playwright/test').Page) {
  const { identifier, password } = adminCredentials();

  await page.goto('/admin/login');
  await page.getByLabel('Email or username').fill(identifier);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.beforeEach(async () => {
  await resetCatalog();
});

test('admin can log in and see all items', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);

  await logIn(page);

  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Oak side table' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Desk lamp' })).toBeVisible();
  await expect(page.getByText('Unpublished')).toBeVisible();
});

test('admin can create a published item and it appears publicly', async ({ page }) => {
  await logIn(page);

  await page.getByRole('link', { name: 'New item' }).click();
  await page.getByLabel('Title').fill('Stack of moving boxes');
  await page.getByLabel('Description').fill('Clean cardboard boxes in several useful sizes.');
  await page.getByLabel('Free').check();
  await page.getByLabel('Status').selectOption('available');
  await page.getByLabel('Published').check();
  await page.getByLabel('Category').fill('Moving');
  await page.getByLabel('Pickup notes').fill('Pickup from the garage.');
  await page.getByRole('button', { name: 'Create item' }).click();

  await expect(page).toHaveURL(/\/admin\/items\/\d+$/);
  await expect(page.getByText('Stack of moving boxes')).toBeVisible();

  await page.goto('/');
  const card = page.getByRole('link', { name: /Stack of moving boxes/ });
  await expect(card).toBeVisible();
  await expect(card.getByText('Free')).toBeVisible();
});

test('admin can edit an item from the admin list', async ({ page }) => {
  await logIn(page);

  await page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Oak side table' }) })
    .getByRole('link', { name: 'Edit' })
    .click();

  await page.getByLabel('Title').fill('Oak side table, refinished');
  await page.getByLabel('Price').fill('30.00');
  await page.getByRole('button', { name: 'Save item' }).click();

  await expect(page.getByText('Item saved.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Oak side table, refinished/ })).toBeVisible();
  await expect(page.getByText('€30')).toBeVisible();
});

test('admin can claim an item from its quick actions', async ({ page }) => {
  await logIn(page);

  const row = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Oak side table' }) });
  const quickActions = row.getByRole('group', { name: 'Quick actions for Oak side table' });

  await expect(quickActions.getByText('Quick actions')).toBeVisible();
  await quickActions.getByRole('button', { name: 'Claim' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(row.getByText('Claimed')).toBeVisible();
  await expect(quickActions.getByRole('button', { name: 'Claim' })).toBeDisabled();

  await page.goto('/');
  await expect(page.getByRole('link', { name: /Oak side table/ })).toHaveCount(0);
});

test('admin can change status from the item details page', async ({ page }) => {
  const items = await resetCatalog();
  await logIn(page);

  await page.goto(`/items/${items.table}`);
  await page.getByRole('link', { name: 'Manage' }).click();
  await page.getByLabel('Status').selectOption('sold');
  await page.getByRole('button', { name: 'Save item' }).click();

  await expect(page.getByText('Item saved.')).toBeVisible();

  await page.goto(`/items/${items.table}`);
  await expect(page.getByText('Sold')).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('link', { name: /Oak side table/ })).toHaveCount(0);
});

test('admin can upload a PNG photo', async ({ page }) => {
  const items = await resetCatalog();
  await logIn(page);

  await page.goto(`/admin/items/${items.table}`);
  await page.locator('input[name="photos"]').setInputFiles({
    name: 'tiny.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64'
    )
  });
  await page.getByRole('button', { name: 'Upload' }).click();

  await expect(page.getByText('Photos uploaded.')).toBeVisible();
  const resized = page.locator('img[src$=".webp"]');
  await expect(resized).toBeVisible();

  const response = await page.request.get(await resized.getAttribute('src') ?? '');
  expect(response.headers()['content-type']).toContain('image/webp');
});

test('admin can delete an item', async ({ page }) => {
  await logIn(page);

  const row = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Desk lamp' }) });
  await row.getByRole('button', { name: 'Delete' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Desk lamp' })).toHaveCount(0);
});
