import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

dotenv.config();

// Use a consistent fallback for development only.
// In production, JWT_SECRET MUST be set via environment variable.
const DEFAULT_JWT_SECRET = 'your-secret-key-change-in-production';
const DEFAULT_JWT_EXPIRES_IN = '24h' as const;

export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

// jsonwebtoken v9 typings use a template-literal type (StringValue) for expiresIn.
// Env vars are always strings, so we cast to the expected union type.
export const JWT_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? DEFAULT_JWT_EXPIRES_IN;

// Warn if using default secret (security risk)
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.warn(
    'WARNING: JWT_SECRET not set! Using default (INSECURE). Set JWT_SECRET environment variable.'
  );
}
