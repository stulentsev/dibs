export const contactTypes = ['whatsapp', 'email'] as const;

export type ContactType = (typeof contactTypes)[number];

type ContactMethod = {
  type: ContactType;
  value: string;
};

function isContactType(value: string): value is ContactType {
  return contactTypes.includes(value as ContactType);
}

export function normalizeWhatsAppNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /[a-z]/i.test(trimmed)) return null;

  const international = trimmed.startsWith('00') ? trimmed.slice(2) : trimmed.replace(/^\+/, '');
  const digits = international.replace(/[\s().-]/g, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;

  return `+${digits}`;
}

export function normalizeContactMethod(type: string, value: string): ContactMethod | null {
  if (!isContactType(type)) return null;

  if (type === 'whatsapp') {
    const phone = normalizeWhatsAppNumber(value);
    return phone ? { type, value: phone } : null;
  }

  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) return null;
  return { type, value: email };
}
