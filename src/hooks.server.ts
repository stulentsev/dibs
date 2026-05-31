import type { Handle } from '@sveltejs/kit';
import { getAdminIdentifier, verifySessionCookie } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('dibs_admin');
  const identifier = getAdminIdentifier();

  event.locals.admin =
    token && identifier && verifySessionCookie(token, identifier)
      ? { identifier }
      : null;

  return resolve(event);
};
