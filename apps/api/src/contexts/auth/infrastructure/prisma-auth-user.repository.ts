import type { PrismaService } from '../../../prisma/prisma.service';
import type { AuthUserRepository } from '../domain/auth-user.repository';
import { DuplicateEmailRegistrationError } from '../domain/auth.errors';

function isDuplicateEmailError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

export class PrismaAuthUserRepository implements AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { email: string; passwordHash: string; name?: string }) {
    try {
      return await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          name: input.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        throw new DuplicateEmailRegistrationError(input.email);
      }
      throw error;
    }
  }

  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
