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
import { WorkCenterService } from './work-center.service';
import { CreateWorkCenterDto } from './dto/create-work-center.dto';
import { UpdateWorkCenterDto } from './dto/update-work-center.dto';
import { FilterWorkCenterDto } from './dto/filter-work-center.dto';
import { TenantGuard } from '@/modules/tenant/tenant.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Produção - Centros de Trabalho')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('production/work-centers')
export class WorkCenterController {
  constructor(private readonly workCenterService: WorkCenterService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Criar centro de trabalho' })
  create(@Body() dto: CreateWorkCenterDto) {
    return this.workCenterService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar centros de trabalho' })
  findAll(@Query() filter: FilterWorkCenterDto) {
    return this.workCenterService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar centro de trabalho por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workCenterService.findOne(id);
  }

  @Get(':id/maintenance')
  @ApiOperation({ summary: 'Histórico de manutenções do centro' })
  getMaintenanceHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.workCenterService.getMaintenanceHistory(id);
  }

  @Post(':id/maintenance')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Registrar manutenção no centro de trabalho' })
  addMaintenanceLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      type: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
      description: string;
      startDate: string;
      endDate?: string;
      cost?: number;
      performedBy?: string;
      notes?: string;
    },
  ) {
    return this.workCenterService.addMaintenanceLog(id, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar centro de trabalho' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkCenterDto,
  ) {
    return this.workCenterService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover centro de trabalho' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.workCenterService.remove(id);
  }
}
