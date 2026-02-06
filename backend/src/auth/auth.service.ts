import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResultDto } from './dto/auth-result.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';
import { SecurityMonitorService } from '../audit/security-monitor.service';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly securityMonitor: SecurityMonitorService,
  ) {}

  async validateUser(identifier: string, password: string): Promise<User | null> {
    // Find user by email or phone
    const user = await this.userRepository.findOne({
      where: [
        { email: identifier },
        { phone: identifier },
      ],
    });

    if (!user) {
      console.log(`[Auth] User not found: ${identifier}`);
      return null;
    }

    if (!user.passwordHash) {
      console.log(`[Auth] User has no password hash: ${identifier}`);
      return null;
    }

    console.log(`[Auth] Validating password for user: ${identifier} (role: ${user.role})`);
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      console.log(`[Auth] Invalid password for user: ${identifier}`);
      return null;
    }

    console.log(`[Auth] Password valid for user: ${identifier}`);
    return user;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResultDto> {
    const { email, phone, password } = loginDto;
    
    if (!email && !phone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const identifier = email || phone;
    const user = await this.validateUser(identifier, password);

    if (!user) {
      // Log failed login attempt
      await this.auditService.logAction({
        action: AuditAction.LOGIN,
        resource: AuditResource.AUTH,
        severity: AuditSeverity.MEDIUM,
        description: 'Failed login attempt',
        metadata: {
          identifier,
          reason: 'Invalid credentials',
        },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid credentials',
      });

      // Check for suspicious login patterns
      await this.securityMonitor.checkFailedLoginAttempts(ipAddress);

      throw new UnauthorizedException('Invalid credentials');
    }

    // Log successful login
    await this.auditService.logAction({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: AuditResource.AUTH,
      severity: AuditSeverity.LOW,
      description: 'Successful login',
      metadata: {
        userRole: user.role,
        countryCode: user.countryCode,
      },
      ipAddress,
      userAgent,
      success: true,
    });

    // Check for unusual activity patterns
    if (ipAddress && userAgent) {
      await this.securityMonitor.checkUnusualActivity(user.id, ipAddress, userAgent);
    }

    return this.generateTokens(user);
  }

  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<AuthResultDto> {
    const { fullName, email, phone, password, role = UserRole.CUSTOMER, countryCode } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        ...(email ? [{ email }] : []),
        { phone },
      ],
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      fullName,
      email,
      phone,
      passwordHash,
      role,
      countryCode,
    });

    const savedUser = await this.userRepository.save(user);

    // Log user registration
    await this.auditService.logAction({
      userId: savedUser.id,
      action: AuditAction.CREATE,
      resource: AuditResource.USER,
      severity: AuditSeverity.LOW,
      description: 'User registration',
      metadata: {
        userRole: role,
        countryCode,
        registrationMethod: email ? 'email' : 'phone',
      },
      ipAddress,
      userAgent,
      success: true,
    });

    return this.generateTokens(savedUser);
  }

  async refreshToken(refreshToken: string): Promise<AuthResultDto> {
    try {
      const payload = this.jwtService.verify(refreshToken) as JwtPayload;
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token) as JwtPayload;
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async generateTokens(user: User): Promise<AuthResultDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      countryCode: user.countryCode,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Remove password hash from user object
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
      expiresIn: '24h',
    };
  }
}