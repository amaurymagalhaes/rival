import type { AuthCredentials, RegisterInput } from './auth.types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeAuthCredentials(
  payload: AuthCredentials,
): AuthCredentials {
  return {
    email: normalizeEmail(payload.email),
    password: payload.password,
  };
}

export function normalizeRegisterInput(payload: RegisterInput): RegisterInput {
  const normalized: RegisterInput = normalizeAuthCredentials(payload);
  const name = payload.name?.trim();
  if (name) {
    normalized.name = name;
  }
  return normalized;
}

export function validateAuthCredentials(payload: AuthCredentials): string | null {
  if (!EMAIL_REGEX.test(payload.email)) {
    return 'Please provide a valid email address';
  }

  if (payload.password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }

  return null;
}

export function validateRegisterInput(payload: RegisterInput): string | null {
  const credentialsError = validateAuthCredentials(payload);
  if (credentialsError) {
    return credentialsError;
  }

  if (payload.name && payload.name.length > 120) {
    return 'Name must be at most 120 characters';
  }

  return null;
}

export function hasAuthorizationHeader(headers: Record<string, string>): boolean {
  return typeof headers.Authorization === 'string' && headers.Authorization.length > 0;
}

export function normalizeRefreshToken(refreshToken: string): string {
  return refreshToken.trim();
}

export function isValidRefreshToken(refreshToken: string): boolean {
  return normalizeRefreshToken(refreshToken).length > 0;
}
