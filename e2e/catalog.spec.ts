import { expect, test } from '@playwright/test';
import { resetCatalog } from './db';

test.beforeEach(async () => {
  await resetCatalog();
});

test('visitors can see available and claimed items in the public catalog', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Available items' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Oak side table/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Box of plant pots/ })).toBeVisible();
  await expect(page.getByText('Small solid wood side table with a few surface marks.')).toBeVisible();
  await expect(page.getByText('Mixed ceramic and plastic pots from a spring clean.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Oak side table/ }).getByText('Furniture')).toBeVisible();
  await expect(page.getByRole('link', { name: /Box of plant pots/ }).getByText('Garden')).toBeVisible();

  await expect(page.getByText('Desk lamp')).toHaveCount(0);
  const claimedCard = page.getByRole('link', { name: /Reading chair/ });
  await expect(claimedCard).toBeVisible();
  await expect(claimedCard.getByText('Temporarily reserved', { exact: false })).toBeVisible();
});

test('visitors can open an item and see its details', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Oak side table/ }).click();

  await expect(page).toHaveURL(/\/items\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Oak side table' })).toBeVisible();
  await expect(page.getByText('€25')).toBeVisible();
  await expect(page.getByText('Small solid wood side table with a few surface marks.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pickup' })).toBeVisible();
  await expect(page.getByText('Porch pickup after 6pm.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Message seller on WhatsApp' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/15551234567\?text=/
  );
  await expect(page.getByRole('link', { name: 'Manage' })).toHaveCount(0);
});

test('published non-draft item details are reachable even when not available', async ({ page }) => {
  const items = await resetCatalog();

  await page.goto(`/items/${items.claimedChair}`);

  await expect(page.getByRole('heading', { name: 'Reading chair' })).toBeVisible();
  await expect(page.getByText('Temporarily reserved', { exact: false })).toBeVisible();
  await expect(page.getByText('Claimed')).toHaveCount(0);
});
