import { fail, redirect } from '@sveltejs/kit';
import { createItem } from '$lib/server/db/queries';
import { parseItemForm } from '$lib/server/forms';

export const actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const parsed = parseItemForm(form);

    if (!parsed.ok) {
      return fail(400, { errors: parsed.errors });
    }

    const item = await createItem(parsed.values);
    redirect(303, `/admin/items/${item.id}`);
  }
};
