import { fail } from '@sveltejs/kit';
import { requireOwner } from '$lib/server/auth';
import { listTenants, resetTenantPassword, setTenantStatus } from '$lib/server/users';
import { parsePositiveInt } from '$lib/server/forms';

export async function load({ locals }) {
  requireOwner(locals);

  return {
    tenants: await listTenants()
  };
}

export const actions = {
  toggle: async ({ request, locals }) => {
    requireOwner(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid tenant.' });
    const status = form.get('status');
    if (status !== 'disable' && status !== 'enable') {
      return fail(400, { error: 'Invalid tenant status.' });
    }

    const user = await setTenantStatus(id, status === 'disable' ? 'disabled' : 'active');
    if (!user) return fail(404, { error: 'Tenant not found.' });
    return { error: null };
  },

  resetPassword: async ({ request, locals }) => {
    requireOwner(locals);

    const form = await request.formData();
    const id = parsePositiveInt(form.get('id'));
    if (!id) return fail(400, { error: 'Invalid tenant.' });

    const temporaryPassword = await resetTenantPassword(id);
    if (!temporaryPassword) return fail(404, { error: 'Tenant not found.' });
    return { temporaryPassword, resetForId: id };
  }
};
