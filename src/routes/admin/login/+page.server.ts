import { fail, redirect } from '@sveltejs/kit';
import { getAdminIdentifier, setSessionCookie, verifyPassword } from '$lib/server/auth';
import { requireRuntimeEnv } from '$lib/server/config';

export const actions = {
  default: async ({ request, cookies, url }) => {
    requireRuntimeEnv();
    const form = await request.formData();
    const identifier = String(form.get('identifier') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const adminIdentifier = getAdminIdentifier();

    if (!adminIdentifier || identifier !== adminIdentifier || !(await verifyPassword(password))) {
      return fail(400, { error: 'Invalid admin credentials.' });
    }

    setSessionCookie(cookies, adminIdentifier, url.protocol === 'https:');
    redirect(303, '/admin');
  }
};
