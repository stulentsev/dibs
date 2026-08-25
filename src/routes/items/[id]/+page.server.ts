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
    canManage: locals.user?.role === 'owner' || locals.user?.id === record.item.ownerId,
    contactLabel: contactLabel(record.seller.contactType),
    contactUrl: buildContactUrl(
      {
        type: record.seller.contactType,
        value: record.seller.contactValue
      },
      record.item
    )
  };
}
