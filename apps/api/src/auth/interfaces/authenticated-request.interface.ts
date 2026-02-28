import { Request } from 'express';
import type { UserRole } from '../../contexts/auth/domain/auth.role';

export interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; name: string; role: UserRole };
}
