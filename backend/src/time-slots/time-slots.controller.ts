import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role, TimeSlotStatus } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotStatusDto } from './dto/update-time-slot-status.dto';
import { TimeSlotsService } from './time-slots.service';

type TimeSlotFilters = {
  serviceId?: string;
  status?: TimeSlotStatus;
};

@Controller()
export class TimeSlotsController {
  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @Get('services/:serviceId/time-slots')
  findAvailableByService(@Param('serviceId') serviceId: string) {
    return this.timeSlotsService.findAvailableByService(serviceId);
  }

  @Post('time-slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createTimeSlotDto: CreateTimeSlotDto) {
    return this.timeSlotsService.create(createTimeSlotDto);
  }

  @Get('time-slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllForAdmin(@Query() filters: TimeSlotFilters) {
    return this.timeSlotsService.findAllForAdmin(filters);
  }

  @Patch('time-slots/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() updateTimeSlotStatusDto: UpdateTimeSlotStatusDto,
  ) {
    return this.timeSlotsService.updateStatus(id, updateTimeSlotStatusDto);
  }
}
