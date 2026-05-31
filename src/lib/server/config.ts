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

export function getAdminIdentifier(): string | null {
  return optionalEnv('ADMIN_EMAIL') ?? optionalEnv('ADMIN_USERNAME') ?? null;
}
