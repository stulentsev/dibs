import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { statuses, type ItemStatus } from '../../item-status';
import { contactTypes } from '../contact-method';

export const itemStatus = pgEnum('item_status', statuses);
export const userRole = pgEnum('user_role', ['owner', 'tenant']);
export const userStatus = pgEnum('user_status', ['active', 'disabled']);
export const contactMethodType = pgEnum('contact_method_type', contactTypes);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    identity: varchar('identity', { length: 64 }).notNull().unique(),
    username: varchar('username', { length: 64 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('tenant'),
    displayName: varchar('display_name', { length: 80 }),
    contactType: contactMethodType('contact_type'),
    contactValue: varchar('contact_value', { length: 254 }),
    bootstrapPending: boolean('bootstrap_pending').notNull().default(false),
    status: userStatus('status').notNull().default('active'),
    tokenVersion: integer('token_version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('users_username_format', sql`${table.username} ~ '^[a-z0-9][a-z0-9._-]{2,63}$'`),
    check(
      'users_tenant_identity_e164',
      sql`${table.role} = 'owner' or ${table.identity} ~ '^\\+[1-9][0-9]{7,14}$'`,
    ),
    check(
      'users_contact_method_valid',
      sql`(${table.contactType} is null and ${table.contactValue} is null)
        or (${table.contactType} is not null and ${table.contactValue} is not null and (
          (${table.contactType} = 'whatsapp' and ${table.contactValue} ~ '^\\+[1-9][0-9]{7,14}$')
          or (${table.contactType} = 'email' and ${table.contactValue} = lower(${table.contactValue}) and ${table.contactValue} ~ '^[^[:space:]@?&#]+@[^[:space:]@?&#]+\\.[^[:space:]@?&#]+$')
        ))`,
    ),
  ],
);

export const invites = pgTable(
  'invites',
  {
    id: serial('id').primaryKey(),
    token: varchar('token', { length: 64 }).notNull().unique(),
    identity: varchar('identity', { length: 16 }).notNull(),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    usedBy: integer('used_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('invites_identity_e164', sql`${table.identity} ~ '^\\+[1-9][0-9]{7,14}$'`),
  ],
);

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title', { length: 180 }).notNull(),
  description: text('description').notNull(),
  priceCents: integer('price_cents'),
  isFree: boolean('is_free').notNull().default(false),
  status: itemStatus('status').notNull().default('draft'),
  category: varchar('category', { length: 120 }),
  pickupNotes: text('pickup_notes'),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
});

export const itemPhotos = pgTable('item_photos', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  path: varchar('path', { length: 512 }).notNull(),
  altText: varchar('alt_text', { length: 200 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type { ItemStatus };
export type NewItem = typeof items.$inferInsert;
