import type { AuthTokenPort } from '../../domain/auth-token.port';

export class LogoutSessionUseCase {
  constructor(private readonly tokens: AuthTokenPort) {}

  async execute(rawRefreshToken: string) {
    const tokenHash = this.tokens.hashToken(rawRefreshToken);
    const storedToken = await this.tokens.findRefreshToken(tokenHash);

    if (storedToken && !storedToken.isRevoked) {
      await this.tokens.revokeToken(storedToken.id);
    }
  }
}
