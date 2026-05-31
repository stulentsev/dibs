import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
  if (url.pathname === '/admin/login') {
    if (locals.admin) redirect(303, '/admin');
    return { admin: locals.admin };
  }

  if (!locals.admin) redirect(303, '/admin/login');
  return { admin: locals.admin };
}
