import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { env } from './config';

const maxUploadBytes = 25 * 1024 * 1024;
const maxOutputDimension = 1600;
const maxInputPixels = 60_000_000;
const outputExtension = '.webp';
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function saveUploadedPhoto(file: File): Promise<string> {
  if (file.size <= 0) {
    throw new Error('Uploaded file is empty.');
  }

  if (file.size > maxUploadBytes) {
    throw new Error('Uploaded file is larger than 25 MB.');
  }

  if (!allowedTypes.has(file.type)) {
    throw new Error('Only jpg, png, and webp images are allowed.');
  }

  const originalExt = extname(file.name).toLowerCase();
  if (originalExt && !['.jpg', '.jpeg', '.png', '.webp'].includes(originalExt)) {
    throw new Error('Uploaded file extension is not allowed.');
  }

  const uploadDir = resolve(env('UPLOAD_DIR'));
  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}${outputExtension}`;
  const destination = resolve(uploadDir, filename);
  if (!destination.startsWith(`${uploadDir}/`)) {
    throw new Error('Invalid upload destination.');
  }

  const data = Buffer.from(await file.arrayBuffer());
  let resized: Buffer;
  try {
    resized = await sharp(data, { limitInputPixels: maxInputPixels })
      .rotate()
      .resize({
        width: maxOutputDimension,
        height: maxOutputDimension,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch {
    throw new Error('Uploaded image could not be processed.');
  }

  await writeFile(destination, resized, { flag: 'wx' });
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
