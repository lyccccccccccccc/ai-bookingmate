import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prisma = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('reports a connected database', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      await expect(appController.health()).resolves.toEqual(
        expect.objectContaining({
          status: 'ok',
          service: 'ai-bookingmate-backend',
          database: 'connected',
          timestamp: expect.any(String),
        }),
      );
    });

    it('returns a safe unavailable response when the database query fails', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Database unavailable'));

      await expect(appController.health()).rejects.toMatchObject({
        status: 503,
        response: expect.objectContaining({ database: 'unavailable' }),
      });
    });
  });
});
