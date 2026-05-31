import { isItemStatus, type ItemStatus } from '../item-status';
import type { NewItem } from './db/schema';

export type ItemFormResult =
  | { ok: true; values: NewItem }
  | { ok: false; errors: string[]; values: Record<string, FormDataEntryValue> };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(form: FormData, name: string): string | null {
  const value = text(form, name);
  return value.length ? value : null;
}

function parsePriceCents(form: FormData, isFree: boolean, errors: string[]): number | null {
  if (isFree) return null;
  const raw = text(form, 'price');
  if (!raw) return null;
  const amount = Number(raw);

  if (!Number.isFinite(amount) || amount < 0) {
    errors.push('Price must be a positive number.');
    return null;
  }

  return Math.round(amount * 100);
}

export function parseItemForm(form: FormData): ItemFormResult {
  const errors: string[] = [];
  const title = text(form, 'title');
  const description = text(form, 'description');
  const isFree = form.get('is_free') === 'on';
  const rawStatus = text(form, 'status');

  if (!title) errors.push('Title is required.');
  if (title.length > 180) errors.push('Title must be 180 characters or less.');
  if (!description) errors.push('Description is required.');
  if (!isItemStatus(rawStatus)) errors.push('Status is invalid.');

  const values: NewItem = {
    title,
    description,
    isFree,
    priceCents: parsePriceCents(form, isFree, errors),
    status: (isItemStatus(rawStatus) ? rawStatus : 'draft') as ItemStatus,
    category: nullableText(form, 'category'),
    pickupNotes: nullableText(form, 'pickup_notes'),
    published: form.get('published') === 'on'
  };

  if (values.category && values.category.length > 120) {
    errors.push('Category must be 120 characters or less.');
  }

  if (errors.length) {
    return { ok: false, errors, values: Object.fromEntries(form.entries()) };
  }

  return { ok: true, values };
}

export function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
