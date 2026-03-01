import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CashFlowFilterDto, CashFlowGroupBy } from './dto/cash-flow-filter.dto';

export interface CashFlowPeriod {
  period: string;
  income: number;
  expense: number;
  balance: number;
  accumulatedBalance: number;
}

@Injectable()
export class CashFlowService {
  constructor(private readonly prisma: PrismaService) {}

  async getCashFlow(filter: CashFlowFilterDto) {
    const db = this.prisma.tenantClient();
    const startDate = new Date(filter.startDate);
    const endDate = new Date(filter.endDate);
    const groupBy = filter.groupBy ?? CashFlowGroupBy.MONTH;

    // Get realized transactions
    const where: Record<string, unknown> = {
      date: { gte: startDate, lte: endDate },
    };
    if (filter.bankAccountId) where.bankAccountId = filter.bankAccountId;

    const transactions = await db.financialTransaction.findMany({
      where,
      select: { type: true, amount: true, date: true },
      orderBy: { date: 'asc' },
    });

    // Get initial balance (sum of all transactions before start date)
    const priorWhere: Record<string, unknown> = {
      date: { lt: startDate },
    };
    if (filter.bankAccountId) priorWhere.bankAccountId = filter.bankAccountId;

    const priorTransactions = await db.financialTransaction.findMany({
      where: priorWhere,
      select: { type: true, amount: true },
    });

    let openingBalance = 0;
    if (filter.bankAccountId) {
      const account = await db.bankAccount.findUnique({
        where: { id: filter.bankAccountId },
        select: { initialBalance: true },
      });
      openingBalance = Number(account?.initialBalance ?? 0);
    } else {
      const accounts = await db.bankAccount.findMany({
        select: { initialBalance: true },
      });
      openingBalance = accounts.reduce((sum, a) => sum + Number(a.initialBalance), 0);
    }

    for (const tx of priorTransactions) {
      const amount = Number(tx.amount);
      if (tx.type === 'INCOME') openingBalance += amount;
      else if (tx.type === 'EXPENSE') openingBalance -= amount;
    }

    // Group transactions by period
    const periods = this.groupTransactions(transactions, groupBy);
    const result: CashFlowPeriod[] = [];
    let accumulated = openingBalance;

    for (const [period, txs] of Object.entries(periods)) {
      let income = 0;
      let expense = 0;

      for (const tx of txs) {
        const amount = Number(tx.amount);
        if (tx.type === 'INCOME') income += amount;
        else if (tx.type === 'EXPENSE') expense += amount;
      }

      const balance = income - expense;
      accumulated += balance;

      result.push({
        period,
        income: Number(income.toFixed(2)),
        expense: Number(expense.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        accumulatedBalance: Number(accumulated.toFixed(2)),
      });
    }

    // Fill empty periods
    const filledResult = this.fillEmptyPeriods(result, startDate, endDate, groupBy, openingBalance);

    // Projection (future payable/receivable)
    let projection = null;
    if (filter.includeProjection === 'true') {
      projection = await this.getProjection(endDate);
    }

    return {
      openingBalance: Number(openingBalance.toFixed(2)),
      periods: filledResult,
      totals: {
        totalIncome: Number(filledResult.reduce((s, p) => s + p.income, 0).toFixed(2)),
        totalExpense: Number(filledResult.reduce((s, p) => s + p.expense, 0).toFixed(2)),
        netBalance: Number(filledResult.reduce((s, p) => s + p.balance, 0).toFixed(2)),
        closingBalance: filledResult.length > 0
          ? filledResult[filledResult.length - 1].accumulatedBalance
          : openingBalance,
      },
      projection,
    };
  }

  private async getProjection(afterDate: Date) {
    const db = this.prisma.tenantClient();
    const futureDate = new Date(afterDate);
    futureDate.setMonth(futureDate.getMonth() + 3);

    const [receivables, payables] = await Promise.all([
      db.accountReceivable.aggregate({
        where: {
          dueDate: { gt: afterDate, lte: futureDate },
          status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        },
        _sum: { amount: true, receivedAmount: true },
        _count: true,
      }),
      db.accountPayable.aggregate({
        where: {
          dueDate: { gt: afterDate, lte: futureDate },
          status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),
    ]);

    const expectedIncome = Number(receivables._sum.amount ?? 0) - Number(receivables._sum.receivedAmount ?? 0);
    const expectedExpense = Number(payables._sum.amount ?? 0) - Number(payables._sum.paidAmount ?? 0);

    return {
      period: `Next 3 months after ${afterDate.toISOString().split('T')[0]}`,
      expectedIncome: Number(expectedIncome.toFixed(2)),
      expectedExpense: Number(expectedExpense.toFixed(2)),
      expectedBalance: Number((expectedIncome - expectedExpense).toFixed(2)),
      receivablesCount: receivables._count,
      payablesCount: payables._count,
    };
  }

  private groupTransactions(
    transactions: Array<{ type: string; amount: unknown; date: Date }>,
    groupBy: CashFlowGroupBy,
  ): Record<string, Array<{ type: string; amount: unknown }>> {
    const groups: Record<string, Array<{ type: string; amount: unknown }>> = {};

    for (const tx of transactions) {
      const key = this.getPeriodKey(new Date(tx.date), groupBy);
      if (!groups[key]) groups[key] = [];
      groups[key].push({ type: tx.type, amount: tx.amount });
    }

    return groups;
  }

  private getPeriodKey(date: Date, groupBy: CashFlowGroupBy): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (groupBy) {
      case CashFlowGroupBy.DAY:
        return `${year}-${month}-${day}`;
      case CashFlowGroupBy.WEEK: {
        const firstDay = new Date(date);
        firstDay.setDate(date.getDate() - date.getDay());
        const fy = firstDay.getFullYear();
        const fm = String(firstDay.getMonth() + 1).padStart(2, '0');
        const fd = String(firstDay.getDate()).padStart(2, '0');
        return `${fy}-${fm}-${fd}`;
      }
      case CashFlowGroupBy.MONTH:
      default:
        return `${year}-${month}`;
    }
  }

  private fillEmptyPeriods(
    result: CashFlowPeriod[],
    startDate: Date,
    endDate: Date,
    groupBy: CashFlowGroupBy,
    openingBalance: number,
  ): CashFlowPeriod[] {
    const existingPeriods = new Map(result.map(r => [r.period, r]));
    const allPeriods: CashFlowPeriod[] = [];
    const current = new Date(startDate);
    let accumulated = openingBalance;

    while (current <= endDate) {
      const key = this.getPeriodKey(current, groupBy);
      const existing = existingPeriods.get(key);

      if (existing) {
        accumulated = existing.accumulatedBalance;
        allPeriods.push(existing);
        existingPeriods.delete(key);
      } else if (!allPeriods.find(p => p.period === key)) {
        allPeriods.push({
          period: key,
          income: 0,
          expense: 0,
          balance: 0,
          accumulatedBalance: accumulated,
        });
      }

      // Advance to next period
      switch (groupBy) {
        case CashFlowGroupBy.DAY:
          current.setDate(current.getDate() + 1);
          break;
        case CashFlowGroupBy.WEEK:
          current.setDate(current.getDate() + 7);
          break;
        case CashFlowGroupBy.MONTH:
        default:
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return allPeriods;
  }

  async getDailyCashPosition() {
    const db = this.prisma.tenantClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const accounts = await db.bankAccount.findMany({
      where: { isActive: true },
      select: { id: true, name: true, bank: true, currentBalance: true },
    });

    const todayTransactions = await db.financialTransaction.findMany({
      where: { date: today },
      select: { type: true, amount: true, bankAccountId: true, description: true },
    });

    const todayIncome = todayTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((s, t) => s + Number(t.amount), 0);

    const todayExpense = todayTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount), 0);

    const totalBalance = accounts.reduce((s, a) => s + Number(a.currentBalance), 0);

    // Overdue counts
    const [overduePayable, overdueReceivable] = await Promise.all([
      db.accountPayable.aggregate({
        where: { dueDate: { lt: today }, status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
        _sum: { amount: true },
        _count: true,
      }),
      db.accountReceivable.aggregate({
        where: { dueDate: { lt: today }, status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      date: today.toISOString().split('T')[0],
      totalBalance: Number(totalBalance.toFixed(2)),
      accounts: accounts.map(a => ({
        ...a,
        currentBalance: Number(a.currentBalance),
      })),
      todayMovements: {
        income: Number(todayIncome.toFixed(2)),
        expense: Number(todayExpense.toFixed(2)),
        net: Number((todayIncome - todayExpense).toFixed(2)),
      },
      overduePayable: {
        amount: Number(overduePayable._sum.amount ?? 0),
        count: overduePayable._count,
      },
      overdueReceivable: {
        amount: Number(overdueReceivable._sum.amount ?? 0),
        count: overdueReceivable._count,
      },
    };
  }
}
