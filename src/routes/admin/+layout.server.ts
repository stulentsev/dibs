import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';

export async function load({ locals, url }) {
  if (url.pathname === '/admin/login') {
    if (locals.user) redirect(303, '/admin');
    return { user: locals.user };
  }

  return { user: requireUser(locals) };
}
