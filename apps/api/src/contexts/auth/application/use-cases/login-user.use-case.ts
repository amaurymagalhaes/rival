import * as bcrypt from 'bcrypt';
import type { AuthTokenPort } from '../../domain/auth-token.port';
import type { AuthUserRepository } from '../../domain/auth-user.repository';
import {
  InvalidPasswordForLoginError,
  UserNotFoundForLoginError,
} from '../../domain/auth.errors';
import { issueTokenPair } from '../issue-token-pair';

export class LoginUserUseCase {
  constructor(
    private readonly users: AuthUserRepository,
    private readonly tokens: AuthTokenPort,
  ) {}

  async execute(input: { email: string; password: string }) {
    const user = await this.users.findByEmailWithPassword(input.email);

    if (!user) {
      throw new UserNotFoundForLoginError(input.email);
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new InvalidPasswordForLoginError(user.id);
    }

    const tokenPair = await issueTokenPair(this.tokens, user);

    return {
      ...tokenPair,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
