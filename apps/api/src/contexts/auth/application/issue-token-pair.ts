import type { AuthTokenPort } from '../domain/auth-token.port';
import type { UserRole } from '../domain/auth.role';
import type { TokenPair } from '../domain/auth.types';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export async function issueTokenPair(
  tokenPort: AuthTokenPort,
  user: { id: string; email: string; role: UserRole },
): Promise<TokenPair> {
  const accessToken = tokenPort.generateAccessToken(user);
  const refreshToken = tokenPort.generateRefreshToken();
  const hashedRefreshToken = tokenPort.hashToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await tokenPort.saveRefreshToken(user.id, hashedRefreshToken, expiresAt);

  return { accessToken, refreshToken };
}
