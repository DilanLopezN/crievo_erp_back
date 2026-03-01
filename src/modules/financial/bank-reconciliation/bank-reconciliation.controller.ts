import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BankReconciliationService } from './bank-reconciliation.service';
import { ImportBankStatementDto } from './dto/create-bank-statement.dto';
import { ReconcileDto } from './dto/reconcile.dto';
import { FilterReconciliationDto } from './dto/filter-reconciliation.dto';
import { TenantGuard } from '../../tenant/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Financeiro - Conciliação Bancária')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('financial/bank-reconciliation')
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Importar extrato bancário' })
  importStatement(@Body() dto: ImportBankStatementDto) {
    return this.service.importStatement(dto);
  }

  @Get('statements')
  @ApiOperation({ summary: 'Listar linhas do extrato bancário com status de conciliação' })
  getStatements(@Query() filter: FilterReconciliationDto) {
    return this.service.getStatements(filter);
  }

  @Get('statements/:id/suggestions')
  @ApiOperation({ summary: 'Sugestões de conciliação para uma linha do extrato' })
  getSuggestedMatches(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSuggestedMatches(id);
  }

  @Post('reconcile')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Conciliar linha do extrato com transação' })
  reconcile(@Body() dto: ReconcileDto) {
    return this.service.reconcile(dto);
  }

  @Post('undo/:statementId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Desfazer conciliação' })
  undoReconciliation(@Param('statementId', ParseUUIDPipe) statementId: string) {
    return this.service.undoReconciliation(statementId);
  }

  @Get('summary/:bankAccountId')
  @ApiOperation({ summary: 'Resumo da conciliação bancária' })
  getReconciliationSummary(@Param('bankAccountId', ParseUUIDPipe) bankAccountId: string) {
    return this.service.getReconciliationSummary(bankAccountId);
  }
}
