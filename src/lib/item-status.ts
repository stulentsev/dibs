export const statuses = ['draft', 'available', 'claimed', 'sold', 'given_away', 'hidden'] as const;

export type ItemStatus = (typeof statuses)[number];

export function isItemStatus(value: string): value is ItemStatus {
  return (statuses as readonly string[]).includes(value);
}
