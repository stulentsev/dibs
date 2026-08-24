import { fail } from '@sveltejs/kit';
import { requireOwner } from '$lib/server/auth';
import { env } from '$lib/server/config';
import { createInvite, deleteInvite, listInvites } from '$lib/server/users';
import { parsePositiveInt } from '$lib/server/forms';

export async function load({ locals }) {
  requireOwner(locals);

  return {
    invites: await listInvites(),
    siteUrl: env('PUBLIC_SITE_URL').replace(/\/$/, '')
  };
}

export const actions = {
  create: async ({ request, locals }) => {
    requireOwner(locals);

    const form = await request.formData();
    const days = parsePositiveInt(form.get('expires_days')) ?? 7;
    const ttlDays = Math.min(Math.max(days, 1), 30);

    await createInvite(requireOwner(locals).id, ttlDays);
    return { success: 'Invite link created.' };
  },

  revoke: async ({ request, locals }) => {
    requireOwner(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid invite.' });

    await deleteInvite(id);
    return { success: null, error: null };
  }
};
