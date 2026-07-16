import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  BusinessRulesService,
  type BusinessRuleFilters,
} from './business-rules.service';
import { CreateBusinessRuleDto } from './dto/create-business-rule.dto';
import { UpdateBusinessRuleDto } from './dto/update-business-rule.dto';

@ApiTags('business-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('business-rules')
export class BusinessRulesController {
  constructor(private readonly businessRulesService: BusinessRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List business rules for admins' })
  findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters: BusinessRuleFilters = {
      category: category ? category.toLowerCase() : undefined,
      isActive: parseOptionalBoolean(isActive),
    };

    return this.businessRulesService.findAll(filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create a business rule' })
  create(@Body() createBusinessRuleDto: CreateBusinessRuleDto) {
    return this.businessRulesService.create(createBusinessRuleDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a business rule' })
  update(
    @Param('id') id: string,
    @Body() updateBusinessRuleDto: UpdateBusinessRuleDto,
  ) {
    return this.businessRulesService.update(id, updateBusinessRuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a business rule' })
  deactivate(@Param('id') id: string) {
    return this.businessRulesService.deactivate(id);
  }
}

function parseOptionalBoolean(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  return value === 'true';
}
