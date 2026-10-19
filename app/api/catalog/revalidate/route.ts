import { createHmac, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const secret = process.env.WP_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ message: 'Webhook is not configured.' }, { status: 503 });
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 262144) { await reader.cancel(); return NextResponse.json({ message: 'Payload too large.' }, { status: 413 }); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const body = Buffer.concat(chunks);
  const signature = request.headers.get('x-wc-webhook-signature') || '';
  const expected = createHmac('sha256', secret).update(body).digest('base64');
  const received = Buffer.from(signature);
  const valid = received.length === Buffer.byteLength(expected) && timingSafeEqual(received, Buffer.from(expected));
  if (!valid) return NextResponse.json({ message: 'Invalid signature.' }, { status: 401 });
  revalidateTag('catalog', 'max');
  return NextResponse.json({ revalidated: true }, { headers: { 'Cache-Control': 'no-store' } });
}
