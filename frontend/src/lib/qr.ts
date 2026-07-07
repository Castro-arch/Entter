/**
 * Decodes the *unsigned* body of a check-in QR token, purely to look up the
 * participant's name for instant optimistic feedback in the scanner UI.
 *
 * The token is signed with a server-side HMAC secret (`QR_SECRET`) that must
 * never reach the browser — shipping it would let anyone who reads the JS
 * bundle forge valid-looking tokens. So the client only ever reads the
 * unsigned payload; the server performs the real signature check when the
 * scan is submitted (`AttendanceService.checkIn`).
 */
export interface QrPayload {
  /** participant id */
  p: string;
  /** event id */
  e: string;
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return atob(padded);
}

export function decodeQrPayload(token: string): QrPayload | null {
  const [body] = token.split('.');
  if (!body) return null;
  try {
    return JSON.parse(base64UrlDecode(body)) as QrPayload;
  } catch {
    return null;
  }
}
