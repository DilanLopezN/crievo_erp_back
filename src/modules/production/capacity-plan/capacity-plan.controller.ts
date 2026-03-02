import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CapacityPlanService } from './capacity-plan.service';
import { CreateCapacityPlanDto } from './dto/create-capacity-plan.dto';
import { FilterCapacityPlanDto } from './dto/filter-capacity-plan.dto';
import { TenantGuard } from '@/modules/tenant/tenant.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Produção - Planejamento de Capacidade')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('production/capacity')
export class CapacityPlanController {
  constructor(
    private readonly capacityService: CapacityPlanService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar plano de capacidade para centro/dia' })
  create(@Body() dto: CreateCapacityPlanDto) {
    return this.capacityService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar planos de capacidade' })
  findAll(@Query() filter: FilterCapacityPlanDto) {
    return this.capacityService.findAll(filter);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Visão geral de capacidade por período' })
  getOverview(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.capacityService.getCapacityOverview(dateFrom, dateTo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar plano de capacidade por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.capacityService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar plano de capacidade' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      availableMinutes?: number;
      plannedMinutes?: number;
      actualMinutes?: number;
      notes?: string;
    },
  ) {
    return this.capacityService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover plano de capacidade' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.capacityService.remove(id);
  }
}
