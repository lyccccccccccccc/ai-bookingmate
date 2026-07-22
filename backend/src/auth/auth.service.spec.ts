import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService password reset requests', () => {
  const genericMessage =
    'If an account exists for that email, a password reset link has been generated.';
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('http://localhost:5173'),
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    {} as JwtService,
    configService as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    prisma.$transaction.mockResolvedValue(undefined);
    prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.passwordResetToken.create.mockResolvedValue({});
  });

  afterAll(() => {
    process.env.NODE_ENV = 'test';
  });

  it('returns the generic response for an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await service.forgotPassword({ email: 'unknown@example.com' });

    expect(response).toEqual({ message: genericMessage });
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('stores a SHA-256 hash and exposes a development token only outside production', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    const response = await service.forgotPassword({ email: 'user@example.com' });

    expect(response.message).toBe(genericMessage);
    expect(response.devResetToken).toEqual(expect.any(String));
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenHash: createHash('sha256')
            .update(response.devResetToken as string)
            .digest('hex'),
        }),
      }),
    );
  });

  it('does not expose a development token in production mode', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    process.env.NODE_ENV = 'production';

    const response = await service.forgotPassword({ email: 'user@example.com' });

    expect(response).toEqual({ message: genericMessage });
  });
});
