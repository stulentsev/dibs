import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from './config';

const maxUploadBytes = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

export async function saveUploadedPhoto(file: File): Promise<string> {
  if (file.size <= 0) {
    throw new Error('Uploaded file is empty.');
  }

  if (file.size > maxUploadBytes) {
    throw new Error('Uploaded file is larger than 5 MB.');
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    throw new Error('Only jpg, png, and webp images are allowed.');
  }

  const originalExt = extname(file.name).toLowerCase();
  if (originalExt && !['.jpg', '.jpeg', '.png', '.webp'].includes(originalExt)) {
    throw new Error('Uploaded file extension is not allowed.');
  }

  const uploadDir = resolve(env('UPLOAD_DIR'));
  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  const destination = resolve(uploadDir, filename);
  if (!destination.startsWith(`${uploadDir}/`)) {
    throw new Error('Invalid upload destination.');
  }

  const data = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, data, { flag: 'wx' });
  return `/uploads/${filename}`;
}

export async function deleteUploadedPhoto(path: string): Promise<void> {
  const file = resolveUploadPath(path.replace(/^\/uploads\//, ''));
  if (!file) return;

  try {
    await unlink(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export function resolveUploadPath(requestPath: string): string | null {
  if (!requestPath || requestPath.includes('\0')) return null;

  const uploadDir = resolve(env('UPLOAD_DIR'));
  const target = resolve(uploadDir, requestPath);
  if (target !== uploadDir && target.startsWith(`${uploadDir}/`)) return target;
  return null;
}

export function contentTypeForPath(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}
