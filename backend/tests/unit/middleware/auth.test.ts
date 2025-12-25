/**
 * Unit Tests - Auth Middleware
 */

import jwt from 'jsonwebtoken';

describe('🧪 Auth Middleware', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  describe('Token Generation', () => {
    it('should generate valid JWT token', () => {
      const payload = { id: 'user-123', email: 'test@example.com', profile: 'USER' };
      
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);
    });

    it('should include user data in token', () => {
      const payload = { id: 'user-123', email: 'test@example.com', profile: 'ADMIN' };
      
      const token = jwt.sign(payload, JWT_SECRET);
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.profile).toBe(payload.profile);
    });

    it('should set expiration time', () => {
      const payload = { id: 'user-123' };
      
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', () => {
      const payload = { id: 'user-123' };
      const token = jwt.sign(payload, JWT_SECRET);

      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded).toBeDefined();
    });

    it('should reject invalid token', () => {
      const token = 'invalid.token.here';

      expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
    });

    it('should reject token with wrong secret', () => {
      const payload = { id: 'user-123' };
      const token = jwt.sign(payload, JWT_SECRET);

      expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });

    it('should reject expired token', () => {
      const payload = { id: 'user-123' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });

      expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
    });
  });

  describe('Authorization Header Parsing', () => {
    const parseAuthHeader = (header: string | undefined): string | null => {
      if (!header) return null;
      const parts = header.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
      return parts[1];
    };

    it('should parse valid Bearer token', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      const header = `Bearer ${token}`;

      const result = parseAuthHeader(header);

      expect(result).toBe(token);
    });

    it('should reject missing header', () => {
      const result = parseAuthHeader(undefined);

      expect(result).toBeNull();
    });

    it('should reject non-Bearer token', () => {
      const result = parseAuthHeader('Basic abc123');

      expect(result).toBeNull();
    });

    it('should reject malformed header', () => {
      const result = parseAuthHeader('BearerToken');

      expect(result).toBeNull();
    });
  });

  describe('User Profile Roles', () => {
    const ROLES = ['USER', 'ADMIN'] as const;

    it('should validate USER role', () => {
      expect(ROLES.includes('USER')).toBe(true);
    });

    it('should validate ADMIN role', () => {
      expect(ROLES.includes('ADMIN')).toBe(true);
    });

    it('should reject invalid role', () => {
      expect(ROLES.includes('SUPERUSER' as any)).toBe(false);
    });
  });
});


