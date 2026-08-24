import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { statuses, type ItemStatus } from '../../item-status';

export const itemStatus = pgEnum('item_status', statuses);
export const userRole = pgEnum('user_role', ['owner', 'tenant']);
export const userStatus = pgEnum('user_status', ['active', 'disabled']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('tenant'),
  displayName: varchar('display_name', { length: 80 }),
  contactUrl: varchar('contact_url', { length: 500 }),
  status: userStatus('status').notNull().default('active'),
  tokenVersion: integer('token_version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const invites = pgTable('invites', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  usedBy: integer('used_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

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

export const itemsRelations = relations(items, ({ many, one }) => ({
  owner: one(users, {
    fields: [items.ownerId],
    references: [users.id]
  }),
  photos: many(itemPhotos)
}));

export const itemPhotosRelations = relations(itemPhotos, ({ one }) => ({
  item: one(items, {
    fields: [itemPhotos.itemId],
    references: [items.id]
  })
}));

export type UserRole = (typeof users.$inferSelect)['role'];
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Invite = typeof invites.$inferSelect;

export type { ItemStatus };
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemPhoto = typeof itemPhotos.$inferSelect;
