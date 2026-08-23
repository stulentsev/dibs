import { and, asc, desc, eq, inArray, isNotNull, isNull, notInArray } from 'drizzle-orm';
import { statuses, isItemStatus } from '$lib/item-status';
import { getDb } from './client';
import { itemPhotos, items, type NewItem } from './schema';

export { statuses, isItemStatus };

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
  const [item] = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.id, id),
        eq(items.published, true),
        notInArray(items.status, ['draft', 'hidden']),
        isNull(items.deletedAt)
      )
    )
    .limit(1);

  if (!item) return null;
  return { item, photos: await listPhotos(id) };
}

export async function listAdminItems(options: { deleted?: boolean } = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(items)
    .where(options.deleted ? isNotNull(items.deletedAt) : isNull(items.deletedAt))
    .orderBy(desc(items.createdAt), desc(items.id));
  return withFirstPhotos(rows);
}

export async function getAdminItem(id: number) {
  const db = getDb();
  const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (!item) return null;
  return { item, photos: await listPhotos(id) };
}

export async function createItem(values: NewItem) {
  const db = getDb();
  const [item] = await db.insert(items).values(values).returning();
  return item;
}

export async function updateItem(id: number, values: Partial<NewItem>) {
  const db = getDb();
  const [item] = await db
    .update(items)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(items.id, id))
    .returning();
  return item ?? null;
}

export async function deleteItem(id: number) {
  await updateItem(id, { deletedAt: new Date() });
}

export async function restoreItem(id: number) {
  return updateItem(id, { deletedAt: null });
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
