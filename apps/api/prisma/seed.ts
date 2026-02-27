import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();

  // Create 3 users
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const alice = await prisma.user.create({
    data: { email: 'alice@example.com', name: 'Alice', passwordHash },
  });
  const bob = await prisma.user.create({
    data: { email: 'bob@example.com', name: 'Bob', passwordHash },
  });
  const carol = await prisma.user.create({
    data: { email: 'carol@example.com', name: 'Carol', passwordHash },
  });

  // Create 6 blogs (4 published, 2 drafts)
  const blogs = await Promise.all([
    prisma.blog.create({
      data: {
        userId: alice.id,
        title: 'Getting Started with NestJS',
        slug: 'getting-started-with-nestjs',
        content: 'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications.',
        summary: 'A beginner-friendly guide to NestJS',
        isPublished: true,
      },
    }),
    prisma.blog.create({
      data: {
        userId: alice.id,
        title: 'Advanced TypeScript Patterns',
        slug: 'advanced-typescript-patterns',
        content: 'TypeScript offers many advanced patterns including conditional types, mapped types, and template literal types.',
        summary: 'Deep dive into TypeScript type system',
        isPublished: true,
      },
    }),
    prisma.blog.create({
      data: {
        userId: bob.id,
        title: 'React Server Components Explained',
        slug: 'react-server-components-explained',
        content: 'Server components are a paradigm shift in how we think about React applications.',
        summary: 'Understanding the RSC architecture',
        isPublished: true,
      },
    }),
    prisma.blog.create({
      data: {
        userId: bob.id,
        title: 'My Draft Post',
        slug: 'my-draft-post',
        content: 'Work in progress...',
        isPublished: false,
      },
    }),
    prisma.blog.create({
      data: {
        userId: carol.id,
        title: 'PostgreSQL Performance Tips',
        slug: 'postgresql-performance-tips',
        content: 'Here are my top tips for PostgreSQL performance tuning and optimization.',
        summary: 'Practical PostgreSQL optimization guide',
        isPublished: true,
      },
    }),
    prisma.blog.create({
      data: {
        userId: carol.id,
        title: 'Unpublished Ideas',
        slug: 'unpublished-ideas',
        content: 'Some ideas I am working on...',
        isPublished: false,
      },
    }),
  ]);

  // Create 4 likes
  await prisma.like.createMany({
    data: [
      { userId: bob.id, blogId: blogs[0].id },
      { userId: carol.id, blogId: blogs[0].id },
      { userId: alice.id, blogId: blogs[2].id },
      { userId: carol.id, blogId: blogs[4].id },
    ],
  });

  // Create 3 comments
  await prisma.comment.createMany({
    data: [
      { blogId: blogs[0].id, userId: bob.id, content: 'Great introduction!' },
      { blogId: blogs[0].id, userId: carol.id, content: 'Very helpful, thanks!' },
      { blogId: blogs[2].id, userId: alice.id, content: 'Server components are amazing.' },
    ],
  });

  console.log('Seed completed: 3 users, 6 blogs, 4 likes, 3 comments');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
