import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssistantModule } from './assistant/assistant.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { BusinessRulesModule } from './business-rules/business-rules.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { TimeSlotsModule } from './time-slots/time-slots.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ServicesModule,
    TimeSlotsModule,
    BookingsModule,
    AssistantModule,
    BusinessRulesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
