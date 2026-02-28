import type { UserRole } from '../../contexts/auth/domain/auth.role';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
