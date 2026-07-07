import { createHmac, timingSafeEqual } from 'node:crypto';

/** Minimal payload embedded in a participant's QR code. */
export interface QrPayload {
  /** participant id */
  p: string;
  /** event id */
  e: string;
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64url');

/**
 * Compact HMAC-signed token (`<payload>.<signature>`), JWT-like but dependency
 * free. The check-in client verifies the signature locally to show the
 * attendee's name instantly, before the server round-trip.
 */
export function signQrToken(payload: QrPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  const signature = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${signature}`;
}

export function verifyQrToken(token: string, secret: string): QrPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = b64url(createHmac('sha256', secret).update(body).digest());
  const provided = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as QrPayload;
  } catch {
    return null;
  }
}
