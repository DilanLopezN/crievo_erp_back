import { Module } from '@nestjs/common';
import { CategoryModule } from './category/category.module';
import { CostCenterModule } from './cost-center/cost-center.module';
import { BankAccountModule } from './bank-account/bank-account.module';
import { AccountsPayableModule } from './accounts-payable/accounts-payable.module';
import { AccountsReceivableModule } from './accounts-receivable/accounts-receivable.module';
import { TransactionModule } from './transaction/transaction.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';
import { BankReconciliationModule } from './bank-reconciliation/bank-reconciliation.module';
import { DreModule } from './dre/dre.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    CategoryModule,
    CostCenterModule,
    BankAccountModule,
    AccountsPayableModule,
    AccountsReceivableModule,
    TransactionModule,
    CashFlowModule,
    BankReconciliationModule,
    DreModule,
    DashboardModule,
  ],
})
export class FinancialModule {}
