import { fail } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { normalizeContactMethod } from '$lib/server/contact-method';
import { normalizeUsername, usernameError } from '$lib/server/config';
import { updateProfile } from '$lib/server/users';

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export async function load({ locals }) {
  return { profile: requireUser(locals) };
}

export const actions = {
  default: async ({ request, locals }) => {
    const currentUser = requireUser(locals);
    const form = await request.formData();
    const username = normalizeUsername(text(form, 'username'));
    const displayNameValue = text(form, 'display_name');
    const contactType = text(form, 'contact_type');
    const contactValue = text(form, 'contact_value');
    const contact = normalizeContactMethod(contactType, contactValue);
    const errors: string[] = [];

    const invalidUsername = usernameError(username);
    if (invalidUsername) errors.push(invalidUsername);
    if (displayNameValue.length > 80) errors.push('Display name must be at most 80 characters.');
    if (!contact) {
      errors.push(
        contactType === 'email'
          ? 'Enter a valid email address.'
          : 'Enter a valid WhatsApp number in international format.',
      );
    }

    const values = {
      username,
      displayName: displayNameValue,
      contactType,
      contactValue,
    };
    if (errors.length || !contact) return fail(400, { errors, values });

    const result = await updateProfile(currentUser.id, {
      username,
      displayName: displayNameValue || null,
      contactType: contact.type,
      contactValue: contact.value,
    });
    if (!result.ok) {
      const message =
        result.reason === 'username-exists' ? 'That username is already taken.' : 'Account not found.';
      return fail(400, { errors: [message], values });
    }

    return {
      success: 'Profile updated.',
      values: {
        username: result.user.username,
        displayName: result.user.displayName ?? '',
        contactType: result.user.contactType ?? 'whatsapp',
        contactValue: result.user.contactValue ?? '',
      },
    };
  }
};
