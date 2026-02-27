import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { faker } from '@faker-js/faker';

export async function createTestUser(app: INestApplication) {
  const email = faker.internet.email();
  const password = 'TestPass123!';
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password });
  return {
    email,
    password,
    token: res.body.accessToken,
    userId: res.body.user?.id,
  };
}

export function authRequest(app: INestApplication, token: string) {
  return {
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${token}`),
  };
}
