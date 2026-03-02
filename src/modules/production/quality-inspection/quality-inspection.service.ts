import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateQualityInspectionDto } from './dto/create-quality-inspection.dto';
import { UpdateQualityInspectionDto } from './dto/update-quality-inspection.dto';
import { FilterQualityInspectionDto } from './dto/filter-quality-inspection.dto';
import { CreateDefectDto } from './dto/create-defect.dto';

@Injectable()
export class QualityInspectionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQualityInspectionDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    // Validar ordem de produção
    const order = await db.productionOrder.findUnique({
      where: { id: dto.productionOrderId },
    });
    if (!order)
      throw new NotFoundException('Ordem de produção não encontrada');

    // Validar execução de etapa se informada
    if (dto.stepExecutionId) {
      const stepExec = await db.productionStepExecution.findUnique({
        where: { id: dto.stepExecutionId },
      });
      if (!stepExec)
        throw new NotFoundException('Execução de etapa não encontrada');
    }

    return db.qualityInspection.create({
      data: {
        tenantId,
        productionOrderId: dto.productionOrderId,
        stepExecutionId: dto.stepExecutionId,
        type: dto.type ?? 'IN_PROCESS',
        inspectorName: dto.inspectorName,
        inspectionDate: dto.inspectionDate
          ? new Date(dto.inspectionDate)
          : new Date(),
        sampleSize: dto.sampleSize,
        criteria: dto.criteria ?? undefined,
        notes: dto.notes,
      },
      include: {
        productionOrder: {
          select: { id: true, orderNumber: true },
        },
        stepExecution: {
          select: {
            id: true,
            chainStep: { select: { name: true, stepOrder: true } },
          },
        },
      },
    });
  }

  async findAll(filter: FilterQualityInspectionDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.productionOrderId)
      where.productionOrderId = filter.productionOrderId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;

    if (filter.dateFrom || filter.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filter.dateFrom) dateFilter.gte = new Date(filter.dateFrom);
      if (filter.dateTo) dateFilter.lte = new Date(filter.dateTo);
      where.inspectionDate = dateFilter;
    }

    const [data, total] = await Promise.all([
      db.qualityInspection.findMany({
        where,
        skip,
        take: limit,
        include: {
          productionOrder: {
            select: {
              id: true,
              orderNumber: true,
              product: { select: { name: true } },
            },
          },
          _count: { select: { defects: true } },
        },
        orderBy: { inspectionDate: 'desc' },
      }),
      db.qualityInspection.count({ where }),
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
    const inspection = await db.qualityInspection.findUnique({
      where: { id },
      include: {
        productionOrder: {
          select: {
            id: true,
            orderNumber: true,
            batchCode: true,
            product: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        stepExecution: {
          select: {
            id: true,
            chainStep: {
              select: { name: true, stepOrder: true },
            },
            workCenter: {
              select: { name: true },
            },
          },
        },
        defects: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!inspection)
      throw new NotFoundException('Inspeção de qualidade não encontrada');
    return inspection;
  }

  async update(id: string, dto: UpdateQualityInspectionDto) {
    const inspection = await this.findOne(id);

    if (['APPROVED', 'REJECTED'].includes(inspection.status)) {
      throw new BadRequestException(
        'Inspeção já finalizada, não pode ser editada',
      );
    }

    const db = this.prisma.tenantClient();

    const updated = await db.qualityInspection.update({
      where: { id },
      data: {
        status: dto.status,
        inspectorName: dto.inspectorName,
        approvedQuantity: dto.approvedQuantity,
        rejectedQuantity: dto.rejectedQuantity,
        results: dto.results ?? undefined,
        notes: dto.notes,
      },
      include: {
        productionOrder: {
          select: { id: true, orderNumber: true },
        },
        defects: true,
      },
    });

    // Se inspeção rejeitada, atualizar ordem
    if (dto.status === 'REJECTED' && dto.rejectedQuantity) {
      await db.productionOrder.update({
        where: { id: inspection.productionOrderId },
        data: {
          rejectedQuantity: { increment: dto.rejectedQuantity },
        },
      });
    }

    return updated;
  }

  async remove(id: string) {
    const inspection = await this.findOne(id);
    if (inspection.status !== 'PENDING') {
      throw new BadRequestException(
        'Só é possível remover inspeções pendentes',
      );
    }
    const db = this.prisma.tenantClient();
    return db.qualityInspection.delete({ where: { id } });
  }

  // ----- Defeitos -----

  async createDefect(dto: CreateDefectDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    // Validar ordem
    const order = await db.productionOrder.findUnique({
      where: { id: dto.productionOrderId },
    });
    if (!order)
      throw new NotFoundException('Ordem de produção não encontrada');

    // Validar inspeção se informada
    if (dto.inspectionId) {
      const insp = await db.qualityInspection.findUnique({
        where: { id: dto.inspectionId },
      });
      if (!insp) throw new NotFoundException('Inspeção não encontrada');
    }

    return db.qualityDefect.create({
      data: {
        tenantId,
        productionOrderId: dto.productionOrderId,
        inspectionId: dto.inspectionId,
        description: dto.description,
        severity: dto.severity ?? 'MEDIUM',
        quantity: dto.quantity ?? 1,
        cause: dto.cause,
        correctiveAction: dto.correctiveAction,
      },
      include: {
        productionOrder: {
          select: { id: true, orderNumber: true },
        },
        inspection: {
          select: { id: true, type: true },
        },
      },
    });
  }

  async resolveDefect(defectId: string, resolvedBy: string) {
    const db = this.prisma.tenantClient();
    const defect = await db.qualityDefect.findUnique({
      where: { id: defectId },
    });
    if (!defect) throw new NotFoundException('Defeito não encontrado');
    if (defect.resolvedAt) {
      throw new BadRequestException('Defeito já foi resolvido');
    }

    return db.qualityDefect.update({
      where: { id: defectId },
      data: {
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  async getDefectsByOrder(productionOrderId: string) {
    const db = this.prisma.tenantClient();
    return db.qualityDefect.findMany({
      where: { productionOrderId },
      include: {
        inspection: {
          select: { id: true, type: true, inspectionDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
