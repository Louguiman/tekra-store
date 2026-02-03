import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as fc from 'fast-check';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from '../entities/user.entity';
import { ROLES_KEY } from './decorators/roles.decorator';

/**
 * Property-Based Test for Role-Based Access Control
 * Feature: ecommerce-platform, Property 20: Role-Based Access Control
 * Validates: Requirements 9.2
 */
describe('Role-Based Access Control Property Tests', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 20: Role-Based Access Control
   * For any user attempting to access admin functionality, the system must verify their role 
   * and grant access only to authorized functions based on their role level.
   */
  describe('Property 20: Role-Based Access Control', () => {
    it('should grant access only when user role matches required roles', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary user roles
          fc.constantFrom(...Object.values(UserRole)),
          // Generate arbitrary required roles (array of 1-3 roles)
          fc.array(fc.constantFrom(...Object.values(UserRole)), { minLength: 1, maxLength: 3 }),
          (userRole: UserRole, requiredRoles: UserRole[]) => {
            // Setup mock execution context
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  user: { role: userRole },
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            // Mock reflector to return the required roles
            mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

            // Execute the guard
            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: access should be granted if and only if the user's role is in the required roles
            const expectedResult = requiredRoles.includes(userRole);
            
            expect(result).toBe(expectedResult);
            expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
              mockExecutionContext.getHandler(),
              mockExecutionContext.getClass(),
            ]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow access when no roles are required', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary user roles (including undefined to test missing user)
          fc.option(fc.constantFrom(...Object.values(UserRole)), { nil: undefined }),
          (userRole: UserRole | undefined) => {
            // Setup mock execution context
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  user: userRole ? { role: userRole } : undefined,
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            // Mock reflector to return no required roles (undefined or null)
            mockReflector.getAllAndOverride.mockReturnValue(undefined);

            // Execute the guard
            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: when no roles are required, access should always be granted
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access when user is missing but roles are required', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary required roles (non-empty array)
          fc.array(fc.constantFrom(...Object.values(UserRole)), { minLength: 1, maxLength: 3 }),
          (requiredRoles: UserRole[]) => {
            // Setup mock execution context with missing user
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  user: undefined,
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            // Mock reflector to return the required roles
            mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

            // Execute the guard
            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: when roles are required but user is missing, access should be denied
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle role hierarchy correctly for admin functions', () => {
      fc.assert(
        fc.property(
          // Generate test scenarios with different role combinations
          fc.constantFrom(...Object.values(UserRole)),
          (userRole: UserRole) => {
            // Test admin-only functionality
            const adminOnlyRoles = [UserRole.ADMIN];
            
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  user: { role: userRole },
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            mockReflector.getAllAndOverride.mockReturnValue(adminOnlyRoles);

            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: only ADMIN role should have access to admin-only functions
            const expectedResult = userRole === UserRole.ADMIN;
            expect(result).toBe(expectedResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple allowed roles correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(UserRole)),
          (userRole: UserRole) => {
            // Test admin and staff functionality
            const adminStaffRoles = [UserRole.ADMIN, UserRole.STAFF];
            
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  user: { role: userRole },
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            mockReflector.getAllAndOverride.mockReturnValue(adminStaffRoles);

            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: ADMIN and STAFF roles should have access, CUSTOMER should not
            const expectedResult = userRole === UserRole.ADMIN || userRole === UserRole.STAFF;
            expect(result).toBe(expectedResult);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});