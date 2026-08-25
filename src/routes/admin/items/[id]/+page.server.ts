import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import {
  deleteItem,
  deletePhoto,
  getAdminItem,
  listPhotos,
  movePhoto,
  sellerHasContact,
  updateItem,
  updatePhotoAlt,
  addPhoto
} from '$lib/server/db/queries';
import { parseItemForm, parsePositiveInt } from '$lib/server/forms';
import { deleteUploadedPhoto, saveUploadedPhoto } from '$lib/server/uploads';

function parseItemId(param: string): number {
  const id = Number.parseInt(param, 10);
  if (!Number.isInteger(id) || id <= 0) error(404, 'Item not found');
  return id;
}

async function requireOwnedItem(params: { id: string }, locals: App.Locals) {
  const actor = requireUser(locals);
  const item = await getAdminItem(parseItemId(params.id), actor);
  if (!item) error(404, 'Item not found');
  return { actor, item };
}

export async function load({ params, locals }) {
  const { item } = await requireOwnedItem(params, locals);
  return { item, photos: await listPhotos(item.id) };
}

export const actions = {
  update: async ({ request, params, locals }) => {
    const { actor, item } = await requireOwnedItem(params, locals);

    const form = await request.formData();
    const parsed = parseItemForm(form);

    if (!parsed.ok) {
      return fail(400, { errors: parsed.errors });
    }
    if (parsed.values.published && !(await sellerHasContact(item.ownerId))) {
      return fail(400, { errors: ['Add a contact method to the seller profile before publishing this item.'] });
    }

    await updateItem(parseItemId(params.id), parsed.values, actor);
    return { success: 'Item saved.' };
  },

  deleteItem: async ({ params, locals }) => {
    const { actor } = await requireOwnedItem(params, locals);

    await deleteItem(parseItemId(params.id), actor);
    redirect(303, '/admin');
  },

  uploadPhotos: async ({ request, params, locals }) => {
    const { item } = await requireOwnedItem(params, locals);
    const id = item.id;

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail(413, { errors: ['Photo upload request is too large for BODY_SIZE_LIMIT. Set it to 30M or higher.'] });
    }

    const files = form.getAll('photos').filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return fail(400, { errors: ['Choose at least one photo to upload.'] });
    }

    const errors: string[] = [];
    for (const file of files) {
      try {
        const path = await saveUploadedPhoto(file);
        await addPhoto(id, path, null);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Photo upload failed.');
      }
    }

    if (errors.length) return fail(400, { errors });
    return { success: 'Photos uploaded.' };
  },

  deletePhoto: async ({ request, params, locals }) => {
    const { item } = await requireOwnedItem(params, locals);
    const itemId = item.id;

    const form = await request.formData();
    const photoId = parsePositiveInt(form.get('photo_id'));
    if (!photoId) return fail(400, { errors: ['Invalid photo.'] });

    const photo = (await listPhotos(itemId)).find((record) => record.id === photoId);
    if (photo) await deleteUploadedPhoto(photo.path);
    await deletePhoto(photoId, itemId);
    return { success: 'Photo deleted.' };
  },

  updatePhotoAlt: async ({ request, params, locals }) => {
    const { item } = await requireOwnedItem(params, locals);
    const itemId = item.id;

    const form = await request.formData();
    const photoId = parsePositiveInt(form.get('photo_id'));
    const altText = String(form.get('alt_text') ?? '').trim() || null;
    if (!photoId) return fail(400, { errors: ['Invalid photo.'] });
    if (altText && altText.length > 200) return fail(400, { errors: ['Alt text must be 200 characters or less.'] });

    await updatePhotoAlt(photoId, itemId, altText);
    return { success: 'Photo updated.' };
  },

  movePhoto: async ({ request, params, locals }) => {
    const { item } = await requireOwnedItem(params, locals);
    const itemId = item.id;

    const form = await request.formData();
    const photoId = parsePositiveInt(form.get('photo_id'));
    const direction = form.get('direction') === 'down' ? 'down' : 'up';
    if (!photoId) return fail(400, { errors: ['Invalid photo.'] });

    await movePhoto(photoId, itemId, direction);
    return { success: 'Photo reordered.' };
  }
};
