import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateWorkCenterDto } from './dto/create-work-center.dto';
import { UpdateWorkCenterDto } from './dto/update-work-center.dto';
import { FilterWorkCenterDto } from './dto/filter-work-center.dto';

@Injectable()
export class WorkCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkCenterDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (dto.code) {
      const existing = await db.workCenter.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing) {
        throw new ConflictException(
          `Centro de trabalho com código "${dto.code}" já existe`,
        );
      }
    }

    return db.workCenter.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async findAll(filter: FilterWorkCenterDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
        { location: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    const [data, total] = await Promise.all([
      db.workCenter.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              stepExecutions: true,
              maintenanceLogs: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      db.workCenter.count({ where }),
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
    const center = await db.workCenter.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            chainSteps: true,
            stepExecutions: true,
            capacityPlans: true,
            maintenanceLogs: true,
          },
        },
      },
    });
    if (!center)
      throw new NotFoundException('Centro de trabalho não encontrado');
    return center;
  }

  async update(id: string, dto: UpdateWorkCenterDto) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (dto.code) {
      const existing = await db.workCenter.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Centro de trabalho com código "${dto.code}" já existe`,
        );
      }
    }

    return db.workCenter.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const center = await this.findOne(id);
    if (center._count.stepExecutions > 0) {
      throw new ConflictException(
        'Centro de trabalho possui execuções de produção vinculadas',
      );
    }
    const db = this.prisma.tenantClient();
    return db.workCenter.delete({ where: { id } });
  }

  async getMaintenanceHistory(id: string) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();
    return db.maintenanceLog.findMany({
      where: { workCenterId: id },
      orderBy: { startDate: 'desc' },
    });
  }

  async addMaintenanceLog(
    workCenterId: string,
    data: {
      type: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
      description: string;
      startDate: string;
      endDate?: string;
      cost?: number;
      performedBy?: string;
      notes?: string;
    },
  ) {
    await this.findOne(workCenterId);
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    // Atualizar status do centro para manutenção se ainda não terminou
    if (!data.endDate) {
      await db.workCenter.update({
        where: { id: workCenterId },
        data: { status: 'MAINTENANCE' },
      });
    }

    return db.maintenanceLog.create({
      data: {
        tenantId,
        workCenterId,
        type: data.type,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        cost: data.cost ?? 0,
        performedBy: data.performedBy,
        notes: data.notes,
      },
    });
  }
}
