import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

export async function createBlog(
  prisma: PrismaClient,
  userId: string,
  overrides: {
    title?: string;
    slug?: string;
    content?: string;
    summary?: string;
    isPublished?: boolean;
  } = {},
) {
  const title = overrides.title ?? faker.lorem.sentence();
  const slug =
    overrides.slug ??
    faker.helpers.slugify(title).toLowerCase() +
      '-' +
      faker.string.alphanumeric(6);

  return prisma.blog.create({
    data: {
      userId,
      title,
      slug,
      content: overrides.content ?? faker.lorem.paragraphs(3),
      summary: overrides.summary ?? faker.lorem.sentence(),
      isPublished: overrides.isPublished ?? true,
    },
  });
}
