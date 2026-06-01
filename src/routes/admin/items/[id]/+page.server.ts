import { error, fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import {
  deleteItem,
  deletePhoto,
  getAdminItem,
  listPhotos,
  movePhoto,
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

export async function load({ params, locals }) {
  requireAdmin(locals);

  const record = await getAdminItem(parseItemId(params.id));
  if (!record) error(404, 'Item not found');
  return record;
}

export const actions = {
  update: async ({ request, params, locals }) => {
    requireAdmin(locals);

    const id = parseItemId(params.id);
    const form = await request.formData();
    const parsed = parseItemForm(form);

    if (!parsed.ok) {
      return fail(400, { errors: parsed.errors });
    }

    await updateItem(id, parsed.values);
    return { success: 'Item saved.' };
  },

  deleteItem: async ({ params, locals }) => {
    requireAdmin(locals);

    const id = parseItemId(params.id);
    const photos = await listPhotos(id);
    await deleteItem(id);
    await Promise.all(photos.map((photo) => deleteUploadedPhoto(photo.path)));
    redirect(303, '/admin');
  },

  uploadPhotos: async ({ request, params, locals }) => {
    requireAdmin(locals);

    const id = parseItemId(params.id);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail(413, { errors: ['Photo upload request is too large for the server limit.'] });
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
    requireAdmin(locals);

    const itemId = parseItemId(params.id);
    const form = await request.formData();
    const photoId = parsePositiveInt(form.get('photo_id'));
    if (!photoId) return fail(400, { errors: ['Invalid photo.'] });

    const photo = (await listPhotos(itemId)).find((record) => record.id === photoId);
    if (photo) await deleteUploadedPhoto(photo.path);
    await deletePhoto(photoId, itemId);
    return { success: 'Photo deleted.' };
  },

  updatePhotoAlt: async ({ request, params, locals }) => {
    requireAdmin(locals);

    const itemId = parseItemId(params.id);
    const form = await request.formData();
    const photoId = parsePositiveInt(form.get('photo_id'));
    const altText = String(form.get('alt_text') ?? '').trim() || null;
    if (!photoId) return fail(400, { errors: ['Invalid photo.'] });
    if (altText && altText.length > 200) return fail(400, { errors: ['Alt text must be 200 characters or less.'] });

    await updatePhotoAlt(photoId, itemId, altText);
    return { success: 'Photo updated.' };
  },

  movePhoto: async ({ request, params, locals }) => {
    requireAdmin(locals);

    const itemId = parseItemId(params.id);
    const form = await request.formData();
    const photoId = parsePositiveInt(form.get('photo_id'));
    const direction = form.get('direction') === 'down' ? 'down' : 'up';
    if (!photoId) return fail(400, { errors: ['Invalid photo.'] });

    await movePhoto(photoId, itemId, direction);
    return { success: 'Photo reordered.' };
  }
};
