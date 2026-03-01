import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportBankStatementDto } from './dto/create-bank-statement.dto';
import { ReconcileDto } from './dto/reconcile.dto';
import { FilterReconciliationDto } from './dto/filter-reconciliation.dto';

@Injectable()
export class BankReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async importStatement(dto: ImportBankStatementDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    const bankAccount = await db.bankAccount.findUnique({
      where: { id: dto.bankAccountId },
    });
    if (!bankAccount) throw new NotFoundException('Conta bancária não encontrada');

    const importBatch = crypto.randomUUID();

    const statements = dto.lines.map(line => ({
      tenantId,
      bankAccountId: dto.bankAccountId,
      date: new Date(line.date),
      description: line.description,
      amount: line.amount,
      type: line.type as 'INCOME' | 'EXPENSE',
      balance: line.balance,
      importBatch,
    }));

    await db.bankStatement.createMany({ data: statements });

    const created = await db.bankStatement.findMany({
      where: { importBatch },
      orderBy: { date: 'asc' },
    });

    return {
      importBatch,
      count: created.length,
      statements: created,
    };
  }

  async getStatements(filter: FilterReconciliationDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 50 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      bankAccountId: filter.bankAccountId,
    };

    if (filter.unreconciledOnly) where.reconciled = false;

    if (filter.dateFrom || filter.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filter.dateFrom) dateFilter.gte = new Date(filter.dateFrom);
      if (filter.dateTo) dateFilter.lte = new Date(filter.dateTo);
      where.date = dateFilter;
    }

    const [data, total] = await Promise.all([
      db.bankStatement.findMany({
        where,
        skip,
        take: limit,
        include: {
          transactions: {
            select: { id: true, description: true, amount: true, date: true, type: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
      db.bankStatement.count({ where }),
    ]);

    const reconciledCount = await db.bankStatement.count({
      where: { bankAccountId: filter.bankAccountId, reconciled: true },
    });
    const totalCount = await db.bankStatement.count({
      where: { bankAccountId: filter.bankAccountId },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        reconciliationProgress: {
          reconciled: reconciledCount,
          total: totalCount,
          percentage: totalCount > 0 ? Number(((reconciledCount / totalCount) * 100).toFixed(1)) : 0,
        },
      },
    };
  }

  async getSuggestedMatches(bankStatementId: string) {
    const db = this.prisma.tenantClient();
    const statement = await db.bankStatement.findUnique({
      where: { id: bankStatementId },
    });
    if (!statement) throw new NotFoundException('Linha do extrato não encontrada');
    if (statement.reconciled) throw new BadRequestException('Linha do extrato já conciliada');

    const amount = Number(statement.amount);
    const dateRange = {
      gte: new Date(new Date(statement.date).setDate(new Date(statement.date).getDate() - 3)),
      lte: new Date(new Date(statement.date).setDate(new Date(statement.date).getDate() + 3)),
    };

    // Find matching transactions by amount and date proximity
    const matches = await db.financialTransaction.findMany({
      where: {
        bankAccountId: statement.bankAccountId,
        reconciled: false,
        amount: {
          gte: amount * 0.99,
          lte: amount * 1.01,
        },
        date: dateRange,
        type: statement.type,
      },
      include: {
        category: { select: { id: true, name: true } },
        accountPayable: { select: { id: true, description: true, supplierName: true } },
        accountReceivable: { select: { id: true, description: true, customerName: true } },
      },
      orderBy: { date: 'asc' },
      take: 10,
    });

    return {
      statement: {
        id: statement.id,
        date: statement.date,
        description: statement.description,
        amount: statement.amount,
        type: statement.type,
      },
      suggestedMatches: matches,
    };
  }

  async reconcile(dto: ReconcileDto) {
    const db = this.prisma.tenantClient();

    const statement = await db.bankStatement.findUnique({
      where: { id: dto.bankStatementId },
    });
    if (!statement) throw new NotFoundException('Linha do extrato não encontrada');
    if (statement.reconciled) throw new BadRequestException('Linha do extrato já conciliada');

    const transaction = await db.financialTransaction.findUnique({
      where: { id: dto.transactionId },
    });
    if (!transaction) throw new NotFoundException('Transação não encontrada');
    if (transaction.reconciled) throw new BadRequestException('Transação já conciliada');

    // Link and mark as reconciled
    await Promise.all([
      db.bankStatement.update({
        where: { id: dto.bankStatementId },
        data: { reconciled: true },
      }),
      db.financialTransaction.update({
        where: { id: dto.transactionId },
        data: { reconciled: true, bankStatementId: dto.bankStatementId },
      }),
    ]);

    return { message: 'Conciliação realizada com sucesso' };
  }

  async undoReconciliation(bankStatementId: string) {
    const db = this.prisma.tenantClient();

    const statement = await db.bankStatement.findUnique({
      where: { id: bankStatementId },
    });
    if (!statement) throw new NotFoundException('Linha do extrato não encontrada');
    if (!statement.reconciled) throw new BadRequestException('Linha do extrato não está conciliada');

    // Find linked transaction
    const linkedTransaction = await db.financialTransaction.findFirst({
      where: { bankStatementId },
    });

    await db.bankStatement.update({
      where: { id: bankStatementId },
      data: { reconciled: false },
    });

    if (linkedTransaction) {
      await db.financialTransaction.update({
        where: { id: linkedTransaction.id },
        data: { reconciled: false, bankStatementId: null },
      });
    }

    return { message: 'Conciliação desfeita com sucesso' };
  }

  async getReconciliationSummary(bankAccountId: string) {
    const db = this.prisma.tenantClient();

    const bankAccount = await db.bankAccount.findUnique({
      where: { id: bankAccountId },
    });
    if (!bankAccount) throw new NotFoundException('Conta bancária não encontrada');

    const [
      totalStatements,
      reconciledStatements,
      totalTransactions,
      reconciledTransactions,
    ] = await Promise.all([
      db.bankStatement.count({ where: { bankAccountId } }),
      db.bankStatement.count({ where: { bankAccountId, reconciled: true } }),
      db.financialTransaction.count({ where: { bankAccountId } }),
      db.financialTransaction.count({ where: { bankAccountId, reconciled: true } }),
    ]);

    // Sum of unreconciled items
    const unreconciledStatementsSum = await db.bankStatement.aggregate({
      where: { bankAccountId, reconciled: false },
      _sum: { amount: true },
    });

    const unreconciledTransactionsIncome = await db.financialTransaction.aggregate({
      where: { bankAccountId, reconciled: false, type: 'INCOME' },
      _sum: { amount: true },
    });

    const unreconciledTransactionsExpense = await db.financialTransaction.aggregate({
      where: { bankAccountId, reconciled: false, type: 'EXPENSE' },
      _sum: { amount: true },
    });

    const systemBalance = Number(bankAccount.currentBalance);

    return {
      bankAccount: {
        id: bankAccount.id,
        name: bankAccount.name,
        bank: bankAccount.bank,
        systemBalance,
      },
      statements: {
        total: totalStatements,
        reconciled: reconciledStatements,
        unreconciled: totalStatements - reconciledStatements,
        unreconciledAmount: Number(unreconciledStatementsSum._sum.amount ?? 0),
      },
      transactions: {
        total: totalTransactions,
        reconciled: reconciledTransactions,
        unreconciled: totalTransactions - reconciledTransactions,
        unreconciledIncome: Number(unreconciledTransactionsIncome._sum.amount ?? 0),
        unreconciledExpense: Number(unreconciledTransactionsExpense._sum.amount ?? 0),
      },
      reconciliationRate: totalStatements > 0
        ? Number(((reconciledStatements / totalStatements) * 100).toFixed(1))
        : 0,
    };
  }
}
