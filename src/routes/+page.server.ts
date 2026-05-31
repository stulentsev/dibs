import { listPublicAvailableItems } from '$lib/server/db/queries';

export async function load() {
  return {
    items: await listPublicAvailableItems()
  };
}
