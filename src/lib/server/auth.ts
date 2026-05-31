import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { env, getAdminIdentifier } from './config';

const cookieName = 'dibs_admin';
const oneWeekSeconds = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  exp: number;
};

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

export { cookieName, getAdminIdentifier };

export async function verifyPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, env('ADMIN_PASSWORD_HASH'));
}

export function createSessionCookie(identifier: string): string {
  const payload: SessionPayload = {
    sub: identifier,
    exp: Math.floor(Date.now() / 1000) + oneWeekSeconds
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionCookie(token: string, identifier: string): boolean {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature || !safeEqual(signature, sign(encoded))) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    return payload.sub === identifier && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function setSessionCookie(cookies: Cookies, identifier: string, secure: boolean): void {
  cookies.set(cookieName, createSessionCookie(identifier), {
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
