import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DreFilterDto } from './dto/dre-filter.dto';

export interface DreLine {
  code: string;
  label: string;
  amount: number;
  percentage: number;
  categories: Array<{ id: string; name: string; code: string | null; amount: number }>;
}

export interface DreResult {
  period: { startDate: string; endDate: string };
  lines: Record<string, DreLine>;
  summary: {
    grossRevenue: number;
    deductions: number;
    netRevenue: number;
    costOfGoods: number;
    grossProfit: number;
    operatingExpenses: number;
    administrativeExpenses: number;
    personnelExpenses: number;
    operatingResult: number;
    financialIncome: number;
    financialExpenses: number;
    financialResult: number;
    otherIncome: number;
    otherExpenses: number;
    resultBeforeTaxes: number;
    taxes: number;
    netResult: number;
    netMargin: number;
    grossMargin: number;
    operatingMargin: number;
  };
}

@Injectable()
export class DreService {
  constructor(private readonly prisma: PrismaService) {}

  async getDre(filter: DreFilterDto): Promise<{ current: DreResult; comparison?: DreResult }> {
    const current = await this.calculateDre(filter.startDate, filter.endDate, filter.costCenterId);

    let comparison: DreResult | undefined;
    if (filter.compareStartDate && filter.compareEndDate) {
      comparison = await this.calculateDre(filter.compareStartDate, filter.compareEndDate, filter.costCenterId);
    }

    return { current, comparison };
  }

