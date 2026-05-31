import { env } from './config';

export function contactLabel(): string {
  return env('PUBLIC_CONTACT_LABEL');
}

export function contactUrl(item: { id: number; title: string }): string {
  const siteUrl = env('PUBLIC_SITE_URL').replace(/\/$/, '');
  const itemUrl = `${siteUrl}/items/${item.id}`;
  const template = env('PUBLIC_CONTACT_URL_TEMPLATE');
  const title = encodeURIComponent(item.title);
  const url = encodeURIComponent(itemUrl);

  return template
    .replaceAll('{title}', title)
    .replaceAll('{url}', url)
    .replaceAll('%7Btitle%7D', title)
    .replaceAll('%7Burl%7D', url);
}
