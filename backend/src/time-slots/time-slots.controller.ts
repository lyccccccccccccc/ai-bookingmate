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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

@ApiTags('time-slots')
@Controller()
export class TimeSlotsController {
  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @Get('services/:serviceId/time-slots')
  @ApiOperation({ summary: 'List available time slots for a service' })
  findAvailableByService(@Param('serviceId') serviceId: string) {
    return this.timeSlotsService.findAvailableByService(serviceId);
  }

  @Post('time-slots')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a time slot as admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createTimeSlotDto: CreateTimeSlotDto) {
    return this.timeSlotsService.create(createTimeSlotDto);
  }

  @Get('time-slots')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List time slots as admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllForAdmin(@Query() filters: TimeSlotFilters) {
    return this.timeSlotsService.findAllForAdmin(filters);
  }

  @Patch('time-slots/:id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a time slot status as admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() updateTimeSlotStatusDto: UpdateTimeSlotStatusDto,
  ) {
    return this.timeSlotsService.updateStatus(id, updateTimeSlotStatusDto);
  }
}
