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
import { ProductionOrderService } from './production-order.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { FilterProductionOrderDto } from './dto/filter-production-order.dto';
import { AdvanceStepDto } from './dto/advance-step.dto';
import { ConsumeMaterialDto } from './dto/consume-material.dto';
import { TenantGuard } from '@/modules/tenant/tenant.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Produção - Ordens de Produção')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('production/orders')
export class ProductionOrderController {
  constructor(
    private readonly orderService: ProductionOrderService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Criar ordem de produção' })
  create(@Body() dto: CreateProductionOrderDto) {
    return this.orderService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ordens de produção com filtros' })
  findAll(@Query() filter: FilterProductionOrderDto) {
    return this.orderService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ordem de produção por ID (detalhes completos)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.findOne(id);
  }

  @Get(':id/traceability')
  @ApiOperation({ summary: 'Rastreabilidade completa da ordem de produção' })
  getTraceability(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.getTraceability(id);
  }

  @Post(':id/steps')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Avançar etapa da produção (iniciar, concluir, pular)' })
  advanceStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdvanceStepDto,
  ) {
    return this.orderService.advanceStep(id, dto);
  }

  @Post(':id/materials')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Registrar consumo de material na ordem' })
  consumeMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConsumeMaterialDto,
  ) {
    return this.orderService.consumeMaterial(id, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar ordem de produção' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductionOrderDto,
  ) {
    return this.orderService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover ordem de produção (somente rascunho/cancelada)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.remove(id);
  }
}
