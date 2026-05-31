import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { contentTypeForPath, resolveUploadPath } from '$lib/server/uploads';

export async function GET({ params }) {
  const file = resolveUploadPath(params.path);
  if (!file) error(404, 'Not found');

  try {
    const info = await stat(file);
    if (!info.isFile()) error(404, 'Not found');
  } catch {
    error(404, 'Not found');
  }

  return new Response(createReadStream(file) as unknown as BodyInit, {
    headers: {
      'content-type': contentTypeForPath(file),
      'cache-control': 'public, max-age=31536000, immutable'
    }
  });
}
