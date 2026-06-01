import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const databaseUrl = process.env.E2E_DATABASE_URL ?? 'postgres://dibs:dibs@localhost:5432/dibs_e2e';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${port}`,
    url: `${baseURL}/admin/login`,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: databaseUrl,
      ADMIN_EMAIL: 'owner@example.com',
      ADMIN_PASSWORD_HASH: '$2b$10$LHZd5YjLu078d/JBmcNSeeye3.mDdazvPHi1WQGOSnc5IQJNN3phm',
      SESSION_SECRET: 'e2e-session-secret-at-least-32-characters',
      UPLOAD_DIR: './tmp/e2e-uploads',
      BODY_SIZE_LIMIT: '30M',
      PUBLIC_SITE_URL: baseURL,
      ORIGIN: baseURL,
      PUBLIC_CONTACT_LABEL: 'Message owner',
      PUBLIC_CONTACT_URL_TEMPLATE:
        'https://example.com/contact?title=%7Btitle%7D&url=%7Burl%7D'
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
