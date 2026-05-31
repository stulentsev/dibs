import { fail, redirect } from '@sveltejs/kit';
import { deleteItem, listAdminItems, listPhotos } from '$lib/server/db/queries';
import { parsePositiveInt } from '$lib/server/forms';
import { deleteUploadedPhoto } from '$lib/server/uploads';

export async function load() {
  return {
    items: await listAdminItems()
  };
}

export const actions = {
  deleteItem: async ({ request }) => {
    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const photos = await listPhotos(id);
    await deleteItem(id);
    await Promise.all(photos.map((photo) => deleteUploadedPhoto(photo.path)));
    redirect(303, '/admin');
  }
};