  private async calculateDre(startDate: string, endDate: string, costCenterId?: string): Promise<DreResult> {
    const db = this.prisma.tenantClient();

    // Get all transactions in the period grouped by category and dreGroup
    const txWhere: Record<string, unknown> = {
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    };
    if (costCenterId) txWhere.costCenterId = costCenterId;

    const transactions = await db.financialTransaction.findMany({
      where: txWhere,
      select: {
        amount: true,
        type: true,
        category: {
          select: { id: true, name: true, code: true, dreGroup: true, type: true },
        },
      },
    });

    // Group transactions by DRE group
    const dreGroupTotals: Record<string, {
      total: number;
      categories: Map<string, { id: string; name: string; code: string | null; amount: number }>;
    }> = {};

    const dreGroups = [
      'GROSS_REVENUE', 'DEDUCTIONS', 'COST_OF_GOODS',
      'OPERATING_EXPENSES', 'ADMINISTRATIVE_EXPENSES', 'PERSONNEL_EXPENSES',
      'FINANCIAL_INCOME', 'FINANCIAL_EXPENSES',
      'OTHER_INCOME', 'OTHER_EXPENSES', 'TAXES',
    ];

    for (const group of dreGroups) {
      dreGroupTotals[group] = { total: 0, categories: new Map() };
    }

    for (const tx of transactions) {
      if (!tx.category?.dreGroup) continue;

      const group = tx.category.dreGroup;
      const amount = Number(tx.amount);

      if (!dreGroupTotals[group]) {
        dreGroupTotals[group] = { total: 0, categories: new Map() };
      }

      dreGroupTotals[group].total += amount;

      const catKey = tx.category.id;
      const existing = dreGroupTotals[group].categories.get(catKey);
      if (existing) {
        existing.amount += amount;
      } else {
        dreGroupTotals[group].categories.set(catKey, {
          id: tx.category.id,
          name: tx.category.name,
          code: tx.category.code,
          amount,
        });
      }
    }

    // Also get transactions without dreGroup based on type
    for (const tx of transactions) {
      if (tx.category?.dreGroup) continue;

      const amount = Number(tx.amount);
      if (tx.type === 'INCOME') {
        dreGroupTotals['GROSS_REVENUE'].total += amount;
        if (tx.category) {
          const existing = dreGroupTotals['GROSS_REVENUE'].categories.get(tx.category.id);
          if (existing) {
            existing.amount += amount;
          } else {
            dreGroupTotals['GROSS_REVENUE'].categories.set(tx.category.id, {
              id: tx.category.id,
              name: tx.category.name,
              code: tx.category.code,
              amount,
            });
          }
        }
      } else if (tx.type === 'EXPENSE') {
        dreGroupTotals['OPERATING_EXPENSES'].total += amount;
        if (tx.category) {
          const existing = dreGroupTotals['OPERATING_EXPENSES'].categories.get(tx.category.id);
          if (existing) {
            existing.amount += amount;
          } else {
            dreGroupTotals['OPERATING_EXPENSES'].categories.set(tx.category.id, {
              id: tx.category.id,
              name: tx.category.name,
              code: tx.category.code,
              amount,
            });
          }
        }
      }
    }

    // Calculate DRE
    const grossRevenue = dreGroupTotals['GROSS_REVENUE'].total;
    const deductions = dreGroupTotals['DEDUCTIONS'].total;
    const netRevenue = grossRevenue - deductions;
    const costOfGoods = dreGroupTotals['COST_OF_GOODS'].total;
    const grossProfit = netRevenue - costOfGoods;
    const operatingExpenses = dreGroupTotals['OPERATING_EXPENSES'].total;
    const administrativeExpenses = dreGroupTotals['ADMINISTRATIVE_EXPENSES'].total;
    const personnelExpenses = dreGroupTotals['PERSONNEL_EXPENSES'].total;
    const totalOperatingExpenses = operatingExpenses + administrativeExpenses + personnelExpenses;
    const operatingResult = grossProfit - totalOperatingExpenses;
    const financialIncome = dreGroupTotals['FINANCIAL_INCOME'].total;
    const financialExpenses = dreGroupTotals['FINANCIAL_EXPENSES'].total;
    const financialResult = financialIncome - financialExpenses;
    const otherIncome = dreGroupTotals['OTHER_INCOME'].total;
    const otherExpenses = dreGroupTotals['OTHER_EXPENSES'].total;
    const resultBeforeTaxes = operatingResult + financialResult + otherIncome - otherExpenses;
    const taxes = dreGroupTotals['TAXES'].total;
    const netResult = resultBeforeTaxes - taxes;

    const round = (v: number) => Number(v.toFixed(2));
    const pct = (v: number, base: number) => base > 0 ? Number(((v / base) * 100).toFixed(2)) : 0;

    // Build DRE lines
    const buildLine = (code: string, label: string, amount: number, group: string): DreLine => ({
      code,
      label,
      amount: round(amount),
      percentage: pct(amount, grossRevenue),
      categories: Array.from(dreGroupTotals[group]?.categories?.values() ?? []).map(c => ({
        ...c,
        amount: round(c.amount),
      })),
    });

    const lines: Record<string, DreLine> = {
      grossRevenue: buildLine('1', '(+) Receita Bruta', grossRevenue, 'GROSS_REVENUE'),
      deductions: buildLine('2', '(-) Deduções da Receita', deductions, 'DEDUCTIONS'),
      netRevenue: { code: '3', label: '(=) Receita Líquida', amount: round(netRevenue), percentage: pct(netRevenue, grossRevenue), categories: [] },
      costOfGoods: buildLine('4', '(-) Custo dos Produtos/Serviços', costOfGoods, 'COST_OF_GOODS'),
      grossProfit: { code: '5', label: '(=) Lucro Bruto', amount: round(grossProfit), percentage: pct(grossProfit, grossRevenue), categories: [] },
      operatingExpenses: buildLine('6', '(-) Despesas Operacionais', operatingExpenses, 'OPERATING_EXPENSES'),
      administrativeExpenses: buildLine('7', '(-) Despesas Administrativas', administrativeExpenses, 'ADMINISTRATIVE_EXPENSES'),
      personnelExpenses: buildLine('8', '(-) Despesas com Pessoal', personnelExpenses, 'PERSONNEL_EXPENSES'),
      operatingResult: { code: '9', label: '(=) Resultado Operacional', amount: round(operatingResult), percentage: pct(operatingResult, grossRevenue), categories: [] },
      financialIncome: buildLine('10', '(+) Receitas Financeiras', financialIncome, 'FINANCIAL_INCOME'),
      financialExpenses: buildLine('11', '(-) Despesas Financeiras', financialExpenses, 'FINANCIAL_EXPENSES'),
      financialResult: { code: '12', label: '(=) Resultado Financeiro', amount: round(financialResult), percentage: pct(financialResult, grossRevenue), categories: [] },
      otherIncome: buildLine('13', '(+) Outras Receitas', otherIncome, 'OTHER_INCOME'),
      otherExpenses: buildLine('14', '(-) Outras Despesas', otherExpenses, 'OTHER_EXPENSES'),
      resultBeforeTaxes: { code: '15', label: '(=) Resultado Antes dos Impostos', amount: round(resultBeforeTaxes), percentage: pct(resultBeforeTaxes, grossRevenue), categories: [] },
      taxes: buildLine('16', '(-) Impostos sobre o Lucro', taxes, 'TAXES'),
      netResult: { code: '17', label: '(=) Resultado Líquido', amount: round(netResult), percentage: pct(netResult, grossRevenue), categories: [] },
    };

    return {
      period: { startDate, endDate },
      lines,
      summary: {
        grossRevenue: round(grossRevenue),
        deductions: round(deductions),
        netRevenue: round(netRevenue),
        costOfGoods: round(costOfGoods),
        grossProfit: round(grossProfit),
        operatingExpenses: round(operatingExpenses),
        administrativeExpenses: round(administrativeExpenses),
        personnelExpenses: round(personnelExpenses),
        operatingResult: round(operatingResult),
        financialIncome: round(financialIncome),
        financialExpenses: round(financialExpenses),
        financialResult: round(financialResult),
        otherIncome: round(otherIncome),
        otherExpenses: round(otherExpenses),
        resultBeforeTaxes: round(resultBeforeTaxes),
        taxes: round(taxes),
        netResult: round(netResult),
        netMargin: pct(netResult, grossRevenue),
        grossMargin: pct(grossProfit, grossRevenue),
        operatingMargin: pct(operatingResult, grossRevenue),
      },
    };
  }

  async getDreMonthly(year: number, costCenterId?: string) {
    const months: Array<{ month: string; summary: DreResult['summary'] }> = [];

    for (let m = 1; m <= 12; m++) {
      const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(year, m, 0).getDate();
      const endDate = `${year}-${String(m).padStart(2, '0')}-${lastDay}`;

      const result = await this.calculateDre(startDate, endDate, costCenterId);
      months.push({
        month: `${year}-${String(m).padStart(2, '0')}`,
        summary: result.summary,
      });
    }

    // Year totals
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const yearTotal = await this.calculateDre(yearStart, yearEnd, costCenterId);

    return {
      year,
      months,
      yearTotal: yearTotal.summary,
    };
  }
}
