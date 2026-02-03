import { UserRole } from '../../entities/user.entity';

export interface JwtPayload {
  sub: string; // user id
  email?: string;
  phone: string;
  role: UserRole;
  countryCode?: string;
  iat?: number;
  exp?: number;
}