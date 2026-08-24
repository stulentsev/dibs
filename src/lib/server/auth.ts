import { createHmac, timingSafeEqual } from 'node:crypto';
import { redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { env } from './config';

const cookieName = 'dibs_admin';
const oneWeekSeconds = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: number;
  ver: number;
  exp: number;
};

export type SessionUser = {
  id: number;
  email: string;
  role: 'owner' | 'tenant';
  displayName: string | null;
  contactUrl: string | null;
};

type SessionUserRecord = SessionUser & { tokenVersion: number };

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function sign(value: string): string {
  return createHmac('sha256', env('SESSION_SECRET')).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export { cookieName };

export function createSessionCookie(user: SessionUserRecord): string {
  const payload: SessionPayload = {
    sub: user.id,
    ver: user.tokenVersion,
    exp: Math.floor(Date.now() / 1000) + oneWeekSeconds
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function readSessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature || !safeEqual(signature, sign(encoded))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (
      !Number.isInteger(payload.sub) ||
      payload.sub <= 0 ||
      !Number.isInteger(payload.ver) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function requireUser(locals: App.Locals): SessionUser {
  if (!locals.user) redirect(303, '/admin/login');
  return locals.user;
}

export function requireOwner(locals: App.Locals): SessionUser {
  const user = requireUser(locals);
  if (user.role !== 'owner') redirect(303, '/admin');
  return user;
}

export function setSessionCookie(cookies: Cookies, user: SessionUserRecord, secure: boolean): void {
  cookies.set(cookieName, createSessionCookie(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: oneWeekSeconds
  });
}

export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(cookieName, { path: '/' });
}
