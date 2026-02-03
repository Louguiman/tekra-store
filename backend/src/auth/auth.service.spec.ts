import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '+22370123456',
    passwordHash: '$2b$12$hashedpassword',
    role: UserRole.CUSTOMER,
    countryCode: 'ML',
    createdAt: new Date(),
    updatedAt: new Date(),
    orders: [],
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: [
          { email: 'test@example.com' },
          { phone: 'test@example.com' },
        ],
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password',
    };

    it('should return auth result when login is successful', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw BadRequestException when neither email nor phone provided', async () => {
      const invalidLoginDto: LoginDto = {
        password: 'password',
      };

      await expect(service.login(invalidLoginDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      fullName: 'New User',
      email: 'new@example.com',
      phone: '+22370123457',
      password: 'password123',
    };

    it('should create user and return auth result', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // No existing user
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('should return user when token is valid', async () => {
      const mockPayload = { sub: mockUser.id };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateToken('valid-token');

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // Edge case tests for authentication
  describe('Authentication Edge Cases', () => {
    describe('Invalid Credentials', () => {
      it('should throw UnauthorizedException for non-existent email', async () => {
        const loginDto: LoginDto = {
          email: 'nonexistent@example.com',
          password: 'password',
        };

        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: [
            { email: 'nonexistent@example.com' },
            { phone: 'nonexistent@example.com' },
          ],
        });
      });

      it('should throw UnauthorizedException for non-existent phone', async () => {
        const loginDto: LoginDto = {
          phone: '+22370999999',
          password: 'password',
        };

        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: [
            { email: '+22370999999' },
            { phone: '+22370999999' },
          ],
        });
      });

      it('should throw UnauthorizedException for wrong password', async () => {
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'wrongpassword',
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

        await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException for user without password hash', async () => {
        const userWithoutPassword = { ...mockUser, passwordHash: null };
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'password',
        };

        mockUserRepository.findOne.mockResolvedValue(userWithoutPassword);

        await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      });

      it('should throw BadRequestException when both email and phone are missing', async () => {
        const loginDto: LoginDto = {
          password: 'password',
        };

        await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
        expect(mockUserRepository.findOne).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when both email and phone are empty strings', async () => {
        const loginDto: LoginDto = {
          email: '',
          phone: '',
          password: 'password',
        };

        await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
        expect(mockUserRepository.findOne).not.toHaveBeenCalled();
      });
    });

    describe('Expired Tokens', () => {
      it('should throw UnauthorizedException when access token is expired', async () => {
        const expiredTokenError = new Error('TokenExpiredError');
        expiredTokenError.name = 'TokenExpiredError';
        mockJwtService.verify.mockImplementation(() => {
          throw expiredTokenError;
        });

        await expect(service.validateToken('expired-token')).rejects.toThrow(UnauthorizedException);
        expect(mockJwtService.verify).toHaveBeenCalledWith('expired-token');
      });

      it('should throw UnauthorizedException when refresh token is expired', async () => {
        const expiredTokenError = new Error('TokenExpiredError');
        expiredTokenError.name = 'TokenExpiredError';
        mockJwtService.verify.mockImplementation(() => {
          throw expiredTokenError;
        });

        await expect(service.refreshToken('expired-refresh-token')).rejects.toThrow(UnauthorizedException);
        expect(mockJwtService.verify).toHaveBeenCalledWith('expired-refresh-token');
      });

      it('should throw UnauthorizedException when token payload is malformed', async () => {
        const malformedPayload = { invalid: 'payload' }; // Missing 'sub' field
        mockJwtService.verify.mockReturnValue(malformedPayload);
        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(service.validateToken('malformed-token')).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException when user in token payload no longer exists', async () => {
        const validPayload = { sub: 'non-existent-user-id' };
        mockJwtService.verify.mockReturnValue(validPayload);
        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(service.validateToken('valid-token-deleted-user')).rejects.toThrow(UnauthorizedException);
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'non-existent-user-id' },
        });
      });

      it('should throw UnauthorizedException when refresh token user no longer exists', async () => {
        const validPayload = { sub: 'non-existent-user-id' };
        mockJwtService.verify.mockReturnValue(validPayload);
        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(service.refreshToken('valid-refresh-token-deleted-user')).rejects.toThrow(UnauthorizedException);
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'non-existent-user-id' },
        });
      });
    });

    describe('Password Security Edge Cases', () => {
      it('should handle bcrypt comparison errors gracefully', async () => {
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'password',
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);
        jest.spyOn(bcrypt, 'compare').mockImplementation(() => {
          throw new Error('Bcrypt error');
        });

        await expect(service.login(loginDto)).rejects.toThrow();
      });

      it('should handle bcrypt hashing errors during registration', async () => {
        const registerDto: RegisterDto = {
          fullName: 'New User',
          email: 'new@example.com',
          phone: '+22370123457',
          password: 'password123',
        };

        mockUserRepository.findOne.mockResolvedValue(null);
        jest.spyOn(bcrypt, 'hash').mockImplementation(() => {
          throw new Error('Bcrypt hashing error');
        });

        await expect(service.register(registerDto)).rejects.toThrow();
      });

      it('should handle very long passwords during login', async () => {
        const longPassword = 'a'.repeat(1000);
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: longPassword,
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

        await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        expect(bcrypt.compare).toHaveBeenCalledWith(longPassword, mockUser.passwordHash);
      });

      it('should handle special characters in passwords', async () => {
        const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: specialPassword,
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
        mockJwtService.sign.mockReturnValue('mock-token');

        const result = await service.login(loginDto);

        expect(result).toHaveProperty('accessToken');
        expect(bcrypt.compare).toHaveBeenCalledWith(specialPassword, mockUser.passwordHash);
      });
    });

    describe('Database Connection Edge Cases', () => {
      it('should handle database connection errors during login', async () => {
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'password',
        };

        mockUserRepository.findOne.mockRejectedValue(new Error('Database connection error'));

        await expect(service.login(loginDto)).rejects.toThrow('Database connection error');
      });

      it('should handle database connection errors during registration', async () => {
        const registerDto: RegisterDto = {
          fullName: 'New User',
          email: 'new@example.com',
          phone: '+22370123457',
          password: 'password123',
        };

        mockUserRepository.findOne.mockRejectedValue(new Error('Database connection error'));

        await expect(service.register(registerDto)).rejects.toThrow('Database connection error');
      });

      it('should handle database save errors during registration', async () => {
        const registerDto: RegisterDto = {
          fullName: 'New User',
          email: 'new@example.com',
          phone: '+22370123457',
          password: 'password123',
        };

        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockReturnValue(mockUser);
        mockUserRepository.save.mockRejectedValue(new Error('Database save error'));
        jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);

        await expect(service.register(registerDto)).rejects.toThrow('Database save error');
      });
    });

    describe('JWT Service Edge Cases', () => {
      it('should handle JWT signing errors during token generation', async () => {
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'password',
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
        mockJwtService.sign.mockImplementation(() => {
          throw new Error('JWT signing error');
        });

        await expect(service.login(loginDto)).rejects.toThrow('JWT signing error');
      });

      it('should handle malformed JWT tokens', async () => {
        mockJwtService.verify.mockImplementation(() => {
          throw new Error('JsonWebTokenError');
        });

        await expect(service.validateToken('malformed.jwt.token')).rejects.toThrow(UnauthorizedException);
      });

      it('should handle empty or null tokens', async () => {
        await expect(service.validateToken('')).rejects.toThrow(UnauthorizedException);
        await expect(service.validateToken(null as any)).rejects.toThrow(UnauthorizedException);
        await expect(service.refreshToken('')).rejects.toThrow(UnauthorizedException);
        await expect(service.refreshToken(null as any)).rejects.toThrow(UnauthorizedException);
      });
    });
  });
});