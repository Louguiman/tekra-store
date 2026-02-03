import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserRole } from '../entities/user.entity';

@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async adminLogin(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    
    // Verify user has admin or staff role
    if (result.user.role !== UserRole.ADMIN && result.user.role !== UserRole.STAFF) {
      throw new UnauthorizedException('Access denied. Admin or staff role required.');
    }

    return result;
  }

  @Post('refresh')
  async adminRefreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    
    // Verify user still has admin or staff role
    if (result.user.role !== UserRole.ADMIN && result.user.role !== UserRole.STAFF) {
      throw new UnauthorizedException('Access denied. Admin or staff role required.');
    }

    return result;
  }

  @Get('validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async validateAdminToken(@Request() req) {
    // Return user info without password hash
    const { passwordHash, ...user } = req.user;
    return user;
  }
}