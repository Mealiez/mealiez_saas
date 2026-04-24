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

export type MemberQRPayload = {
  user_id: string;
  tenant_id: string;
  issued_at: number; // Unix timestamp
  version: number; // increment on revoke+reissue
  // version prevents old screenshots:
  // admin verifies version matches DB record
};

export type MemberQRVerifyResult =
  | {
      valid: true;
      payload: MemberQRPayload;
    }
  | {
      valid: false;
      reason: string;
    };

const ATTENDANCE_QR_SECRET = process.env.ATTENDANCE_QR_SECRET!;

if (!ATTENDANCE_QR_SECRET) {
  throw new Error(
    'ATTENDANCE_QR_SECRET is not set. ' + 'Add it to .env.local'
  );
}

const MEMBER_QR_SECRET = process.env.MEMBER_QR_SECRET!;

if (!MEMBER_QR_SECRET) {
  throw new Error(
    'MEMBER_QR_SECRET is not set. ' + 'Add it to .env.local'
  );
}

/**
 * Signs a string using HMAC-SHA256 and returns a base64url signature.
 */
function signWith(data: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('base64url');
}

/**
 * Encodes a payload into a signed token string.
 * Format: base64url(payload).signature
 */
function encodeWith(payload: any, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signWith(data, secret);
  return `${data}.${sig}`;
}

/**
 * Decodes and verifies a token string signature.
 */
function decodeWith(token: string, secret: string): { valid: true; payload: any; data: string } | { valid: false; reason: string } {
  // STEP 1: Split token on '.'
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token' };
  }

  // STEP 2: Verify signature
  const [data, sig] = parts;
  const expectedSig = signWith(data, secret);

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
  let payload: any;
  try {
    payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8')
    );
  } catch {
    return { valid: false, reason: 'Malformed payload' };
  }

  return { valid: true, payload, data };
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
  return encodeWith(payload, ATTENDANCE_QR_SECRET);
}

/**
 * Verifies a QR token.
 */
export function verifyQRToken(token: string): QRTokenResult {
  const res = decodeWith(token, ATTENDANCE_QR_SECRET);
  if (!res.valid) return res;

  const payload = res.payload as QRTokenPayload;

  // STEP 4: Check expiry
  if (Date.now() / 1000 > payload.exp) {
    return { valid: false, reason: 'Token expired' };
  }

  return { valid: true, payload };
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

/**
 * Generates a permanent member QR token.
 */
export function generateMemberQRToken(
  userId: string,
  tenantId: string,
  version: number
): string {
  const payload: MemberQRPayload = {
    user_id: userId,
    tenant_id: tenantId,
    issued_at: Math.floor(Date.now() / 1000),
    version,
  };
  return encodeWith(payload, MEMBER_QR_SECRET);
}

/**
 * Verifies a member QR token.
 */
export function verifyMemberQRToken(token: string): MemberQRVerifyResult {
  const res = decodeWith(token, MEMBER_QR_SECRET);
  if (!res.valid) return res;

  return { valid: true, payload: res.payload as MemberQRPayload };
}
