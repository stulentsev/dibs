import { fail, redirect } from '@sveltejs/kit';
import { setSessionCookie } from '$lib/server/auth';
import {
  BCRYPT_MAX_PASSWORD_BYTES,
  getUsableInvite,
  passwordExceedsBcryptLimit,
  signupWithInvite
} from '$lib/server/users';

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export async function load({ url, locals }) {
  if (locals.user) redirect(303, '/admin');

  const token = url.searchParams.get('token') ?? '';
  const invite = token ? await getUsableInvite(token) : null;

  return { valid: Boolean(invite), token };
}

export const actions = {
  default: async ({ request, cookies, url }) => {
    const form = await request.formData();
    const token = String(form.get('token') ?? '');
    const email = text(form, 'email');
    const password = String(form.get('password') ?? '');
    const displayName = text(form, 'display_name').slice(0, 80) || null;
    let contactUrl = text(form, 'contact_url').slice(0, 500) || null;

    const errors: string[] = [];
    const invite = token ? await getUsableInvite(token) : null;
    if (!invite) errors.push('This invite link is invalid, expired, or already used.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email is required.');
    if (password.length < 8) errors.push('Password must be at least 8 characters.');
    if (passwordExceedsBcryptLimit(password)) {
      errors.push(`Password must be at most ${BCRYPT_MAX_PASSWORD_BYTES} UTF-8 bytes.`);
    }
    if (contactUrl && !/^https?:\/\//i.test(contactUrl)) {
      errors.push('Contact link must start with http:// or https://.');
      contactUrl = null;
    }

    if (errors.length) {
      return fail(400, { errors, email, displayName });
    }

    const result = await signupWithInvite({ token, email, password, displayName, contactUrl });
    if (!result.ok) {
      const message =
        result.reason === 'email-exists'
          ? 'An account with this email already exists.'
          : 'This invite link is invalid, expired, or already used.';
      return fail(400, { errors: [message], email, displayName });
    }

    setSessionCookie(cookies, result.user, url.protocol === 'https:');
    redirect(303, '/admin');
  }
};
