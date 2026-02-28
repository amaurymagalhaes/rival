import type { AuthUserRepository } from '../../domain/auth-user.repository';
import { UserNotFoundForSessionError } from '../../domain/auth.errors';

export class GetCurrentUserUseCase {
  constructor(private readonly users: AuthUserRepository) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundForSessionError(userId);
    }

    return user;
  }
}
