/**
 * Phone number utilities for Brazilian phone numbers (Frontend).
 * 
 * Matches backend format: E.164 without '+' prefix
 * Storage: 5511987654321 (13 digits for mobile, 12 for landline)
 * Display: (11) 98765-4321
 */

/**
 * Format a normalized phone number for display.
 * 
 * Input: 5511987654321 → Output: (11) 98765-4321
 * Input: 551134567890 → Output: (11) 3456-7890
 * Input: (11) 98765-4321 → Output: (11) 98765-4321 (unchanged)
 * 
 * @param phone - Phone number (normalized or already formatted)
 * @returns Formatted phone string for display
 */
export const formatPhoneForDisplay = (phone: string): string => {
  if (!phone) return '';
  
  // If already formatted with parentheses and hyphen, return as-is
  if (phone.includes('(') && phone.includes(')') && phone.includes('-')) {
    return phone;
  }
  
  const digits = phone.replace(/\D/g, '');
  
  // Must start with 55 for normalized format
  if (!digits.startsWith('55')) {
    // Try to format without country code
    if (digits.length === 11) {
      // Mobile: DDD + 9 + 8 digits
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      // Landline: DDD + 8 digits
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone; // Return as-is if can't format
  }
  
  const withoutCountry = digits.slice(2);
  const ddd = withoutCountry.slice(0, 2);
  const rest = withoutCountry.slice(2);
  
  if (rest.length === 9) {
    // Mobile: 9XXXX-XXXX (13 total: 55 + 2 DDD + 9 number)
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  
  if (rest.length === 8) {
    // Landline: XXXX-XXXX (12 total: 55 + 2 DDD + 8 number)
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  
  // Fallback: return as-is
  return phone;
};

/**
 * Remove formatting from a phone number, keeping only digits.
 * 
 * @param phone - Formatted phone string
 * @returns Only digits
 */
export const extractPhoneDigits = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Validate if a phone input looks like a valid Brazilian phone.
 * This is a frontend-only check; the backend does strict validation.
 * 
 * @param phone - Phone in any format
 * @returns true if looks valid
 */
export const isValidPhoneInput = (phone: string): boolean => {
  const digits = extractPhoneDigits(phone);
  
  // After extracting digits, should have 10-11 (without 55) or 12-13 (with 55)
  if (digits.startsWith('55')) {
    return digits.length === 12 || digits.length === 13;
  }
  
  return digits.length === 10 || digits.length === 11;
};

/**
 * Get a phone mask pattern based on number of digits entered.
 * Useful for dynamic masking.
 * 
 * @returns InputMask pattern for Brazilian phones
 */
export const getPhoneMask = (): string => {
  // Standard Brazilian mobile format: (XX) 9XXXX-XXXX
  return '(99) 99999-9999';
};
