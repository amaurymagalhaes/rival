import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL_TEST or DATABASE_URL must be set for tests');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
