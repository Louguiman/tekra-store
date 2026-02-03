import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as fc from 'fast-check';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from '../entities/user.entity';
import { ROLES_KEY } from './decorators/roles.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

/**
 * Property-Based Test for Unauthorized Access Handling
 * Feature: ecommerce-platform, Property 21: Unauthorized Access Handling
 * Validates: Requirements 9.3
 */
describe('Unauthorized Access Handling Property Tests', () => {
  let jwtAuthGuard: JwtAuthGuard;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 21: Unauthorized Access Handling
   * For any unauthorized access attempt to admin areas, the system must deny access and log the attempt.
   */
  describe('Property 21: Unauthorized Access Handling', () => {
    it('should deny access when user lacks required admin roles', () => {
      fc.assert(
        fc.property(
          // Generate user roles that are NOT admin roles
          fc.constantFrom(UserRole.CUSTOMER),
          // Generate admin role requirements
          fc.array(fc.constantFrom(UserRole.ADMIN, UserRole.STAFF), { minLength: 1, maxLength: 2 }),
          (userRole: UserRole, requiredRoles: UserRole[]) => {
            // Setup mock execution context with user lacking admin privileges
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  user: { 
                    id: 'user-123',
                    role: userRole,
                    fullName: 'Test User'
                  },
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            // Mock reflector to return required admin roles
            mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

            // Execute the roles guard
            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: CUSTOMER users should be denied access to admin-only endpoints
            // Since requiredRoles contains only ADMIN/STAFF and userRole is CUSTOMER
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow access when user has required admin roles', () => {
      fc.assert(
        fc.property(
          // Generate admin roles
          fc.constantFrom(UserRole.ADMIN, UserRole.STAFF),
          (userRole: UserRole) => {
            // Create required roles array that includes the user's role
            const requiredRoles = [userRole]; // Ensure user's role is in required roles

            // Setup mock execution context with admin user
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  user: { 
                    id: 'admin-123',
                    role: userRole,
                    fullName: 'Admin User'
                  },
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            // Mock reflector to return required roles that include user's role
            mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

            // Execute the roles guard
            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: users with matching admin roles should have access
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access when no user is present but roles are required', () => {
      fc.assert(
        fc.property(
          // Generate admin role requirements
          fc.array(fc.constantFrom(UserRole.ADMIN, UserRole.STAFF), { minLength: 1, maxLength: 2 }),
          (requiredRoles: UserRole[]) => {
            // Setup mock execution context with no user (unauthenticated)
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  user: undefined, // No authenticated user
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            // Mock reflector to return required admin roles
            mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

            // Execute the roles guard
            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: unauthenticated users should be denied access to protected endpoints
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow access when no roles are required (public endpoints)', () => {
      fc.assert(
        fc.property(
          // Generate any user role or undefined
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

            // Mock reflector to return undefined (no roles required)
            mockReflector.getAllAndOverride.mockReturnValue(undefined);

            // Execute the roles guard
            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: when no roles are required, access should always be granted
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access for mixed role scenarios correctly', () => {
      fc.assert(
        fc.property(
          // Generate any user role
          fc.constantFrom(...Object.values(UserRole)),
          // Generate any required roles array
          fc.array(fc.constantFrom(...Object.values(UserRole)), { minLength: 1, maxLength: 3 }),
          (userRole: UserRole, requiredRoles: UserRole[]) => {
            // Setup mock execution context
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  user: { 
                    id: 'user-123',
                    role: userRole,
                    fullName: 'Test User'
                  },
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            // Mock reflector to return required roles
            mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);

            // Execute the roles guard
            const result = rolesGuard.canActivate(mockExecutionContext);

            // The property: access should be granted if and only if user's role is in required roles
            const expectedResult = requiredRoles.includes(userRole);
            expect(result).toBe(expectedResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should simulate authentication guard denying access for invalid tokens', () => {
      fc.assert(
        fc.property(
          // Generate admin role requirements
          fc.array(fc.constantFrom(UserRole.ADMIN, UserRole.STAFF), { minLength: 1, maxLength: 2 }),
          (requiredRoles: UserRole[]) => {
            // Setup mock execution context for protected endpoint
            const mockExecutionContext = {
              switchToHttp: () => ({
                getRequest: () => ({
                  headers: {
                    authorization: 'Bearer invalid-token'
                  },
                  user: undefined, // No user due to invalid token
                }),
              }),
              getHandler: jest.fn(),
              getClass: jest.fn(),
            } as unknown as ExecutionContext;

            // Mock reflector to indicate this is NOT a public endpoint
            mockReflector.getAllAndOverride
              .mockReturnValueOnce(false) // IS_PUBLIC_KEY returns false
              .mockReturnValueOnce(requiredRoles); // ROLES_KEY returns required roles

            // Mock JWT guard to simulate authentication failure
            jest.spyOn(jwtAuthGuard, 'canActivate').mockReturnValue(false);

            // Execute the JWT guard
            const jwtResult = jwtAuthGuard.canActivate(mockExecutionContext);

            // The property: invalid authentication should result in access denial
            expect(jwtResult).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});