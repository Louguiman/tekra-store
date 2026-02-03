import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserRole } from '../entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockAuthResult = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: '123',
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '+22370123456',
      role: UserRole.CUSTOMER,
      countryCode: 'ML',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    expiresIn: '24h',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return auth result on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('register', () => {
    it('should return auth result on successful registration', async () => {
      const registerDto: RegisterDto = {
        fullName: 'New User',
        email: 'new@example.com',
        phone: '+22370123457',
        password: 'password123',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('refreshToken', () => {
    it('should return new auth result on token refresh', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockAuthResult);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(result).toEqual(mockAuthResult);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password hash', async () => {
      const mockUser = {
        id: '123',
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '+22370123456',
        role: UserRole.CUSTOMER,
        countryCode: 'ML',
        createdAt: new Date(),
        updatedAt: new Date(),
        orders: [],
        passwordHash: 'should-not-be-returned',
      };

      const result = await controller.getProfile(mockUser as any);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.fullName).toBe('Test User');
    });
  });

  describe('adminTest', () => {
    it('should return admin message for authorized user', async () => {
      const mockUser = {
        id: '123',
        fullName: 'Admin User',
        role: UserRole.ADMIN,
      };

      const result = await controller.adminTest(mockUser as any);

      expect(result).toEqual({
        message: 'Admin access granted',
        user: 'Admin User',
      });
    });
  });
});