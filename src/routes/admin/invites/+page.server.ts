import { fail } from '@sveltejs/kit';
import { requireOwner } from '$lib/server/auth';
import { env } from '$lib/server/config';
import { createInvite, deleteInvite, listInvites } from '$lib/server/users';
import { parsePositiveInt } from '$lib/server/forms';
import { normalizeWhatsAppNumber } from '$lib/server/contact-method';

export async function load({ locals }) {
  requireOwner(locals);

  return {
    invites: await listInvites(),
    siteUrl: env('PUBLIC_SITE_URL').replace(/\/$/, ''),
  };
}

export const actions = {
  create: async ({ request, locals }) => {
    const owner = requireOwner(locals);

    const form = await request.formData();
    const days = parsePositiveInt(form.get('expires_days')) ?? 7;
    const ttlDays = Math.min(Math.max(days, 1), 30);
    const rawIdentity = String(form.get('whatsapp_number') ?? '');
    const identity = normalizeWhatsAppNumber(rawIdentity);
    if (!identity) {
      return fail(400, {
        error: 'Enter a valid WhatsApp number in international format.',
        whatsappNumber: rawIdentity,
      });
    }

    const result = await createInvite(owner.id, ttlDays, identity);
    if (!result.ok) {
      return fail(400, {
        error:
          result.reason === 'identity-exists'
            ? 'An account already exists for this WhatsApp number.'
            : 'An unused invite already exists for this WhatsApp number.',
        whatsappNumber: rawIdentity,
      });
    }
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
