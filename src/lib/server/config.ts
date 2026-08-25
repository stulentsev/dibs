const requiredKeys = [
  'DATABASE_URL',
  'ADMIN_PASSWORD_HASH',
  'SESSION_SECRET',
  'UPLOAD_DIR',
  'PUBLIC_SITE_URL',
  'PUBLIC_CONTACT_LABEL',
  'PUBLIC_CONTACT_URL_TEMPLATE',
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

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function usernameError(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < 3 || username.length > 64) {
    return 'Username must be between 3 and 64 characters.';
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(username)) {
    return 'Username may contain lowercase letters, numbers, dots, underscores, and hyphens.';
  }
  return null;
}

export function getAdminUsername(): string | null {
  const username = optionalEnv('ADMIN_USERNAME')?.trim();
  return username ? normalizeUsername(username) : null;
}
