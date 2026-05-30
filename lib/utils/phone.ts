/**
 * Robust Phone Normalization for Indian Mobile Numbers
 * Ensures consistent synthetic emails and prevents duplicates.
 * 
 * Logic:
 * 1. Strip all non-digit characters.
 * 2. If 10 digits (Standard Indian Mobile), prefix with '91'.
 * 3. If 12 digits starting with '91', return as is.
 * 4. Otherwise, return the stripped digits (Fallback for other lengths/countries).
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null

  // Strip all non-digits (handles '+', '-', ' ', etc.)
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 10) {
    return `91${digits}`
  }

  // If already has country code but with '+' or other chars, it was stripped to 12 digits
  return digits
}

/**
 * Generates the synthetic email used for phone-based auth.
 */
export function getPhoneAuthEmail(normalizedPhone: string): string {
  return `${normalizedPhone}@mobile.mealiez.in`
}
