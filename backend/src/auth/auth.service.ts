import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './jwt.strategy';

type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

type AuthResponse = {
  user: SafeUser;
  accessToken: string;
};

type ForgotPasswordResponse = {
  message: string;
  devResetToken?: string;
  devResetUrl?: string;
};

const forgotPasswordMessage =
  'If an account exists for that email, a password reset link has been generated.';
const passwordResetLifetimeMs = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        name: registerDto.name,
      },
    });

    return this.createAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createAuthResponse(user);
  }

  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.toSafeUser(user);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
      select: { id: true },
    });

    if (!user) {
      return { message: forgotPasswordMessage };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + passwordResetLifetimeMs);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    if (!this.isDevelopmentOrTest()) {
      return { message: forgotPasswordMessage };
    }

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    return {
      message: forgotPasswordMessage,
      devResetToken: rawToken,
      devResetUrl: `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(resetPasswordDto.token);
    const now = new Date();
    const passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    try {
      await this.prisma.$transaction(async (tx) => {
        const token = await tx.passwordResetToken.findFirst({
          where: {
            tokenHash,
            usedAt: null,
            expiresAt: { gt: now },
          },
          select: { id: true, userId: true },
        });

        if (!token) {
          throw new BadRequestException(
            'Reset token is invalid or has expired',
          );
        }

        const claimedToken = await tx.passwordResetToken.updateMany({
          where: {
            id: token.id,
            usedAt: null,
            expiresAt: { gt: now },
          },
          data: { usedAt: now },
        });

        if (claimedToken.count === 0) {
          throw new BadRequestException(
            'Reset token is invalid or has expired',
          );
        }

        await tx.user.update({
          where: { id: token.userId },
          data: { passwordHash },
        });

        await tx.passwordResetToken.deleteMany({
          where: {
            userId: token.userId,
            usedAt: null,
          },
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Unable to reset password');
    }

    return { message: 'Password reset successfully. You can now log in.' };
  }

  private createAuthResponse(user: User): AuthResponse {
    return {
      user: this.toSafeUser(user),
      accessToken: this.signToken(user),
    };
  }

  private signToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.getJwtExpiresIn(),
    });
  }

  private getJwtExpiresIn(): JwtSignOptions['expiresIn'] {
    return (
      (this.configService.get<string>(
        'JWT_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn']) ?? '1d'
    );
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private hashResetToken(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private isDevelopmentOrTest() {
    const environment = process.env.NODE_ENV;
    return environment === 'development' || environment === 'test';
  }
}
