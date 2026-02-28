export class UserNotFoundForLoginError extends Error {
  constructor(public readonly email: string) {
    super('User not found');
  }
}

export class InvalidPasswordForLoginError extends Error {
  constructor(public readonly userId: string) {
    super('Invalid password');
  }
}

export class DuplicateEmailRegistrationError extends Error {
  constructor(public readonly email: string) {
    super('Duplicate email');
  }
}

export class RefreshTokenReuseDetectedError extends Error {
  constructor(public readonly userId: string) {
    super('Refresh token reuse detected');
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Invalid refresh token');
  }
}

export class UserNotFoundForSessionError extends Error {
  constructor(public readonly userId: string) {
    super('User not found');
  }
}
