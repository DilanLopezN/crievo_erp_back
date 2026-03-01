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
import { CostCenterService } from './cost-center.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { TenantGuard } from '../../tenant/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Financeiro - Centros de Custo')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('financial/cost-centers')
export class CostCenterController {
  constructor(private readonly costCenterService: CostCenterService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar centro de custo' })
  create(@Body() dto: CreateCostCenterDto) {
    return this.costCenterService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar centros de custo' })
  findAll(@Query('search') search?: string) {
    return this.costCenterService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar centro de custo por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.costCenterService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar centro de custo' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCostCenterDto) {
    return this.costCenterService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover centro de custo' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.costCenterService.remove(id);
  }
}
