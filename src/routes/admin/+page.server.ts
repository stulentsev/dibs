import { fail } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { deleteItem, listAdminItems, restoreItem, updateItem } from '$lib/server/db/queries';
import { parsePositiveInt } from '$lib/server/forms';

export async function load({ locals, url }) {
  const actor = requireUser(locals);
  const recentlyDeleted = url.searchParams.get('recently_deleted') === '1';

  return {
    items: await listAdminItems(actor, { deleted: recentlyDeleted }),
    recentlyDeleted
  };
}

export const actions = {
  claimItem: async ({ request, locals }) => {
    const actor = requireUser(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const item = await updateItem(id, { status: 'claimed' }, actor);
    if (!item) return fail(404, { error: 'Item not found.' });
    return { error: null };
  },

  unclaimItem: async ({ request, locals }) => {
    const actor = requireUser(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const item = await updateItem(id, { status: 'available' }, actor);
    if (!item) return fail(404, { error: 'Item not found.' });
    return { error: null };
  },

  markItemGone: async ({ request, locals }) => {
    const actor = requireUser(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const item = await updateItem(id, { status: 'gone' }, actor);
    if (!item) return fail(404, { error: 'Item not found.' });
    return { error: null };
  },

  deleteItem: async ({ request, locals }) => {
    const actor = requireUser(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const item = await deleteItem(id, actor);
    if (!item) return fail(404, { error: 'Item not found.' });
    return { error: null };
  },

  restoreItem: async ({ request, locals }) => {
    const actor = requireUser(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid item.' });

    const item = await restoreItem(id, actor);
    if (!item) return fail(404, { error: 'Item not found.' });
    return { error: null };
  }
};
