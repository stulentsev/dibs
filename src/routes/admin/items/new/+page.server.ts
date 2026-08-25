import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { createItem, sellerHasContact } from '$lib/server/db/queries';
import { parseItemForm } from '$lib/server/forms';

export const actions = {
  default: async ({ request, locals }) => {
    const actor = requireUser(locals);

    const form = await request.formData();
    const parsed = parseItemForm(form);

    if (!parsed.ok) {
      return fail(400, { errors: parsed.errors });
    }
    if (parsed.values.published && !(await sellerHasContact(actor.id))) {
      return fail(400, { errors: ['Add a contact method to your profile before publishing an item.'] });
    }

    const item = await createItem(parsed.values, actor.id);
    redirect(303, `/admin/items/${item.id}`);
  }
};
