import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductionDashboardService } from './dashboard.service';
import { TenantGuard } from '@/modules/tenant/tenant.guard';

@ApiTags('Produção - Dashboard')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('production/dashboard')
export class ProductionDashboardController {
  constructor(
    private readonly dashboardService: ProductionDashboardService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Visão geral da produção (totais e status)' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo de produção por período' })
  getSummary(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.dashboardService.getProductionSummary(dateFrom, dateTo);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Timeline de ordens de produção' })
  getTimeline(@Query('days') days?: number) {
    return this.dashboardService.getProductionTimeline(days ?? 30);
  }
}
