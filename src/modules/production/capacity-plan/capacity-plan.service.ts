import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateCapacityPlanDto } from './dto/create-capacity-plan.dto';
import { FilterCapacityPlanDto } from './dto/filter-capacity-plan.dto';

@Injectable()
export class CapacityPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCapacityPlanDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    // Validar centro de trabalho
    const workCenter = await db.workCenter.findUnique({
      where: { id: dto.workCenterId },
    });
    if (!workCenter)
      throw new NotFoundException('Centro de trabalho não encontrado');

    const date = new Date(dto.date);

    // Verificar se já existe plano para este centro/data
    const existing = await db.capacityPlan.findUnique({
      where: {
        tenantId_workCenterId_date: {
          tenantId,
          workCenterId: dto.workCenterId,
          date,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe um plano de capacidade para este centro nesta data',
      );
    }

    const availableMinutes = dto.availableMinutes ?? 480;
    const plannedMinutes = dto.plannedMinutes ?? 0;
    const utilizationPercent =
      availableMinutes > 0
        ? Math.round((plannedMinutes / availableMinutes) * 10000) / 100
        : 0;

    return db.capacityPlan.create({
      data: {
        tenantId,
        workCenterId: dto.workCenterId,
        date,
        availableMinutes,
        plannedMinutes,
        utilizationPercent,
        notes: dto.notes,
      },
      include: {
        workCenter: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findAll(filter: FilterCapacityPlanDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 50 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.workCenterId) where.workCenterId = filter.workCenterId;

    if (filter.dateFrom || filter.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filter.dateFrom) dateFilter.gte = new Date(filter.dateFrom);
      if (filter.dateTo) dateFilter.lte = new Date(filter.dateTo);
      where.date = dateFilter;
    }

    const [data, total] = await Promise.all([
      db.capacityPlan.findMany({
        where,
        skip,
        take: limit,
        include: {
          workCenter: {
            select: { id: true, name: true, code: true, type: true },
          },
        },
        orderBy: [{ date: 'asc' }, { workCenter: { name: 'asc' } }],
      }),
      db.capacityPlan.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const plan = await db.capacityPlan.findUnique({
      where: { id },
      include: {
        workCenter: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            capacity: true,
            capacityUnit: true,
          },
        },
      },
    });
    if (!plan)
      throw new NotFoundException('Plano de capacidade não encontrado');
    return plan;
  }

  async update(
    id: string,
    data: {
      availableMinutes?: number;
      plannedMinutes?: number;
      actualMinutes?: number;
      notes?: string;
    },
  ) {
    const plan = await this.findOne(id);
    const db = this.prisma.tenantClient();

    const availableMinutes =
      data.availableMinutes ?? Number(plan.availableMinutes);
    const plannedMinutes =
      data.plannedMinutes ?? Number(plan.plannedMinutes);
    const actualMinutes =
      data.actualMinutes ?? Number(plan.actualMinutes);

    const utilizationPercent =
      availableMinutes > 0
        ? Math.round(
            (Math.max(plannedMinutes, actualMinutes) / availableMinutes) *
              10000,
          ) / 100
        : 0;

    return db.capacityPlan.update({
      where: { id },
      data: {
        availableMinutes,
        plannedMinutes,
        actualMinutes,
        utilizationPercent,
        notes: data.notes,
      },
      include: {
        workCenter: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();
    return db.capacityPlan.delete({ where: { id } });
  }

  async getCapacityOverview(dateFrom: string, dateTo: string) {
    const db = this.prisma.tenantClient();

    const plans = await db.capacityPlan.findMany({
      where: {
        date: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
      include: {
        workCenter: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Agrupar por centro de trabalho
    const byWorkCenter = new Map<
      string,
      {
        workCenter: { id: string; name: string; code: string | null; type: string };
        totalAvailable: number;
        totalPlanned: number;
        totalActual: number;
        avgUtilization: number;
        days: number;
      }
    >();

    for (const plan of plans) {
      const key = plan.workCenterId;
      const existing = byWorkCenter.get(key);
      if (existing) {
        existing.totalAvailable += plan.availableMinutes;
        existing.totalPlanned += plan.plannedMinutes;
        existing.totalActual += plan.actualMinutes;
        existing.days += 1;
      } else {
        byWorkCenter.set(key, {
          workCenter: plan.workCenter,
          totalAvailable: plan.availableMinutes,
          totalPlanned: plan.plannedMinutes,
          totalActual: plan.actualMinutes,
          avgUtilization: 0,
          days: 1,
        });
      }
    }

    const overview = Array.from(byWorkCenter.values()).map((item) => ({
      ...item,
      avgUtilization:
        item.totalAvailable > 0
          ? Math.round(
              (item.totalPlanned / item.totalAvailable) * 10000,
            ) / 100
          : 0,
      totalAvailableHours: Math.round(item.totalAvailable / 60 * 100) / 100,
      totalPlannedHours: Math.round(item.totalPlanned / 60 * 100) / 100,
      totalActualHours: Math.round(item.totalActual / 60 * 100) / 100,
    }));

    return {
      period: { from: dateFrom, to: dateTo },
      workCenters: overview,
      totals: {
        totalWorkCenters: overview.length,
        totalAvailableHours:
          Math.round(
            overview.reduce((s, o) => s + o.totalAvailableHours, 0) * 100,
          ) / 100,
        totalPlannedHours:
          Math.round(
            overview.reduce((s, o) => s + o.totalPlannedHours, 0) * 100,
          ) / 100,
        avgUtilization:
          overview.length > 0
            ? Math.round(
                (overview.reduce((s, o) => s + o.avgUtilization, 0) /
                  overview.length) *
                  100,
              ) / 100
            : 0,
      },
    };
  }
}
