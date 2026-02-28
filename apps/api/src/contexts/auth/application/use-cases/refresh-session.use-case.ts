import type { AuthTokenPort } from '../../domain/auth-token.port';
import type { AuthUserRepository } from '../../domain/auth-user.repository';
import {
  InvalidRefreshTokenError,
  RefreshTokenReuseDetectedError,
  UserNotFoundForSessionError,
} from '../../domain/auth.errors';
import { issueTokenPair } from '../issue-token-pair';

export class RefreshSessionUseCase {
  constructor(
    private readonly users: AuthUserRepository,
    private readonly tokens: AuthTokenPort,
  ) {}

  async execute(rawRefreshToken: string) {
    const tokenHash = this.tokens.hashToken(rawRefreshToken);
    const storedToken = await this.tokens.findRefreshToken(tokenHash);

    if (!storedToken) {
      throw new InvalidRefreshTokenError();
    }

    if (storedToken.isRevoked) {
      await this.tokens.revokeAllUserTokens(storedToken.userId);
      throw new RefreshTokenReuseDetectedError(storedToken.userId);
    }

    if (storedToken.expiresAt < new Date()) {
      await this.tokens.revokeToken(storedToken.id);
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(storedToken.userId);
    if (!user) {
      throw new UserNotFoundForSessionError(storedToken.userId);
    }

    const tokenPair = await issueTokenPair(this.tokens, user);
    const newHash = this.tokens.hashToken(tokenPair.refreshToken);

    await this.tokens.revokeToken(storedToken.id, newHash);

    return tokenPair;
  }
}
