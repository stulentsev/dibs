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

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 180 }).notNull(),
  description: text('description').notNull(),
  priceCents: integer('price_cents'),
  isFree: boolean('is_free').notNull().default(false),
  status: itemStatus('status').notNull().default('draft'),
  category: varchar('category', { length: 120 }),
  pickupNotes: text('pickup_notes'),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
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

export const itemsRelations = relations(items, ({ many }) => ({
  photos: many(itemPhotos)
}));

export const itemPhotosRelations = relations(itemPhotos, ({ one }) => ({
  item: one(items, {
    fields: [itemPhotos.itemId],
    references: [items.id]
  })
}));

export type { ItemStatus };
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemPhoto = typeof itemPhotos.$inferSelect;
