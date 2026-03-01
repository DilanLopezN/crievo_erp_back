import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DreService } from './dre.service';
import { DreFilterDto } from './dto/dre-filter.dto';
import { TenantGuard } from '../../tenant/tenant.guard';

@ApiTags('Financeiro - DRE (Demonstração do Resultado)')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('financial/dre')
export class DreController {
  constructor(private readonly dreService: DreService) {}

  @Get()
  @ApiOperation({ summary: 'DRE em tempo real por período (com comparação opcional)' })
  getDre(@Query() filter: DreFilterDto) {
    return this.dreService.getDre(filter);
  }

  @Get('monthly/:year')
  @ApiOperation({ summary: 'DRE mensal do ano (12 meses + total)' })
  getDreMonthly(
    @Param('year') year: string,
    @Query('costCenterId') costCenterId?: string,
  ) {
    return this.dreService.getDreMonthly(parseInt(year, 10), costCenterId);
  }
}
