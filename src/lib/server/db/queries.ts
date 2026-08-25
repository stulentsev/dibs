import { and, asc, desc, eq, inArray, isNotNull, isNull, notInArray } from 'drizzle-orm';
import { statuses, isItemStatus } from '$lib/item-status';
import { getDb } from './client';
import { itemPhotos, items, users, type NewItem } from './schema';

export { statuses, isItemStatus };

type Actor = {
  id: number;
  role: 'owner' | 'tenant';
};

function ownership(actor: Actor) {
  return actor.role === 'owner' ? undefined : eq(items.ownerId, actor.id);
}

export async function listPublicAvailableItems() {
  const db = getDb();
  const rows = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.published, true),
        inArray(items.status, ['available', 'claimed']),
        isNull(items.deletedAt)
      )
    )
    .orderBy(desc(items.createdAt));

  return withFirstPhotos(rows);
}

export async function getPublicItem(id: number) {
  const db = getDb();
  const [row] = await db
    .select({
      item: items,
      sellerName: users.displayName,
      sellerContactType: users.contactType,
      sellerContactValue: users.contactValue
    })
    .from(items)
    .innerJoin(users, eq(items.ownerId, users.id))
    .where(
      and(
        eq(items.id, id),
        eq(items.published, true),
        notInArray(items.status, ['draft', 'hidden']),
        isNull(items.deletedAt)
      )
    )
    .limit(1);

  if (!row) return null;
  return {
    item: row.item,
    photos: await listPhotos(row.item.id),
    seller: {
      name: row.sellerName,
      contactType: row.sellerContactType,
      contactValue: row.sellerContactValue
    }
  };
}

export async function listAdminItems(actor: Actor, options: { deleted?: boolean } = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(items)
    .where(
      and(
        options.deleted ? isNotNull(items.deletedAt) : isNull(items.deletedAt),
        ownership(actor)
      )
    )
    .orderBy(desc(items.createdAt), desc(items.id));
  return withFirstPhotos(rows);
}

export async function getAdminItem(id: number, actor: Actor) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), ownership(actor)))
    .limit(1);
  return item ?? null;
}

export async function createItem(values: Omit<NewItem, 'ownerId'>, ownerId: number) {
  const db = getDb();
  const [item] = await db
    .insert(items)
    .values({ ...values, ownerId })
    .returning();
  return item;
}

export async function updateItem(id: number, values: Partial<NewItem>, actor: Actor) {
  const db = getDb();
  const [item] = await db
    .update(items)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(items.id, id), ownership(actor)))
    .returning();
  return item ?? null;
}

export async function deleteItem(id: number, actor: Actor) {
  return updateItem(id, { deletedAt: new Date() }, actor);
}

export async function restoreItem(id: number, actor: Actor) {
  return updateItem(id, { deletedAt: null }, actor);
}

export async function listPhotos(itemId: number) {
  return getDb()
    .select()
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, itemId))
    .orderBy(asc(itemPhotos.sortOrder), asc(itemPhotos.id));
}

export async function addPhoto(itemId: number, path: string, altText: string | null) {
  const photos = await listPhotos(itemId);
  const nextOrder = photos.length ? Math.max(...photos.map((photo) => photo.sortOrder)) + 1 : 0;
  const [photo] = await getDb()
    .insert(itemPhotos)
    .values({ itemId, path, altText, sortOrder: nextOrder })
    .returning();
  return photo;
}

export async function deletePhoto(photoId: number, itemId: number) {
  await getDb()
    .delete(itemPhotos)
    .where(and(eq(itemPhotos.id, photoId), eq(itemPhotos.itemId, itemId)));
  await normalizePhotoOrder(itemId);
}

export async function updatePhotoAlt(photoId: number, itemId: number, altText: string | null) {
  await getDb()
    .update(itemPhotos)
    .set({ altText })
    .where(and(eq(itemPhotos.id, photoId), eq(itemPhotos.itemId, itemId)));
}

export async function movePhoto(photoId: number, itemId: number, direction: 'up' | 'down') {
  const photos = await listPhotos(itemId);
  const index = photos.findIndex((photo) => photo.id === photoId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= photos.length) return;

  const current = photos[index];
  const target = photos[targetIndex];
  await getDb()
    .update(itemPhotos)
    .set({ sortOrder: target.sortOrder })
    .where(eq(itemPhotos.id, current.id));
  await getDb()
    .update(itemPhotos)
    .set({ sortOrder: current.sortOrder })
    .where(eq(itemPhotos.id, target.id));
  await normalizePhotoOrder(itemId);
}

async function normalizePhotoOrder(itemId: number) {
  const photos = await listPhotos(itemId);
  await Promise.all(
    photos.map((photo, index) =>
      getDb().update(itemPhotos).set({ sortOrder: index }).where(eq(itemPhotos.id, photo.id))
    )
  );
}

async function withFirstPhotos<T extends { id: number }>(rows: T[]) {
  if (rows.length === 0) return [];

  const photos = await getDb()
    .select()
    .from(itemPhotos)
    .where(
      inArray(
        itemPhotos.itemId,
        rows.map((row) => row.id)
      )
    )
    .orderBy(asc(itemPhotos.sortOrder), asc(itemPhotos.id));

  return rows.map((item) => ({
    ...item,
    firstPhoto: photos.find((photo) => photo.itemId === item.id) ?? null
  }));
}
