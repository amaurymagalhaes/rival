import * as bcrypt from 'bcrypt';
import type { AuthTokenPort } from '../../domain/auth-token.port';
import type { AuthUserRepository } from '../../domain/auth-user.repository';
import { issueTokenPair } from '../issue-token-pair';

export class RegisterUserUseCase {
  constructor(
    private readonly users: AuthUserRepository,
    private readonly tokens: AuthTokenPort,
  ) {}

  async execute(input: { email: string; password: string; name?: string }) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.users.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const tokenPair = await issueTokenPair(this.tokens, user);

    return {
      ...tokenPair,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  }
}
