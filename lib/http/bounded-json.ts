import 'server-only';

/** Bound private API responses before buffering or parsing them. */
export async function boundedText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing response body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('Response exceeds limit'); }
      chunks.push(part.value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { reader.releaseLock(); }
}

export async function boundedJson(response: Response, maxBytes: number): Promise<unknown> {
  return JSON.parse(await boundedText(response, maxBytes));
}
