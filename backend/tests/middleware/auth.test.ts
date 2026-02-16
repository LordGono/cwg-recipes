import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middleware/auth';
import { generateToken, JwtPayload } from '../../src/utils/jwt';

describe('Authentication Middleware', () => {
  const mockPayload: JwtPayload = {
    userId: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    isAdmin: false,
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-middleware-testing';
  });

  const createMockRequest = (token?: string): Partial<Request> => ({
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

  const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    return res;
  };

  const createMockNext = (): NextFunction => vi.fn();

  describe('Valid Token', () => {
    it('should authenticate valid token and set user on request', () => {
      const validToken = generateToken(mockPayload);
      const req = createMockRequest(validToken) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(mockPayload.userId);
      expect(req.user?.username).toBe(mockPayload.username);
      expect(req.user?.email).toBe(mockPayload.email);
      expect(req.user?.isAdmin).toBe(mockPayload.isAdmin);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle admin users correctly', () => {
      const adminPayload: JwtPayload = { ...mockPayload, isAdmin: true };
      const adminToken = generateToken(adminPayload);
      const req = createMockRequest(adminToken) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(req.user?.isAdmin).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Invalid Token', () => {
    it('should reject request with no authorization header', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      const errorArg = (next as any).mock.calls[0][0];
      expect(errorArg).toBeDefined();
      expect(errorArg.statusCode).toBe(401);
    });

    it('should reject request with invalid token format', () => {
      const req = {
        headers: { authorization: 'InvalidFormat' },
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      const errorArg = (next as any).mock.calls[0][0];
      expect(errorArg).toBeDefined();
      expect(errorArg.statusCode).toBe(401);
    });

    it('should reject request with malformed token', () => {
      const req = createMockRequest('invalid.token.here') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      const errorArg = (next as any).mock.calls[0][0];
      expect(errorArg).toBeDefined();
      expect(errorArg.statusCode).toBe(401);
    });

    it('should reject token without Bearer prefix', () => {
      const validToken = generateToken(mockPayload);
      const req = {
        headers: { authorization: validToken }, // Missing "Bearer" prefix
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      const errorArg = (next as any).mock.calls[0][0];
      expect(errorArg).toBeDefined();
      expect(errorArg.statusCode).toBe(401);
    });
  });

  describe('Token Security', () => {
    it('should pass errors to error handler', () => {
      const req = createMockRequest('invalid.token') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      // Verify next was called with an error
      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = (next as any).mock.calls[0][0];
      expect(errorArg).toBeDefined();
      expect(errorArg).toHaveProperty('statusCode');
      expect(errorArg).toHaveProperty('message');
    });
  });
});
