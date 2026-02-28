import type { TokenService } from '../../../auth/token.service';
import type { AuthTokenPort } from '../domain/auth-token.port';
import type { UserRole } from '../domain/auth.role';

export class TokenServiceAuthTokenAdapter implements AuthTokenPort {
  constructor(private readonly tokenService: TokenService) {}

  generateAccessToken(user: {
    id: string;
    email: string;
    role: UserRole;
  }): string {
    return this.tokenService.generateAccessToken(user);
  }

  generateRefreshToken(): string {
    return this.tokenService.generateRefreshToken();
  }

  hashToken(token: string): string {
    return this.tokenService.hashToken(token);
  }

  saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    return this.tokenService.saveRefreshToken(userId, tokenHash, expiresAt);
  }

  findRefreshToken(tokenHash: string) {
    return this.tokenService.findRefreshToken(tokenHash);
  }

  revokeToken(id: string, replacedByHash?: string): Promise<void> {
    if (replacedByHash === undefined) {
      return this.tokenService.revokeToken(id);
    }
    return this.tokenService.revokeToken(id, replacedByHash);
  }

  revokeAllUserTokens(userId: string): Promise<void> {
    return this.tokenService.revokeAllUserTokens(userId);
  }
}
