import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashFlowService } from './cash-flow.service';
import { CashFlowFilterDto } from './dto/cash-flow-filter.dto';
import { TenantGuard } from '../../tenant/tenant.guard';

@ApiTags('Financeiro - Fluxo de Caixa')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('financial/cash-flow')
export class CashFlowController {
  constructor(private readonly cashFlowService: CashFlowService) {}

  @Get()
  @ApiOperation({ summary: 'Fluxo de caixa por período (realizado + projeção)' })
  getCashFlow(@Query() filter: CashFlowFilterDto) {
    return this.cashFlowService.getCashFlow(filter);
  }

  @Get('daily-position')
  @ApiOperation({ summary: 'Posição de caixa do dia (saldos, movimentações, vencidos)' })
  getDailyCashPosition() {
    return this.cashFlowService.getDailyCashPosition();
  }
}
