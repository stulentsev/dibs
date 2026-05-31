import type { ItemStatus } from './item-status';

export function formatPrice(item: { isFree: boolean; priceCents: number | null }): string {
  if (item.isFree) return 'Free';
  if (item.priceCents === null) return 'Ask';

  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: item.priceCents % 100 === 0 ? 0 : 2
  }).format(item.priceCents / 100);
}

export function formatStatus(status: ItemStatus): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
