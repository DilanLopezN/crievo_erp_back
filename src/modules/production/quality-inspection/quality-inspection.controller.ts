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
import { QualityInspectionService } from './quality-inspection.service';
import { CreateQualityInspectionDto } from './dto/create-quality-inspection.dto';
import { UpdateQualityInspectionDto } from './dto/update-quality-inspection.dto';
import { FilterQualityInspectionDto } from './dto/filter-quality-inspection.dto';
import { CreateDefectDto } from './dto/create-defect.dto';
import { TenantGuard } from '@/modules/tenant/tenant.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Produção - Controle de Qualidade')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('production/quality')
export class QualityInspectionController {
  constructor(
    private readonly qualityService: QualityInspectionService,
  ) {}

  // ----- Inspeções -----

  @Post('inspections')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Criar inspeção de qualidade' })
  createInspection(@Body() dto: CreateQualityInspectionDto) {
    return this.qualityService.create(dto);
  }

  @Get('inspections')
  @ApiOperation({ summary: 'Listar inspeções de qualidade' })
  findAllInspections(@Query() filter: FilterQualityInspectionDto) {
    return this.qualityService.findAll(filter);
  }

  @Get('inspections/:id')
  @ApiOperation({ summary: 'Buscar inspeção por ID' })
  findOneInspection(@Param('id', ParseUUIDPipe) id: string) {
    return this.qualityService.findOne(id);
  }

  @Patch('inspections/:id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Atualizar inspeção (status, resultados, quantidades)' })
  updateInspection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQualityInspectionDto,
  ) {
    return this.qualityService.update(id, dto);
  }

  @Delete('inspections/:id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover inspeção pendente' })
  removeInspection(@Param('id', ParseUUIDPipe) id: string) {
    return this.qualityService.remove(id);
  }

  // ----- Defeitos -----

  @Post('defects')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Registrar defeito de qualidade' })
  createDefect(@Body() dto: CreateDefectDto) {
    return this.qualityService.createDefect(dto);
  }

  @Get('defects/order/:orderId')
  @ApiOperation({ summary: 'Listar defeitos de uma ordem de produção' })
  getDefectsByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.qualityService.getDefectsByOrder(orderId);
  }

  @Patch('defects/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Marcar defeito como resolvido' })
  resolveDefect(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { resolvedBy: string },
  ) {
    return this.qualityService.resolveDefect(id, body.resolvedBy);
  }
}
