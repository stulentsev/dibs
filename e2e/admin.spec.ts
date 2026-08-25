import { expect, test } from '@playwright/test';
import { adminCredentials, resetCatalog } from './db';

async function logIn(page: import('@playwright/test').Page) {
  const { identifier, password } = adminCredentials();

  await page.goto('/admin/login');
  await page.getByLabel('Username').fill(identifier);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

// Svelte hydration can reset bound inputs after a fill lands (it syncs DOM from
// server state), silently submitting stale values. Keep re-filling until the
// value survives a settle window; hydration only runs once, so stability is final.
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

  await fillAfterHydration(page, page.getByLabel('Title'), 'Oak side table, refinished');
  await fillAfterHydration(page, page.getByLabel('Price'), '30.00');
  await page.getByRole('button', { name: 'Save item' }).click();

  await expect(page.getByText('Item saved.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Oak side table, refinished/ })).toBeVisible();
  await expect(page.getByText('€30')).toBeVisible();
});

test('admin can claim an item from its quick actions', async ({ page }) => {
  await logIn(page);

  const itemHeadings = page.locator('article').getByRole('heading');
  await expect(itemHeadings).toHaveText([
    'Reading chair',
    'Desk lamp',
    'Box of plant pots',
    'Oak side table'
  ]);

  const row = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Oak side table' }) });
  const quickActions = row.getByRole('group', { name: 'Quick actions for Oak side table' });

  await expect(quickActions.getByText('Quick actions')).toBeVisible();
  await quickActions.getByRole('button', { name: 'Claim' }).click();

  await expect(page).toHaveURL(/\/admin(\?\/claimItem)?$/);
  await expect(row.getByText('Claimed')).toBeVisible();
  await expect(quickActions.getByRole('button', { name: 'Claim', exact: true })).toHaveCount(0);
  await expect(quickActions.getByRole('button', { name: 'Unclaim' })).toBeVisible();
  await expect(quickActions.getByRole('button', { name: 'Gone' })).toBeVisible();
  await expect(itemHeadings).toHaveText([
    'Reading chair',
    'Desk lamp',
    'Box of plant pots',
    'Oak side table'
  ]);

  await page.goto('/');
  const publicCard = page.getByRole('link', { name: /Oak side table/ });
  await expect(publicCard).toBeVisible();
  await expect(publicCard.getByText('Temporarily reserved', { exact: false })).toBeVisible();
});

test('admin can unclaim or mark a claimed item as gone from quick actions', async ({ page }) => {
  await logIn(page);

  const row = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Reading chair' }) });
  const quickActions = row.getByRole('group', { name: 'Quick actions for Reading chair' });

  await quickActions.getByRole('button', { name: 'Unclaim' }).click();
  await expect(row.getByText('Available')).toBeVisible();
  await expect(quickActions.getByRole('button', { name: 'Claim' })).toBeVisible();

  await quickActions.getByRole('button', { name: 'Claim' }).click();
  await quickActions.getByRole('button', { name: 'Gone' }).click();
  await expect(row.getByText('Gone')).toBeVisible();
  await expect(quickActions.getByRole('button', { name: 'Claim' })).toBeVisible();
});

test('admin can change status from the item details page', async ({ page }) => {
  const items = await resetCatalog();
  await logIn(page);

  await page.goto(`/items/${items.table}`);
  await page.getByRole('link', { name: 'Manage' }).click();
  await page.getByLabel('Status').selectOption('gone');
  await page.getByRole('button', { name: 'Save item' }).click();

  await expect(page.getByText('Item saved.')).toBeVisible();

  await page.goto(`/items/${items.table}`);
  await expect(page.getByRole('heading', { name: 'Oak side table' })).toBeVisible();
  await expect(page.getByText('Gone')).toHaveCount(0);

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
  page.once('dialog', (dialog) => {
    expect(dialog.message()).toContain('Are you sure you want to delete Desk lamp?');
    void dialog.accept();
  });
  await row.getByRole('button', { name: 'Delete' }).click();

  await expect(page).toHaveURL(/\/admin(\?\/deleteItem)?$/);
  await expect(page.getByRole('heading', { name: 'Desk lamp' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Recently deleted' }).click();
  await expect(page).toHaveURL(/recently_deleted=1/);
  await expect(page.getByRole('heading', { name: 'Desk lamp' })).toBeVisible();
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByRole('heading', { name: 'Desk lamp' })).toHaveCount(0);

  await page.getByRole('link', { name: 'All items' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Desk lamp' })).toBeVisible();
});

test('quick actions preserve scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  await logIn(page);

  // Wait out hydration: an unenhanced native submit would do a full navigation
  // and defeat what this test checks
  await page.waitForLoadState('networkidle');

  const row = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Reading chair' }) });
  await row.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(100);

  // dispatchEvent avoids Playwright's own auto-scroll-before-click, so any
  // scroll change after the action comes from the app itself
  await row.getByRole('button', { name: 'Unclaim' }).dispatchEvent('click');
  await expect(row.getByRole('button', { name: 'Claim' })).toBeVisible();

  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(scrollAfter).toBe(scrollBefore);
});
