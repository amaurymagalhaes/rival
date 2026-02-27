import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const DEFAULT_PASSWORD = 'TestPass123!';

export async function createUser(
  prisma: PrismaClient,
  overrides: {
    email?: string;
    name?: string;
    password?: string;
  } = {},
) {
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? faker.internet.email(),
      name: overrides.name ?? faker.person.fullName(),
      passwordHash,
    },
  });

  return { ...user, password };
}
