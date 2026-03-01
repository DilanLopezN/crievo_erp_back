import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const db = this.prisma.tenantClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [
      bankAccounts,
      monthlyIncome,
      monthlyExpense,
      payableOverdue,
      receivableOverdue,
      payableDueThisWeek,
      receivableDueThisWeek,
      monthlyPayableTotal,
      monthlyReceivableTotal,
      recentTransactions,
    ] = await Promise.all([
      // Bank account balances
      db.bankAccount.findMany({
        where: { isActive: true },
        select: { id: true, name: true, bank: true, currentBalance: true },
        orderBy: { name: 'asc' },
      }),

      // Monthly income (realized)
      db.financialTransaction.aggregate({
        where: {
          type: 'INCOME',
          date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Monthly expense (realized)
      db.financialTransaction.aggregate({
        where: {
          type: 'EXPENSE',
          date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Overdue payables
      db.accountPayable.aggregate({
        where: {
          dueDate: { lt: today },
          status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),

      // Overdue receivables
      db.accountReceivable.aggregate({
        where: {
          dueDate: { lt: today },
          status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        },
        _sum: { amount: true, receivedAmount: true },
        _count: true,
      }),

      // Payable due this week
      db.accountPayable.aggregate({
        where: {
          dueDate: {
            gte: today,
            lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
          status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Receivable due this week
      db.accountReceivable.aggregate({
        where: {
          dueDate: {
            gte: today,
            lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
          status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Monthly payables (all in current month)
      db.accountPayable.aggregate({
        where: {
          dueDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),

      // Monthly receivables (all in current month)
      db.accountReceivable.aggregate({
        where: {
          dueDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
        _sum: { amount: true, receivedAmount: true },
        _count: true,
      }),

      // Last 10 transactions
      db.financialTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          bankAccount: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    const totalBalance = bankAccounts.reduce((s, a) => s + Number(a.currentBalance), 0);
    const monthIncome = Number(monthlyIncome._sum.amount ?? 0);
    const monthExpense = Number(monthlyExpense._sum.amount ?? 0);

    return {
      date: today.toISOString().split('T')[0],

      balances: {
        totalBalance: Number(totalBalance.toFixed(2)),
        accounts: bankAccounts.map(a => ({
          ...a,
          currentBalance: Number(a.currentBalance),
        })),
      },

      monthlyResult: {
        month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
        income: Number(monthIncome.toFixed(2)),
        expense: Number(monthExpense.toFixed(2)),
        result: Number((monthIncome - monthExpense).toFixed(2)),
        incomeCount: monthlyIncome._count,
        expenseCount: monthlyExpense._count,
      },

      payables: {
        overdue: {
          amount: Number((Number(payableOverdue._sum.amount ?? 0) - Number(payableOverdue._sum.paidAmount ?? 0)).toFixed(2)),
          count: payableOverdue._count,
        },
        dueThisWeek: {
          amount: Number(Number(payableDueThisWeek._sum.amount ?? 0).toFixed(2)),
          count: payableDueThisWeek._count,
        },
        monthlyTotal: {
          total: Number(Number(monthlyPayableTotal._sum.amount ?? 0).toFixed(2)),
          paid: Number(Number(monthlyPayableTotal._sum.paidAmount ?? 0).toFixed(2)),
          count: monthlyPayableTotal._count,
        },
      },

      receivables: {
        overdue: {
          amount: Number((Number(receivableOverdue._sum.amount ?? 0) - Number(receivableOverdue._sum.receivedAmount ?? 0)).toFixed(2)),
          count: receivableOverdue._count,
        },
        dueThisWeek: {
          amount: Number(Number(receivableDueThisWeek._sum.amount ?? 0).toFixed(2)),
          count: receivableDueThisWeek._count,
        },
        monthlyTotal: {
          total: Number(Number(monthlyReceivableTotal._sum.amount ?? 0).toFixed(2)),
          received: Number(Number(monthlyReceivableTotal._sum.receivedAmount ?? 0).toFixed(2)),
          count: monthlyReceivableTotal._count,
        },
      },

      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: Number(t.amount),
        date: t.date,
        bankAccount: t.bankAccount,
        category: t.category,
      })),
    };
  }

  async getExpensesByCategory(startDate: string, endDate: string) {
    const db = this.prisma.tenantClient();

    const transactions = await db.financialTransaction.findMany({
      where: {
        type: 'EXPENSE',
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: {
        amount: true,
        category: { select: { id: true, name: true, code: true } },
      },
    });

    const categoryMap = new Map<string, { id: string; name: string; code: string | null; total: number; count: number }>();
    let totalExpense = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      totalExpense += amount;

      const key = tx.category?.id ?? 'uncategorized';
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += amount;
        existing.count += 1;
      } else {
        categoryMap.set(key, {
          id: tx.category?.id ?? 'uncategorized',
          name: tx.category?.name ?? 'Sem categoria',
          code: tx.category?.code ?? null,
          total: amount,
          count: 1,
        });
      }
    }

    const categories = Array.from(categoryMap.values())
      .map(c => ({
        ...c,
        total: Number(c.total.toFixed(2)),
        percentage: totalExpense > 0 ? Number(((c.total / totalExpense) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      period: { startDate, endDate },
      totalExpense: Number(totalExpense.toFixed(2)),
      categories,
    };
  }

  async getIncomeByCategory(startDate: string, endDate: string) {
    const db = this.prisma.tenantClient();

    const transactions = await db.financialTransaction.findMany({
      where: {
        type: 'INCOME',
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: {
        amount: true,
        category: { select: { id: true, name: true, code: true } },
      },
    });

    const categoryMap = new Map<string, { id: string; name: string; code: string | null; total: number; count: number }>();
    let totalIncome = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      totalIncome += amount;

      const key = tx.category?.id ?? 'uncategorized';
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += amount;
        existing.count += 1;
      } else {
        categoryMap.set(key, {
          id: tx.category?.id ?? 'uncategorized',
          name: tx.category?.name ?? 'Sem categoria',
          code: tx.category?.code ?? null,
          total: amount,
          count: 1,
        });
      }
    }

    const categories = Array.from(categoryMap.values())
      .map(c => ({
        ...c,
        total: Number(c.total.toFixed(2)),
        percentage: totalIncome > 0 ? Number(((c.total / totalIncome) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      period: { startDate, endDate },
      totalIncome: Number(totalIncome.toFixed(2)),
      categories,
    };
  }

  async getMonthlyEvolution(year: number) {
    const db = this.prisma.tenantClient();
    const months: Array<{
      month: string;
      income: number;
      expense: number;
      result: number;
    }> = [];

    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0);

      const [income, expense] = await Promise.all([
        db.financialTransaction.aggregate({
          where: { type: 'INCOME', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        db.financialTransaction.aggregate({
          where: { type: 'EXPENSE', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);

      const incomeVal = Number(income._sum.amount ?? 0);
      const expenseVal = Number(expense._sum.amount ?? 0);

      months.push({
        month: `${year}-${String(m).padStart(2, '0')}`,
        income: Number(incomeVal.toFixed(2)),
        expense: Number(expenseVal.toFixed(2)),
        result: Number((incomeVal - expenseVal).toFixed(2)),
      });
    }

    return { year, months };
  }
}
