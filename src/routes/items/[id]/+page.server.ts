import { error } from '@sveltejs/kit';
import { buildContactUrl, contactLabel } from '$lib/server/contact';
import { getPublicItem } from '$lib/server/db/queries';

export async function load({ params, locals }) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isInteger(id)) error(404, 'Item not found');

  const record = await getPublicItem(id);
  if (!record) error(404, 'Item not found');

  return {
    ...record,
    admin: locals.user,
    contactLabel: contactLabel(),
    contactUrl: buildContactUrl(record.seller.contactUrl, record.item)
  };
}
