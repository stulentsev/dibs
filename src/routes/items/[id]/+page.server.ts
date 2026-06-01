import { error } from '@sveltejs/kit';
import { contactLabel, contactUrl } from '$lib/server/contact';
import { getPublicItem } from '$lib/server/db/queries';

export async function load({ params, locals }) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isInteger(id)) error(404, 'Item not found');

  const record = await getPublicItem(id);
  if (!record) error(404, 'Item not found');

  return {
    ...record,
    admin: locals.admin,
    contactLabel: contactLabel(),
    contactUrl: contactUrl(record.item)
  };
}
