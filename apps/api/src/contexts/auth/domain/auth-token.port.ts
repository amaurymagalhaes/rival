import type { UserRole } from './auth.role';
import type { RefreshTokenRecord } from './auth.types';

export interface AuthTokenPort {
  generateAccessToken(user: {
    id: string;
    email: string;
    role: UserRole;
  }): string;
  generateRefreshToken(): string;
  hashToken(token: string): string;
  saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeToken(id: string, replacedByHash?: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
