import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, requireUser } from '$lib/server/auth';

export async function POST({ cookies, locals }) {
  requireUser(locals);
  clearSessionCookie(cookies);
  redirect(303, '/admin/login');
}
