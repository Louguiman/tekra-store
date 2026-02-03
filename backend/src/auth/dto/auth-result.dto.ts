import { User } from '../../entities/user.entity';

export class AuthResultDto {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
  expiresIn: string;
}