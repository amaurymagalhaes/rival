import type { AuthGateway, AuthGatewayFailure } from '../domain/auth.gateway';
import type { AuthCredentials, RegisterInput } from '../domain/auth.types';
import {
  hasAuthorizationHeader,
  isValidRefreshToken,
  normalizeAuthCredentials,
  normalizeRefreshToken,
  normalizeRegisterInput,
  validateAuthCredentials,
  validateRegisterInput,
} from '../domain/auth.rules';

export class AuthUseCases {
  constructor(private readonly gateway: AuthGateway) {}

  private invalidInput(message: string, status: number = 400): AuthGatewayFailure {
    return { ok: false, status, message };
  }

  registerUser(payload: RegisterInput) {
    const normalized = normalizeRegisterInput(payload);
    const validationError = validateRegisterInput(normalized);
    if (validationError) {
      return Promise.resolve(this.invalidInput(validationError));
    }

    return this.gateway.register(normalized);
  }

  loginUser(payload: AuthCredentials) {
    const normalized = normalizeAuthCredentials(payload);
    const validationError = validateAuthCredentials(normalized);
    if (validationError) {
      return Promise.resolve(this.invalidInput(validationError));
    }

    return this.gateway.login(normalized);
  }

  refreshTokens(refreshToken: string) {
    if (!isValidRefreshToken(refreshToken)) {
      return Promise.resolve(this.invalidInput('Invalid refresh token'));
    }

    return this.gateway.refresh(normalizeRefreshToken(refreshToken));
  }

  logoutUser(refreshToken: string, headers: Record<string, string>) {
    if (!isValidRefreshToken(refreshToken)) {
      return Promise.resolve(this.invalidInput('Invalid refresh token'));
    }
    if (!hasAuthorizationHeader(headers)) {
      return Promise.resolve(this.invalidInput('Authentication required', 401));
    }

    return this.gateway.logout(normalizeRefreshToken(refreshToken), headers);
  }

  getCurrentUser(headers: Record<string, string>) {
    if (!hasAuthorizationHeader(headers)) {
      return Promise.resolve(this.invalidInput('Authentication required', 401));
    }

    return this.gateway.currentUser(headers);
  }
}
