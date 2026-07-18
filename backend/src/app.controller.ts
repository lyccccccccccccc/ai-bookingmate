import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic hello world endpoint' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check backend health' })
  async health() {
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        service: 'ai-bookingmate-backend',
        environment: process.env.NODE_ENV ?? 'development',
        database: 'connected',
        timestamp,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'ai-bookingmate-backend',
        environment: process.env.NODE_ENV ?? 'development',
        database: 'unavailable',
        timestamp,
      });
    }
  }
}
