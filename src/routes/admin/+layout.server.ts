import { redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';

export async function load({ locals, url }) {
  if (url.pathname === '/admin/login') {
    if (locals.admin) redirect(303, '/admin');
    return { admin: locals.admin };
  }

  return { admin: requireAdmin(locals) };
}
