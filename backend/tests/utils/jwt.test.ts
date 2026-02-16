import { describe, it, expect, beforeAll } from 'vitest';
import { generateToken, verifyToken, JwtPayload } from '../../src/utils/jwt';

describe('JWT Utilities', () => {
  const mockPayload: JwtPayload = {
    userId: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    isAdmin: false,
  };

  let validToken: string;

  beforeAll(() => {
    // Set a consistent JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateToken(mockPayload);
      const token2 = generateToken({
        ...mockPayload,
        userId: 'different-user-id',
      });

      expect(token1).not.toBe(token2);
    });

    it('should include all payload data in token', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.isAdmin).toBe(mockPayload.isAdmin);
    });
  });

  describe('verifyToken', () => {
    beforeAll(() => {
      validToken = generateToken(mockPayload);
    });

    it('should verify and decode a valid token', () => {
      const decoded = verifyToken(validToken);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.isAdmin).toBe(mockPayload.isAdmin);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow('Invalid or expired token');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';

      expect(() => verifyToken(malformedToken)).toThrow('Invalid or expired token');
    });

    it('should throw error for empty token', () => {
      expect(() => verifyToken('')).toThrow('Invalid or expired token');
    });
  });

  describe('Token Security', () => {
    it('should not expose secret in token', () => {
      const token = generateToken(mockPayload);
      const parts = token.split('.');

      // Decode payload (middle part)
      const payloadJson = Buffer.from(parts[1], 'base64').toString();

      expect(payloadJson).not.toContain(process.env.JWT_SECRET || '');
    });

    it('should handle admin privileges correctly', () => {
      const adminPayload: JwtPayload = {
        ...mockPayload,
        isAdmin: true,
      };

      const adminToken = generateToken(adminPayload);
      const decoded = verifyToken(adminToken);

      expect(decoded.isAdmin).toBe(true);
    });

    it('should handle non-admin users correctly', () => {
      const userPayload: JwtPayload = {
        ...mockPayload,
        isAdmin: false,
      };

      const userToken = generateToken(userPayload);
      const decoded = verifyToken(userToken);

      expect(decoded.isAdmin).toBe(false);
    });
  });
});
