import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { env, getAdminIdentifier, normalizeIdentifier } from './config';
import { getDb } from './db/client';
import { invites, items, users } from './db/schema';

export const LEGACY_OWNER_EMAIL = 'owner@legacy.internal';

const minPasswordLength = 8;

export async function ensureOwner(): Promise<void> {
  const email = getAdminIdentifier();
  if (!email) {
    throw new Error('Missing required environment variable: ADMIN_EMAIL or ADMIN_USERNAME');
  }

  const db = getDb();
  const passwordHash = env('ADMIN_PASSWORD_HASH');
  await db.execute(
    sql`update "users" as "legacy_owner"
        set "email" = ${email}, "password_hash" = ${passwordHash}, "updated_at" = now()
        where "legacy_owner"."email" = ${LEGACY_OWNER_EMAIL}
          and not exists (
            select 1 from "users" as "configured_owner"
            where "configured_owner"."email" = ${email}
              and "configured_owner"."email" <> ${LEGACY_OWNER_EMAIL}
          )`
  );
  await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: 'owner',
      status: 'active'
    })
    .onConflictDoNothing({ target: users.email });
}

export async function verifyLogin(email: string, password: string) {
  const normalized = normalizeIdentifier(email);
  if (!normalized || !password) return null;

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  if (!user || user.status !== 'active') return null;

  const matches = await bcrypt.compare(password, user.passwordHash);
  return matches ? user : null;
}

export async function loadSessionUser(payload: {
  sub: number;
  ver: number;
}) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user || user.status !== 'active' || user.tokenVersion !== payload.ver) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    contactUrl: user.contactUrl,
    tokenVersion: user.tokenVersion
  };
}

export async function getUsableInvite(token: string) {
  const [invite] = await getDb()
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
    .limit(1);
  return invite ?? null;
}

export type SignupInput = {
  token: string;
  email: string;
  password: string;
  displayName: string | null;
  contactUrl: string | null;
};

export async function signupWithInvite(input: SignupInput) {
  const db = getDb();
  const normalized = normalizeIdentifier(input.email);
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: normalized,
          passwordHash,
          role: 'tenant',
          displayName: input.displayName,
          contactUrl: input.contactUrl
        })
        .onConflictDoNothing({ target: users.email })
        .returning();

      if (!user) return { ok: false as const };

      const consumed = await tx
        .update(invites)
        .set({ usedAt: new Date(), usedBy: user.id })
        .where(and(eq(invites.token, input.token), isNull(invites.usedAt)))
        .returning({ id: invites.id });

      if (consumed.length === 0) throw new Error('invite-unavailable');

      return { ok: true as const, user };
    });
  } catch {
    // Account creation and invite consumption roll back together, so a failed
    // signup never burns an invite.
    return { ok: false as const };
  }
}

export async function createInvite(createdBy: number, ttlDays: number) {
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const [invite] = await getDb().insert(invites).values({ token, createdBy, expiresAt }).returning();
  return invite;
}

export async function deleteInvite(inviteId: number) {
  await getDb().delete(invites).where(and(eq(invites.id, inviteId), isNull(invites.usedAt)));
}

export async function listInvites() {
  return getDb()
    .select({
      id: invites.id,
      token: invites.token,
      createdAt: invites.createdAt,
      expiresAt: invites.expiresAt,
      usedAt: invites.usedAt
    })
    .from(invites)
    .orderBy(desc(invites.createdAt), desc(invites.id));
}

export async function listTenants() {
  return getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      contactUrl: users.contactUrl,
      status: users.status,
      createdAt: users.createdAt,
      itemCount: sql<number>`(select count(*)::int from ${items} where ${items.ownerId} = ${users.id} and ${items.deletedAt} is null)`
    })
    .from(users)
    .where(eq(users.role, 'tenant'))
    .orderBy(desc(users.createdAt), desc(users.id));
}

export async function setTenantStatus(tenantId: number, status: 'active' | 'disabled') {
  const [user] = await getDb()
    .update(users)
    .set({
      status,
      tokenVersion: status === 'disabled' ? sql`${users.tokenVersion} + 1` : undefined,
      updatedAt: new Date()
    })
    .where(and(eq(users.id, tenantId), eq(users.role, 'tenant')))
    .returning();
  return user ?? null;
}

export async function resetTenantPassword(tenantId: number): Promise<string | null> {
  const temporaryPassword = randomBytes(9).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const [user] = await getDb()
    .update(users)
    .set({
      passwordHash,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date()
    })
    .where(and(eq(users.id, tenantId), eq(users.role, 'tenant')))
    .returning();
  return user ? temporaryPassword : null;
}
