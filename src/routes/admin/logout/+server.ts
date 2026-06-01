import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, requireAdmin } from '$lib/server/auth';

export async function POST({ cookies, locals }) {
  requireAdmin(locals);
  clearSessionCookie(cookies);
  redirect(303, '/admin/login');
}
