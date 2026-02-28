import type {
  AuthUser,
  AuthUserWithPassword,
} from './auth.types';

export interface AuthUserRepository {
  create(input: {
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<AuthUser>;
  findByEmailWithPassword(email: string): Promise<AuthUserWithPassword | null>;
  findById(id: string): Promise<AuthUser | null>;
}
