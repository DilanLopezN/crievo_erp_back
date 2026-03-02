import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class ProductionDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const db = this.prisma.tenantClient();

    const [
      totalProducts,
      activeProducts,
      totalOrders,
      ordersByStatus,
      totalWorkCenters,
      workCentersByStatus,
      recentDefects,
    ] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { isActive: true } }),
      db.productionOrder.count(),
      db.productionOrder.groupBy({
        by: ['status'],
        _count: true,
      }),
      db.workCenter.count(),
      db.workCenter.groupBy({
        by: ['status'],
        _count: true,
      }),
      db.qualityDefect.count({
        where: { resolvedAt: null },
      }),
    ]);

    const statusMap = ordersByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const workCenterStatusMap = workCentersByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      productionOrders: {
        total: totalOrders,
        draft: statusMap['DRAFT'] ?? 0,
        planned: statusMap['PLANNED'] ?? 0,
        released: statusMap['RELEASED'] ?? 0,
        inProgress: statusMap['IN_PROGRESS'] ?? 0,
        paused: statusMap['PAUSED'] ?? 0,
        completed: statusMap['COMPLETED'] ?? 0,
        cancelled: statusMap['CANCELLED'] ?? 0,
      },
      workCenters: {
        total: totalWorkCenters,
        available: workCenterStatusMap['AVAILABLE'] ?? 0,
        inUse: workCenterStatusMap['IN_USE'] ?? 0,
        maintenance: workCenterStatusMap['MAINTENANCE'] ?? 0,
        inactive: workCenterStatusMap['INACTIVE'] ?? 0,
      },
      quality: {
        unresolvedDefects: recentDefects,
      },
    };
  }

  async getProductionSummary(dateFrom: string, dateTo: string) {
    const db = this.prisma.tenantClient();

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    const [completed, orderCosts, inspections, defects] = await Promise.all([
      db.productionOrder.findMany({
        where: {
          status: 'COMPLETED',
          actualEndDate: { gte: startDate, lte: endDate },
        },
        include: {
          product: { select: { name: true, code: true } },
        },
      }),
      db.productionOrder.aggregate({
        where: {
          actualEndDate: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        _sum: {
          costEstimate: true,
          actualCost: true,
          completedQuantity: true,
          rejectedQuantity: true,
        },
        _count: true,
      }),
      db.qualityInspection.groupBy({
        by: ['status'],
        where: {
          inspectionDate: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),
      db.qualityDefect.groupBy({
        by: ['severity'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),
    ]);

    const inspectionSummary = inspections.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const defectSummary = defects.reduce(
      (acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalCompleted = Number(orderCosts._sum.completedQuantity ?? 0);
    const totalRejected = Number(orderCosts._sum.rejectedQuantity ?? 0);
    const totalProduced = totalCompleted + totalRejected;

    return {
      period: { from: dateFrom, to: dateTo },
      production: {
        ordersCompleted: orderCosts._count,
        totalProduced,
        totalCompleted,
        totalRejected,
        yieldRate:
          totalProduced > 0
            ? Math.round((totalCompleted / totalProduced) * 10000) / 100
            : 0,
        estimatedCost: orderCosts._sum.costEstimate ?? 0,
        actualCost: orderCosts._sum.actualCost ?? 0,
        costVariance:
          Number(orderCosts._sum.actualCost ?? 0) -
          Number(orderCosts._sum.costEstimate ?? 0),
      },
      quality: {
        inspections: {
          approved: inspectionSummary['APPROVED'] ?? 0,
          rejected: inspectionSummary['REJECTED'] ?? 0,
          conditional: inspectionSummary['CONDITIONAL'] ?? 0,
          pending: inspectionSummary['PENDING'] ?? 0,
        },
        defects: {
          critical: defectSummary['CRITICAL'] ?? 0,
          high: defectSummary['HIGH'] ?? 0,
          medium: defectSummary['MEDIUM'] ?? 0,
          low: defectSummary['LOW'] ?? 0,
          total: defects.reduce((s, d) => s + d._count, 0),
        },
      },
      topProducts: completed.slice(0, 10).map((o) => ({
        product: o.product,
        quantity: o.completedQuantity,
        rejected: o.rejectedQuantity,
        orderNumber: o.orderNumber,
      })),
    };
  }

  async getProductionTimeline(days: number = 30) {
    const db = this.prisma.tenantClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await db.productionOrder.findMany({
      where: {
        OR: [
          { actualStartDate: { gte: startDate } },
          {
            plannedStartDate: { gte: startDate },
            status: { in: ['PLANNED', 'RELEASED'] },
          },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        priority: true,
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        product: { select: { name: true, code: true } },
        chain: { select: { name: true } },
      },
      orderBy: { plannedStartDate: 'asc' },
    });

    return orders;
  }
}
