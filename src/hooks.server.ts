import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getAdminIdentifier, verifySessionCookie } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('dibs_admin');
  const identifier = getAdminIdentifier();

  event.locals.admin =
    token && identifier && verifySessionCookie(token, identifier)
      ? { identifier }
      : null;

  const path = event.url.pathname;
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
  const isLoginRoute = path === '/admin/login' || path.startsWith('/admin/login/');

  if (isAdminRoute && !isLoginRoute && !event.locals.admin) {
    redirect(303, '/admin/login');
  }

  return resolve(event);
};
