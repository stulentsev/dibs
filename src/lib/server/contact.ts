import { env } from './config';
import type { ContactType } from './contact-method';

export function contactLabel(type?: ContactType | null): string {
  if (type === 'whatsapp') return 'Message seller on WhatsApp';
  if (type === 'email') return 'Email seller';
  return env('PUBLIC_CONTACT_LABEL');
}

export function buildContactUrl(
  contact: {
    type: ContactType | null;
    value: string | null;
  },
  item: { id: number; title: string },
): string {
  const siteUrl = env('PUBLIC_SITE_URL').replace(/\/$/, '');
  const itemUrl = `${siteUrl}/items/${item.id}`;
  const message = `Hi, I'm interested in "${item.title}": ${itemUrl}`;

  if (contact.type === 'whatsapp' && contact.value) {
    return `https://wa.me/${contact.value.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  }
  if (contact.type === 'email' && contact.value) {
    const subject = encodeURIComponent(`Interested in ${item.title}`);
    const address = encodeURIComponent(contact.value).replace('%40', '@');
    return `mailto:${address}?subject=${subject}&body=${encodeURIComponent(message)}`;
  }

  const template = env('PUBLIC_CONTACT_URL_TEMPLATE');
  const title = encodeURIComponent(item.title);
  const url = encodeURIComponent(itemUrl);

  return template
    .replaceAll('{title}', title)
    .replaceAll('{url}', url)
    .replaceAll('%7Btitle%7D', title)
    .replaceAll('%7Burl%7D', url);
}
