import crypto from 'node:crypto';

/*
 * PRODUCTION-GRADE CRYPTOGRAPHIC TOKEN MANAGEMENT
 *
 * This module handles the signing and verification of high-integrity tokens.
 *
 * ARCHITECTURAL CONSTRAINTS:
 *
 * 1. Build-Time Safety:
 *    Cryptographic secrets are loaded lazily inside utility functions. This prevents 
 *    the module from throwing errors or leaking information during Next.js static 
 *    analysis or build-time evaluation.
 *
 * 2. Node-Native Dependencies:
 *    Uses 'node:crypto' for HMAC-SHA256 and constant-time comparisons. Callers
 *    must be executed in a Node.js runtime environment (export const runtime = 'nodejs').
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

/**
 * getSecrets()
 * Lazy loader for cryptographic secrets. Prevents build-time crashes.
 */
function getSecrets() {
  const attendance = process.env['ATTENDANCE_QR_SECRET'];
  const member = process.env['MEMBER_QR_SECRET'];

  if (!attendance || !member) {
    throw new Error('SECURITY CONFIGURATION ERROR: Cryptographic secrets are missing.');
  }

  return { attendance, member };
}

/**
 * signWith()
 * Signs a string using HMAC-SHA256 and returns a base64url signature.
 */
function signWith(data: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('base64url');
}

/**
 * encodeWith()
 * Encodes a payload into a signed token string.
 */
function encodeWith(payload: unknown, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signWith(data, secret);
  return `${data}.${sig}`;
}

/**
 * decodeWith()
 * Decodes and verifies a token string signature using timingSafeEqual.
 */
function decodeWith(token: string, secret: string): { valid: true; payload: unknown; data: string } | { valid: false; reason: string } {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token' };
  }

  const [data, sig] = parts;
  const expectedSig = signWith(data, secret);

  const sigBuffer = Buffer.from(sig, 'base64url');
  const expBuffer = Buffer.from(expectedSig, 'base64url');

  if (sigBuffer.length !== expBuffer.length) {
    return { valid: false, reason: 'Invalid signature' };
  }

  if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return { valid: false, reason: 'Invalid signature' };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'Malformed payload' };
  }

  return { valid: true, payload, data };
}

/**
 * generateQRToken()
 * Generates a fresh QR token for a session.
 */
export function generateQRToken(
  sessionId: string,
  tenantId: string,
  mealType: string,
  date: string,
  ttlMinutes: number = 15
): string {
  const { attendance: secret } = getSecrets();
  const payload: QRTokenPayload = {
    session_id: sessionId,
    tenant_id: tenantId,
    meal_type: mealType,
    date: date,
    exp: Math.floor(Date.now() / 1000) + ttlMinutes * 60,
  };
  return encodeWith(payload, secret);
}

/**
 * verifyQRToken()
 * Verifies a short-lived QR token.
 */
export function verifyQRToken(token: string): QRTokenResult {
  const { attendance: secret } = getSecrets();
  const res = decodeWith(token, secret);
  if (!res.valid) return res;

  const payload = res.payload as QRTokenPayload;

  if (Date.now() / 1000 > payload.exp) {
    return { valid: false, reason: 'Token expired' };
  }

  return { valid: true, payload };
}

/**
 * refreshQRToken()
 * Regenerate a fresh token for an existing session.
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
 * generateMemberQRToken()
 * Generates a permanent member QR token.
 */
export function generateMemberQRToken(
  userId: string,
  tenantId: string,
  version: number
): string {
  const { member: secret } = getSecrets();
  const payload: MemberQRPayload = {
    user_id: userId,
    tenant_id: tenantId,
    issued_at: Math.floor(Date.now() / 1000),
    version,
  };
  return encodeWith(payload, secret);
}

/**
 * verifyMemberQRToken()
 * Verifies a high-integrity member QR token.
 */
export function verifyMemberQRToken(token: string): MemberQRVerifyResult {
  const { member: secret } = getSecrets();
  const res = decodeWith(token, secret);
  if (!res.valid) return res;

  return { valid: true, payload: res.payload as MemberQRPayload };
}
