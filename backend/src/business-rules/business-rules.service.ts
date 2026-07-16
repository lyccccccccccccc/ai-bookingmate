import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessRuleDto } from './dto/create-business-rule.dto';
import { UpdateBusinessRuleDto } from './dto/update-business-rule.dto';

const businessRuleSelect = {
  id: true,
  title: true,
  category: true,
  content: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BusinessRuleSelect;

export type BusinessRuleFilters = {
  category?: string;
  isActive?: boolean;
};

@Injectable()
export class BusinessRulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: BusinessRuleFilters = {}) {
    return this.prisma.businessRule.findMany({
      where: {
        category: filters.category,
        isActive: filters.isActive,
      },
      orderBy: { createdAt: 'desc' },
      select: businessRuleSelect,
    });
  }

  create(dto: CreateBusinessRuleDto) {
    return this.prisma.businessRule.create({
      data: {
        title: dto.title.trim(),
        category: dto.category.trim().toLowerCase(),
        content: dto.content.trim(),
      },
      select: businessRuleSelect,
    });
  }

  async update(id: string, dto: UpdateBusinessRuleDto) {
    await this.findExistingRuleOrThrow(id);

    return this.prisma.businessRule.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        category: dto.category?.trim().toLowerCase(),
        content: dto.content?.trim(),
        isActive: dto.isActive,
      },
      select: businessRuleSelect,
    });
  }

  async deactivate(id: string) {
    await this.findExistingRuleOrThrow(id);

    return this.prisma.businessRule.update({
      where: { id },
      data: { isActive: false },
      select: businessRuleSelect,
    });
  }

  private async findExistingRuleOrThrow(id: string) {
    const rule = await this.prisma.businessRule.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!rule) {
      throw new NotFoundException('Business rule not found');
    }
  }
}
