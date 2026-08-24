const requiredKeys = [
  'DATABASE_URL',
  'ADMIN_PASSWORD_HASH',
  'SESSION_SECRET',
  'UPLOAD_DIR',
  'PUBLIC_SITE_URL',
  'PUBLIC_CONTACT_LABEL',
  'PUBLIC_CONTACT_URL_TEMPLATE'
] as const;

type RequiredKey = (typeof requiredKeys)[number];

export function env(name: RequiredKey): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function requireRuntimeEnv(): void {
  for (const key of requiredKeys) env(key);
  if (!getAdminIdentifier()) {
    throw new Error('Missing required environment variable: ADMIN_EMAIL or ADMIN_USERNAME');
  }
}

export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export function getAdminIdentifier(): string | null {
  const email = optionalEnv('ADMIN_EMAIL');
  if (email) return normalizeIdentifier(email);
  const username = optionalEnv('ADMIN_USERNAME');
  return username ? normalizeIdentifier(username) : null;
}
