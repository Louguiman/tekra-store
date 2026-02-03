import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminAuthController } from './admin-auth.controller';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { SecurityAlert } from '../entities/security-alert.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { AuditService } from '../audit/audit.service';
import { SecurityMonitorService } from '../audit/security-monitor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuditLog, SecurityAlert]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'fallback-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, AuditService, SecurityMonitorService],
  exports: [AuthService],
})
export class AuthModule {}