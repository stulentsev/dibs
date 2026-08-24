import { fail, redirect } from '@sveltejs/kit';
import { setSessionCookie } from '$lib/server/auth';
import { ensureOwner, verifyLogin } from '$lib/server/users';

export const actions = {
  default: async ({ request, cookies, url }) => {
    await ensureOwner();

    const form = await request.formData();
    const identifier = String(form.get('identifier') ?? '').trim();
    const password = String(form.get('password') ?? '');

    const user = await verifyLogin(identifier, password);
    if (!user) {
      return fail(400, { error: 'Invalid credentials.' });
    }

    setSessionCookie(cookies, user, url.protocol === 'https:');
    redirect(303, '/admin');
  }
};
