import { env } from './config';
import type { ContactType } from './contact-method';

export function contactLabel(type: ContactType): string {
  if (type === 'whatsapp') return 'Message seller on WhatsApp';
  return 'Email seller';
}

export function buildContactUrl(
  contact: {
    type: ContactType;
    value: string;
  },
  item: { id: number; title: string },
): string {
  const siteUrl = env('PUBLIC_SITE_URL').replace(/\/$/, '');
  const itemUrl = `${siteUrl}/items/${item.id}`;
  const message = `Hi, I'm interested in "${item.title}": ${itemUrl}`;

  if (contact.type === 'whatsapp') {
    return `https://wa.me/${contact.value.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  }

  const subject = encodeURIComponent(`Interested in ${item.title}`);
  const address = encodeURIComponent(contact.value).replace('%40', '@');
  return `mailto:${address}?subject=${subject}&body=${encodeURIComponent(message)}`;
}
