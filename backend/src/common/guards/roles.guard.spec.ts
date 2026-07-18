import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  const mockContext = (userRole: string, requiredRoles?: string[]) => {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles || null);
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: userRole } }),
      }),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true when no roles required', () => {
      expect(guard.canActivate(mockContext('USER'))).toBe(true);
    });

    it('should return true when user has required role', () => {
      expect(guard.canActivate(mockContext('ADMIN', ['ADMIN']))).toBe(true);
    });

    it('should return true when user has one of multiple roles', () => {
      expect(guard.canActivate(mockContext('MANAGER', ['ADMIN', 'MANAGER']))).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', () => {
      expect(() => guard.canActivate(mockContext('USER', ['ADMIN']))).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with correct message', () => {
      expect(() => guard.canActivate(mockContext('USER', ['ADMIN']))).toThrow('Insufficient permissions');
    });
  });
});
