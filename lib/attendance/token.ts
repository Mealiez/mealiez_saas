import crypto from 'node:crypto';

/*
 * SERVER-ONLY: QR token signing and verification.
 * Never import this in client components or
 * app/(mobile)/ files.
 * Uses ATTENDANCE_QR_SECRET from environment.
 */

export type QRTokenPayload = {
  session_id: string;
  tenant_id: string;
  meal_type: string;
  date: string; // YYYY-MM-DD
  exp: number; // Unix timestamp
};

export type QRTokenResult =
  | { valid: true; payload: QRTokenPayload }
  | { valid: false; reason: string };

const SECRET = process.env.ATTENDANCE_QR_SECRET!;

if (!SECRET) {
  throw new Error(
    'ATTENDANCE_QR_SECRET is not set. ' +
    'Add it to .env.local'
  );
}

/**
 * Signs a string using HMAC-SHA256 and returns a base64url signature.
 */
function sign(data: string): string {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(data);
  return hmac.digest('base64url');
}

/**
 * Encodes a payload into a signed token string.
 * Format: base64url(payload).signature
 */
function encode(payload: QRTokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(data);
  return `${data}.${sig}`;
}

/**
 * Decodes and verifies a token string.
 */
function decode(token: string): QRTokenResult {
  // STEP 1: Split token on '.'
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token' };
  }

  // STEP 2: Verify signature
  const [data, sig] = parts;
  const expectedSig = sign(data);

  const sigBuffer = Buffer.from(sig, 'base64url');
  const expBuffer = Buffer.from(expectedSig, 'base64url');

  // Use timing-safe comparison:
  if (sigBuffer.length !== expBuffer.length) {
    return { valid: false, reason: 'Invalid signature' };
  }

  if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return { valid: false, reason: 'Invalid signature' };
  }

  // STEP 3: Decode payload
  let payload: QRTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8')
    ) as QRTokenPayload;
  } catch {
    return { valid: false, reason: 'Malformed payload' };
  }

  // STEP 4: Check expiry
  if (Date.now() / 1000 > payload.exp) {
    return { valid: false, reason: 'Token expired' };
  }

  // STEP 5: Return valid
  return { valid: true, payload };
}

/**
 * Generates a fresh QR token for a session.
 */
export function generateQRToken(
  sessionId: string,
  tenantId: string,
  mealType: string,
  date: string,
  ttlMinutes: number = 15
): string {
  const payload: QRTokenPayload = {
    session_id: sessionId,
    tenant_id: tenantId,
    meal_type: mealType,
    date: date,
    exp: Math.floor(Date.now() / 1000) + ttlMinutes * 60,
  };
  return encode(payload);
}

/**
 * Verifies a QR token.
 */
export function verifyQRToken(token: string): QRTokenResult {
  return decode(token);
}

/**
 * Regenerate a fresh token for an existing session.
 * Called when admin refreshes the QR on screen.
 */
export function refreshQRToken(
  sessionId: string,
  tenantId: string,
  mealType: string,
  date: string
): string {
  return generateQRToken(sessionId, tenantId, mealType, date, 15);
}
