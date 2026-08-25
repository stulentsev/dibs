import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { env, getAdminUsername, normalizeUsername, usernameError } from './config';
import type { ContactType } from './contact-method';
import { getDb } from './db/client';
import { invites, items, users } from './db/schema';

export const BCRYPT_MAX_PASSWORD_BYTES = 72;

export async function ensureOwner(): Promise<void> {
  const username = getAdminUsername();
  if (!username) {
    throw new Error('Missing required environment variable: ADMIN_USERNAME');
  }
  const invalidUsername = usernameError(username);
  if (invalidUsername) throw new Error(`Invalid ADMIN_USERNAME: ${invalidUsername}`);

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('dibs-owner-bootstrap'))`);

    const existingOwners = await tx
      .select({ id: users.id, bootstrapPending: users.bootstrapPending })
      .from(users)
      .where(eq(users.role, 'owner'));
    const claimedOwner = existingOwners.find((owner) => !owner.bootstrapPending);
    if (claimedOwner) return;

    const legacyOwner = existingOwners.find((owner) => owner.bootstrapPending);
    if (legacyOwner) {
      const passwordHash = env('ADMIN_PASSWORD_HASH');
      await tx
        .update(users)
        .set({ username, passwordHash, bootstrapPending: false, updatedAt: new Date() })
        .where(eq(users.id, legacyOwner.id));
      return;
    }

    throw new Error('Owner bootstrap row is missing. Run database migrations before startup.');
  });
}

export async function claimOwnerWithBootstrapCredentials(username: string, password: string) {
  const configuredUsername = getAdminUsername();
  if (!configuredUsername) {
    throw new Error('Missing required environment variable: ADMIN_USERNAME');
  }

  if (normalizeUsername(username) !== configuredUsername || !password) return null;
  if (!(await bcrypt.compare(password, env('ADMIN_PASSWORD_HASH')))) return null;

  await ensureOwner();
  return verifyLogin(username, password);
}

export async function verifyLogin(username: string, password: string) {
  const normalized = normalizeUsername(username);
  if (!normalized || !password) return null;

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.username, normalized))
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
    identity: user.identity,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    contactType: user.contactType,
    contactValue: user.contactValue,
    tokenVersion: user.tokenVersion,
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

type SignupInput = {
  token: string;
  username: string;
  password: string;
  displayName: string | null;
};

type SignupFailureReason = 'invite-unavailable' | 'identity-exists' | 'username-exists';

class SignupError extends Error {
  constructor(readonly reason: SignupFailureReason) {
    super(reason);
  }
}

export function passwordExceedsBcryptLimit(password: string): boolean {
  return Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES;
}

export async function signupWithInvite(input: SignupInput) {
  if (passwordExceedsBcryptLimit(input.password)) {
    throw new RangeError(`Password exceeds bcrypt's ${BCRYPT_MAX_PASSWORD_BYTES}-byte limit.`);
  }

  const db = getDb();
  const normalized = normalizeUsername(input.username);
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    return await db.transaction(async (tx) => {
      const [invite] = await tx
        .update(invites)
        .set({ usedAt: sql`clock_timestamp()` })
        .where(
          and(
            eq(invites.token, input.token),
            isNull(invites.usedAt),
            gt(invites.expiresAt, sql`clock_timestamp()`),
          ),
        )
        .returning();
      if (!invite) throw new SignupError('invite-unavailable');

      const [user] = await tx
        .insert(users)
        .values({
          identity: invite.identity,
          username: normalized,
          passwordHash,
          role: 'tenant',
          displayName: input.displayName,
          contactType: 'whatsapp',
          contactValue: invite.identity,
        })
        .onConflictDoNothing()
        .returning();

      if (!user) {
        const [conflict] = await tx
          .select({ identity: users.identity, username: users.username })
          .from(users)
          .where(or(eq(users.identity, invite.identity), eq(users.username, normalized)))
          .limit(1);
        throw new SignupError(
          conflict?.identity === invite.identity ? 'identity-exists' : 'username-exists',
        );
      }

      await tx
        .update(invites)
        .set({ usedBy: user.id })
        .where(eq(invites.id, invite.id));

      return { ok: true as const, user };
    });
  } catch (error) {
    if (error instanceof SignupError) {
      return { ok: false as const, reason: error.reason };
    }
    throw error;
  }
}

export async function createInvite(createdBy: number, ttlDays: number, identity: string) {
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`dibs-account-identity:${identity}`}))`,
    );

    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.identity, identity))
      .limit(1);
    if (existingUser) return { ok: false as const, reason: 'identity-exists' as const };

    const [existingInvite] = await tx
      .select({ id: invites.id })
      .from(invites)
      .where(
        and(
          eq(invites.identity, identity),
          isNull(invites.usedAt),
          gt(invites.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (existingInvite) return { ok: false as const, reason: 'invite-exists' as const };

    const [invite] = await tx
      .insert(invites)
      .values({ token, identity, createdBy, expiresAt })
      .returning();
    return { ok: true as const, invite };
  });
}

export async function deleteInvite(inviteId: number) {
  await getDb().delete(invites).where(and(eq(invites.id, inviteId), isNull(invites.usedAt)));
}

export async function listInvites() {
  return getDb()
    .select({
      id: invites.id,
      token: invites.token,
      identity: invites.identity,
      createdAt: invites.createdAt,
      expiresAt: invites.expiresAt,
      usedAt: invites.usedAt,
    })
    .from(invites)
    .orderBy(desc(invites.createdAt), desc(invites.id));
}

export async function listTenants() {
  return getDb()
    .select({
      id: users.id,
      identity: users.identity,
      username: users.username,
      displayName: users.displayName,
      contactType: users.contactType,
      contactValue: users.contactValue,
      status: users.status,
      createdAt: users.createdAt,
      itemCount: sql<number>`(select count(*)::int from ${items} where ${items.ownerId} = ${users.id} and ${items.deletedAt} is null)`,
    })
    .from(users)
    .where(eq(users.role, 'tenant'))
    .orderBy(desc(users.createdAt), desc(users.id));
}

export async function updateProfile(
  userId: number,
  values: {
    username: string;
    displayName: string | null;
    contactType: ContactType;
    contactValue: string;
  },
) {
  try {
    const [user] = await getDb()
      .update(users)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user ? { ok: true as const, user } : { ok: false as const, reason: 'not-found' as const };
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      return { ok: false as const, reason: 'username-exists' as const };
    }
    throw error;
  }
}

export async function setTenantStatus(tenantId: number, status: 'active' | 'disabled') {
  const [user] = await getDb()
    .update(users)
    .set({
      status,
      tokenVersion: status === 'disabled' ? sql`${users.tokenVersion} + 1` : undefined,
      updatedAt: new Date(),
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
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, tenantId), eq(users.role, 'tenant')))
    .returning();
  return user ? temporaryPassword : null;
}
