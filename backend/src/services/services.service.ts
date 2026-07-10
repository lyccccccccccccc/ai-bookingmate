import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const serviceSelect = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  priceCents: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ServiceSelect;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: dto,
      select: serviceSelect,
    });
  }

  findAll() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: serviceSelect,
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: serviceSelect,
    });

    if (!service || !service.isActive) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findExistingServiceOrThrow(id);

    return this.prisma.service.update({
      where: { id },
      data: dto,
      select: serviceSelect,
    });
  }

  async deactivate(id: string) {
    await this.findExistingServiceOrThrow(id);

    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
      select: serviceSelect,
    });
  }

  private async findExistingServiceOrThrow(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }
  }
}
