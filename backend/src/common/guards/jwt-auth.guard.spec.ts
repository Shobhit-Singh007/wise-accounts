import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new JwtAuthGuard(reflector);
  });

  const mockContext = (isPublic = false) => {
    reflector.getAllAndOverride.mockReturnValue(isPublic);
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: null }),
      }),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      const context = mockContext(true);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should call super.canActivate for non-public routes', () => {
      const context = mockContext(false);
      const superSpy = jest.spyOn(JwtAuthGuard.prototype as any, 'canActivate').mockReturnValue(false);
      guard.canActivate(context);
      expect(superSpy).toHaveBeenCalled();
    });
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException when no user', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with custom message', () => {
      expect(() => guard.handleRequest(null, null)).toThrow('Invalid or expired token');
    });

    it('should throw original error if provided', () => {
      const err = new Error('Custom error');
      expect(() => guard.handleRequest(err, null)).toThrow('Custom error');
    });

    it('should return user when valid', () => {
      const user = { id: 'u1', role: 'ADMIN' };
      expect(guard.handleRequest(null, user)).toEqual(user);
    });
  });
});
