import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  USER_ROLES,
  type UserRole,
} from '../../contexts/auth/domain/auth.role';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockContext = (role: UserRole): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'u1', email: 'a@b.com', role } }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows access when no @Roles() decorator is set (fail-open)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(mockContext(USER_ROLES.USER))).toBe(true);
  });

  it('allows access when user role matches required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([USER_ROLES.ADMIN]);

    expect(guard.canActivate(mockContext(USER_ROLES.ADMIN))).toBe(true);
  });

  it('denies access when user role does not match required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([USER_ROLES.ADMIN]);

    expect(() => guard.canActivate(mockContext(USER_ROLES.USER))).toThrow(
      ForbiddenException,
    );
  });

  it('allows access when user role matches one of multiple required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([USER_ROLES.USER, USER_ROLES.ADMIN]);

    expect(guard.canActivate(mockContext(USER_ROLES.USER))).toBe(true);
  });
});
