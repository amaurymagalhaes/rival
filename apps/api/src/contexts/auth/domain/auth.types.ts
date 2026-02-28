import type { UserRole } from './auth.role';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
};

export type AuthUserWithPassword = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  passwordHash: string;
};

export type RefreshTokenRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  isRevoked: boolean;
  replacedByHash: string | null;
  createdAt: Date;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
