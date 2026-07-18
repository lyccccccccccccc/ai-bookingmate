import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { clearTestDatabase } from './helpers/test-database';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let testApp: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
  });

  beforeEach(() => clearTestDatabase(testApp.prisma));
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns the backend health response', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'ai-bookingmate-backend',
        database: 'connected',
        timestamp: expect.any(String),
      }),
    );
  });
});
