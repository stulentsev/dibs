import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { cookieName, readSessionToken } from '$lib/server/auth';
import { loadSessionUser } from '$lib/server/users';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(cookieName);
  const payload = token ? readSessionToken(token) : null;

  event.locals.user = payload ? await loadSessionUser(payload) : null;

  const path = event.url.pathname;
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
  const isLoginRoute = path === '/admin/login' || path.startsWith('/admin/login/');

  if (isAdminRoute && !isLoginRoute && !event.locals.user) {
    redirect(303, '/admin/login');
  }

  return resolve(event);
};
