import { fail, redirect } from '@sveltejs/kit';
import { setSessionCookie } from '$lib/server/auth';
import { usernameError } from '$lib/server/config';
import {
  BCRYPT_MAX_PASSWORD_BYTES,
  getUsableInvite,
  passwordExceedsBcryptLimit,
  signupWithInvite,
} from '$lib/server/users';

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export async function load({ url, locals }) {
  if (locals.user) redirect(303, '/admin');

  const token = url.searchParams.get('token') ?? '';
  const invite = token ? await getUsableInvite(token) : null;

  return { valid: Boolean(invite), token, identity: invite?.identity ?? null };
}

export const actions = {
  default: async ({ request, cookies, url }) => {
    const form = await request.formData();
    const token = String(form.get('token') ?? '');
    const username = text(form, 'username').toLowerCase();
    const password = String(form.get('password') ?? '');
    const displayName = text(form, 'display_name').slice(0, 80) || null;

    const errors: string[] = [];
    const invite = token ? await getUsableInvite(token) : null;
    if (!invite) errors.push('This invite link is invalid, expired, or already used.');
    const invalidUsername = usernameError(username);
    if (invalidUsername) errors.push(invalidUsername);
    if (password.length < 8) errors.push('Password must be at least 8 characters.');
    if (passwordExceedsBcryptLimit(password)) {
      errors.push(`Password must be at most ${BCRYPT_MAX_PASSWORD_BYTES} UTF-8 bytes.`);
    }

    if (errors.length) {
      return fail(400, { errors, username, displayName });
    }

    const result = await signupWithInvite({ token, username, password, displayName });
    if (!result.ok) {
      const message =
        result.reason === 'username-exists'
          ? 'That username is already taken.'
          : result.reason === 'identity-exists'
            ? 'An account already exists for this WhatsApp number.'
            : 'This invite link is invalid, expired, or already used.';
      return fail(400, { errors: [message], username, displayName });
    }

    setSessionCookie(cookies, result.user, url.protocol === 'https:');
    redirect(303, '/admin');
  }
};
