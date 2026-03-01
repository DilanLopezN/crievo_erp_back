import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { TenantGuard } from '../../tenant/tenant.guard';

@ApiTags('Financeiro - Dashboard')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('financial/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Overview financeiro consolidado (saldos, vencimentos, resultado mensal)' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('expenses-by-category')
  @ApiOperation({ summary: 'Despesas agrupadas por categoria' })
  getExpensesByCategory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.getExpensesByCategory(startDate, endDate);
  }

  @Get('income-by-category')
  @ApiOperation({ summary: 'Receitas agrupadas por categoria' })
  getIncomeByCategory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.getIncomeByCategory(startDate, endDate);
  }

  @Get('monthly-evolution/:year')
  @ApiOperation({ summary: 'Evolução mensal de receitas vs despesas' })
  getMonthlyEvolution(@Param('year') year: string) {
    return this.dashboardService.getMonthlyEvolution(parseInt(year, 10));
  }
}
