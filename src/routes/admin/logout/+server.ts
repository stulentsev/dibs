import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/auth';

export async function POST({ cookies }) {
  clearSessionCookie(cookies);
  redirect(303, '/admin/login');
}
