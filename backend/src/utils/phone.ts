/**
 * Phone number utilities for Brazilian phone numbers.
 * 
 * Canonical storage format: E.164 without '+' prefix
 * Example: 5511987654321 (13 digits for mobile, 12 for landline)
 * 
 * WhatsApp/WPPConnect expects: 5511987654321 (no '+' prefix)
 */

/**
 * Brazilian phone number validation regex.
 * Format: 55 + DDD (2 digits) + optional 9 + 8 digits
 * 
 * Valid examples:
 * - 5511987654321 (mobile with 9 - 13 digits)
 * - 551134567890 (landline - 12 digits)
 * 
 * DDD must be 11-99 (first digit cannot be 0)
 */
const BRAZIL_PHONE_REGEX = /^55[1-9][0-9]9?[0-9]{8}$/;

/**
 * Normalize a phone number to E.164 format (without + prefix).
 * 
 * This function handles various input formats:
 * - (11) 98765-4321 → 5511987654321
 * - 11987654321 → 5511987654321
 * - 5511987654321 → 5511987654321
 * - +5511987654321 → 5511987654321
 * 
 * @param input - Phone number in any format
 * @returns Normalized phone number (13 digits for mobile, 12 for landline)
 * @throws Error if phone format is invalid
 */
export function normalizePhone(input: string): string {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  // Remove leading 55 if present for re-normalization
  const phone = digits.startsWith('55') ? digits.slice(2) : digits;
  
  // Validate and normalize based on length
  if (phone.length === 11) {
    // Mobile: DDD (2) + 9 + 8 digits
    // Validate that third digit is 9 (mobile indicator)
    if (phone[2] !== '9') {
      throw new Error(
        `Número de telefone inválido. Celulares devem começar com 9 após o DDD. ` +
        `Formato esperado: (XX) 9XXXX-XXXX`
      );
    }
    // Validate DDD (first 2 digits, must be 11-99)
    const ddd = parseInt(phone.slice(0, 2), 10);
    if (ddd < 11 || ddd > 99) {
      throw new Error(`DDD inválido: ${ddd}. DDDs válidos: 11-99`);
    }
    return '55' + phone;
  }
  
  if (phone.length === 10) {
    // Landline: DDD (2) + 8 digits
    // Validate DDD
    const ddd = parseInt(phone.slice(0, 2), 10);
    if (ddd < 11 || ddd > 99) {
      throw new Error(`DDD inválido: ${ddd}. DDDs válidos: 11-99`);
    }
    return '55' + phone;
  }
  
  throw new Error(
    `Formato de telefone inválido. Esperado: 10 ou 11 dígitos (DDD + número). ` +
    `Recebido: ${phone.length} dígitos. ` +
    `Exemplos válidos: (11) 98765-4321 ou (11) 3456-7890`
  );
}

/**
 * Validate if a phone number is in valid Brazilian format.
 * Accepts both normalized (55...) and raw (without 55) formats.
 * 
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  
  // If already has 55 prefix, validate directly
  if (digits.startsWith('55')) {
    return BRAZIL_PHONE_REGEX.test(digits);
  }
  
  // Otherwise, add 55 and validate
  if (digits.length === 10 || digits.length === 11) {
    return BRAZIL_PHONE_REGEX.test('55' + digits);
  }
  
  return false;
}

/**
 * Format a normalized phone number for display.
 * 
 * Input: 5511987654321 → Output: (11) 98765-4321
 * Input: 551134567890 → Output: (11) 3456-7890
 * 
 * @param phone - Normalized phone number (with 55 prefix)
 * @returns Formatted phone string for display
 */
export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  // Must start with 55
  if (!digits.startsWith('55')) {
    return phone; // Return as-is if not normalized
  }
  
  const withoutCountry = digits.slice(2);
  const ddd = withoutCountry.slice(0, 2);
  const rest = withoutCountry.slice(2);
  
  if (rest.length === 9) {
    // Mobile: 9XXXX-XXXX
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  
  if (rest.length === 8) {
    // Landline: XXXX-XXXX
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  
  // Fallback: return as-is
  return phone;
}

/**
 * Extract digits only from a phone string.
 * Useful for comparison operations.
 * 
 * @param phone - Phone in any format
 * @returns Only the digits
 */
export function extractDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Check if two phone numbers represent the same number.
 * Handles various formats and normalizes before comparing.
 * 
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns true if same number, false otherwise
 */
export function phoneEquals(phone1: string, phone2: string): boolean {
  try {
    const normalized1 = normalizePhone(phone1);
    const normalized2 = normalizePhone(phone2);
    return normalized1 === normalized2;
  } catch {
    // If normalization fails, fall back to digit comparison
    const digits1 = extractDigits(phone1);
    const digits2 = extractDigits(phone2);
    return digits1 === digits2 || 
           `55${digits1}` === digits2 || 
           digits1 === `55${digits2}`;
  }
}

