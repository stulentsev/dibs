import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { deleteItem, listAdminItems, restoreItem, updateItem } from '$lib/server/db/queries';
import { parsePositiveInt } from '$lib/server/forms';

export async function load({ locals, url }) {
  requireAdmin(locals);

  const recentlyDeleted = url.searchParams.get('recently_deleted') === '1';

  return {
    items: await listAdminItems({ deleted: recentlyDeleted }),
    recentlyDeleted
  };
}

export const actions = {
  claimItem: async ({ request, locals }) => {
    requireAdmin(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const item = await updateItem(id, { status: 'claimed' });
    if (!item) return fail(404, { error: 'Item not found.' });
    return { error: null };
  },

  unclaimItem: async ({ request, locals }) => {
    requireAdmin(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const item = await updateItem(id, { status: 'available' });
    if (!item) return fail(404, { error: 'Item not found.' });
    return { error: null };
  },

  markItemGone: async ({ request, locals }) => {
    requireAdmin(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const item = await updateItem(id, { status: 'gone' });
    if (!item) return fail(404, { error: 'Item not found.' });
    return { error: null };
  },

  deleteItem: async ({ request, locals }) => {
    requireAdmin(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    await deleteItem(id);
    return { error: null };
  },

  restoreItem: async ({ request, locals }) => {
    requireAdmin(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const item = await restoreItem(id);
    if (!item) return fail(404, { error: 'Item not found.' });
    return { error: null };
  }
};
