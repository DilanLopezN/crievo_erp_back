import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { FilterProductionOrderDto } from './dto/filter-production-order.dto';
import { AdvanceStepDto } from './dto/advance-step.dto';
import { ConsumeMaterialDto } from './dto/consume-material.dto';

@Injectable()
export class ProductionOrderService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateOrderNumber(): Promise<string> {
    const db = this.prisma.tenantClient();
    const year = new Date().getFullYear();
    const prefix = `OP-${year}-`;

    const lastOrder = await db.productionOrder.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
    });

    const nextNum = lastOrder
      ? parseInt(lastOrder.orderNumber.replace(prefix, ''), 10) + 1
      : 1;

    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  }

  async create(dto: CreateProductionOrderDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    // Validar produto
    const product = await db.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    // Validar BOM se informado
    if (dto.bomId) {
      const bom = await db.billOfMaterials.findUnique({
        where: { id: dto.bomId },
      });
      if (!bom) throw new NotFoundException('BOM não encontrada');
      if (bom.productId !== dto.productId) {
        throw new BadRequestException('BOM não pertence ao produto informado');
      }
    }

    // Validar cadeia produtiva se informada
    if (dto.chainId) {
      const chain = await db.productionChain.findUnique({
        where: { id: dto.chainId },
        include: { steps: true },
      });
      if (!chain)
        throw new NotFoundException('Cadeia produtiva não encontrada');
    }

    const orderNumber = await this.generateOrderNumber();

    // Calcular custo estimado baseado no BOM
    let costEstimate = 0;
    if (dto.bomId) {
      const bomItems = await db.billOfMaterialsItem.findMany({
        where: { bomId: dto.bomId },
        include: { materialProduct: { select: { costPrice: true } } },
      });
      costEstimate = bomItems.reduce((sum, item) => {
        const materialCost = Number(item.materialProduct.costPrice) || 0;
        const qty = Number(item.quantity);
        const waste = Number(item.wastePercentage) / 100;
        return sum + materialCost * qty * (1 + waste);
      }, 0);
      costEstimate = costEstimate * Number(dto.quantity);
    }

    const order = await db.productionOrder.create({
      data: {
        tenantId,
        orderNumber,
        productId: dto.productId,
        bomId: dto.bomId,
        chainId: dto.chainId,
        quantity: dto.quantity,
        priority: dto.priority ?? 'NORMAL',
        plannedStartDate: dto.plannedStartDate
          ? new Date(dto.plannedStartDate)
          : undefined,
        plannedEndDate: dto.plannedEndDate
          ? new Date(dto.plannedEndDate)
          : undefined,
        requestedBy: dto.requestedBy,
        batchCode: dto.batchCode,
        notes: dto.notes,
        costEstimate: Math.round(costEstimate * 100) / 100,
      },
      include: {
        product: { select: { id: true, name: true, code: true } },
        bom: { select: { id: true, name: true, version: true } },
        chain: { select: { id: true, name: true, code: true } },
      },
    });

    // Se tem cadeia produtiva, criar execuções de etapas automaticamente
    if (dto.chainId) {
      const steps = await db.productionChainStep.findMany({
        where: { chainId: dto.chainId },
        orderBy: { stepOrder: 'asc' },
      });

      for (const step of steps) {
        await db.productionStepExecution.create({
          data: {
            tenantId,
            productionOrderId: order.id,
            chainStepId: step.id,
            workCenterId: step.workCenterId,
            status: 'PENDING',
          },
        });
      }
    }

    // Se tem BOM, criar registros de consumo de materiais planejados
    if (dto.bomId) {
      const bomItems = await db.billOfMaterialsItem.findMany({
        where: { bomId: dto.bomId },
      });
      const bomInfo = await db.billOfMaterials.findUnique({
        where: { id: dto.bomId },
      });
      const yieldQty = Number(bomInfo?.yieldQuantity ?? 1);
      const multiplier = Number(dto.quantity) / yieldQty;

      for (const item of bomItems) {
        const plannedQty =
          Number(item.quantity) *
          multiplier *
          (1 + Number(item.wastePercentage) / 100);

        await db.materialConsumption.create({
          data: {
            tenantId,
            productionOrderId: order.id,
            materialProductId: item.materialProductId,
            plannedQuantity: Math.round(plannedQty * 10000) / 10000,
            unit: item.unit,
          },
        });
      }
    }

    return order;
  }

  async findAll(filter: FilterProductionOrderDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.search) {
      where.OR = [
        { orderNumber: { contains: filter.search, mode: 'insensitive' } },
        { batchCode: { contains: filter.search, mode: 'insensitive' } },
        {
          product: {
            name: { contains: filter.search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.productId) where.productId = filter.productId;

    if (filter.plannedStartFrom || filter.plannedStartTo) {
      const dateFilter: Record<string, Date> = {};
      if (filter.plannedStartFrom)
        dateFilter.gte = new Date(filter.plannedStartFrom);
      if (filter.plannedStartTo)
        dateFilter.lte = new Date(filter.plannedStartTo);
      where.plannedStartDate = dateFilter;
    }

    const [data, total] = await Promise.all([
      db.productionOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, code: true } },
          chain: { select: { id: true, name: true } },
          _count: {
            select: {
              stepExecutions: true,
              qualityInspections: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { plannedStartDate: 'asc' }],
      }),
      db.productionOrder.count({ where }),
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
    const order = await db.productionOrder.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true, code: true, unit: true },
        },
        bom: {
          select: { id: true, name: true, version: true },
        },
        chain: {
          select: { id: true, name: true, code: true },
        },
        stepExecutions: {
          include: {
            chainStep: {
              select: {
                id: true,
                name: true,
                stepOrder: true,
                isQualityCheckpoint: true,
              },
            },
            workCenter: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { chainStep: { stepOrder: 'asc' } },
        },
        materialConsumptions: {
          include: {
            materialProduct: {
              select: { id: true, name: true, code: true, unit: true },
            },
          },
        },
        qualityInspections: {
          select: {
            id: true,
            type: true,
            status: true,
            inspectionDate: true,
            approvedQuantity: true,
            rejectedQuantity: true,
          },
          orderBy: { inspectionDate: 'desc' },
        },
        _count: {
          select: { defects: true },
        },
      },
    });
    if (!order)
      throw new NotFoundException('Ordem de produção não encontrada');
    return order;
  }

  async update(id: string, dto: UpdateProductionOrderDto) {
    const order = await this.findOne(id);

    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(
        'Não é possível editar ordem finalizada ou cancelada',
      );
    }

    const db = this.prisma.tenantClient();
    const data: Record<string, unknown> = {};

    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.priority) data.priority = dto.priority;
    if (dto.requestedBy !== undefined) data.requestedBy = dto.requestedBy;
    if (dto.batchCode !== undefined) data.batchCode = dto.batchCode;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.plannedStartDate)
      data.plannedStartDate = new Date(dto.plannedStartDate);
    if (dto.plannedEndDate)
      data.plannedEndDate = new Date(dto.plannedEndDate);

    // Gerenciar transições de status
    if (dto.status) {
      this.validateStatusTransition(order.status, dto.status);
      data.status = dto.status;

      if (dto.status === 'IN_PROGRESS' && !order.actualStartDate) {
        data.actualStartDate = new Date();
      }
      if (dto.status === 'COMPLETED') {
        data.actualEndDate = new Date();
      }
    }

    return db.productionOrder.update({
      where: { id },
      data,
      include: {
        product: { select: { id: true, name: true, code: true } },
        chain: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    const order = await this.findOne(id);

    if (!['DRAFT', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(
        'Só é possível excluir ordens em rascunho ou canceladas',
      );
    }

    const db = this.prisma.tenantClient();
    await db.materialConsumption.deleteMany({
      where: { productionOrderId: id },
    });
    await db.productionStepExecution.deleteMany({
      where: { productionOrderId: id },
    });
    return db.productionOrder.delete({ where: { id } });
  }

  async advanceStep(orderId: string, dto: AdvanceStepDto) {
    const order = await this.findOne(orderId);
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('Ordem já finalizada ou cancelada');
    }

    // Buscar ou criar a execução da etapa
    let execution = await db.productionStepExecution.findFirst({
      where: {
        productionOrderId: orderId,
        chainStepId: dto.chainStepId,
      },
    });

    if (!execution) {
      execution = await db.productionStepExecution.create({
        data: {
          tenantId,
          productionOrderId: orderId,
          chainStepId: dto.chainStepId,
          workCenterId: dto.workCenterId,
          status: 'PENDING',
        },
      });
    }

    const updateData: Record<string, unknown> = {};

    switch (dto.action) {
      case 'START':
        if (execution.status !== 'PENDING') {
          throw new BadRequestException('Etapa já foi iniciada');
        }
        updateData.status = 'IN_PROGRESS';
        updateData.startedAt = new Date();
        updateData.operatorName = dto.operatorName;
        if (dto.workCenterId) updateData.workCenterId = dto.workCenterId;

        // Atualizar ordem para IN_PROGRESS se necessário
        if (order.status !== 'IN_PROGRESS') {
          await db.productionOrder.update({
            where: { id: orderId },
            data: {
              status: 'IN_PROGRESS',
              actualStartDate: order.actualStartDate ?? new Date(),
            },
          });
        }
        break;

      case 'COMPLETE':
        if (execution.status !== 'IN_PROGRESS') {
          throw new BadRequestException(
            'Etapa precisa estar em andamento para ser concluída',
          );
        }
        updateData.status = 'COMPLETED';
        updateData.completedAt = new Date();
        updateData.quantityProduced = dto.quantityProduced ?? 0;
        updateData.quantityRejected = dto.quantityRejected ?? 0;
        updateData.observations = dto.observations;
        break;

      case 'SKIP':
        updateData.status = 'SKIPPED';
        updateData.observations = dto.observations ?? 'Etapa pulada';
        break;
    }

    const updated = await db.productionStepExecution.update({
      where: { id: execution.id },
      data: updateData,
      include: {
        chainStep: {
          select: { id: true, name: true, stepOrder: true },
        },
        workCenter: {
          select: { id: true, name: true },
        },
      },
    });

    // Ao completar etapa, atualizar totais da ordem
    if (dto.action === 'COMPLETE') {
      const completedQty = dto.quantityProduced ?? 0;
      const rejectedQty = dto.quantityRejected ?? 0;

      // Verificar se é a última etapa
      const allExecutions = await db.productionStepExecution.findMany({
        where: { productionOrderId: orderId },
      });
      const allCompleted = allExecutions.every(
        (e) => e.status === 'COMPLETED' || e.status === 'SKIPPED',
      );

      if (allCompleted) {
        // Calcular totais da última etapa completada
        const lastCompleted = allExecutions
          .filter((e) => e.status === 'COMPLETED')
          .sort(
            (a, b) =>
              (b.completedAt?.getTime() ?? 0) -
              (a.completedAt?.getTime() ?? 0),
          )[0];

        await db.productionOrder.update({
          where: { id: orderId },
          data: {
            status: 'COMPLETED',
            actualEndDate: new Date(),
            completedQuantity: lastCompleted
              ? lastCompleted.quantityProduced
              : completedQty,
            rejectedQuantity: lastCompleted
              ? lastCompleted.quantityRejected
              : rejectedQty,
          },
        });
      }
    }

    return updated;
  }

  async consumeMaterial(orderId: string, dto: ConsumeMaterialDto) {
    const order = await this.findOne(orderId);
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('Ordem já finalizada ou cancelada');
    }

    // Validar material existe
    const material = await db.product.findUnique({
      where: { id: dto.materialProductId },
    });
    if (!material) throw new NotFoundException('Material não encontrado');

    // Verificar estoque disponível
    if (Number(material.currentStock) < dto.actualQuantity) {
      throw new BadRequestException(
        `Estoque insuficiente. Disponível: ${material.currentStock} ${material.unit}`,
      );
    }

    // Buscar consumo planejado existente ou criar novo
    const existingConsumption = await db.materialConsumption.findFirst({
      where: {
        productionOrderId: orderId,
        materialProductId: dto.materialProductId,
      },
    });

    let consumption;
    if (existingConsumption) {
      consumption = await db.materialConsumption.update({
        where: { id: existingConsumption.id },
        data: {
          actualQuantity: {
            increment: dto.actualQuantity,
          },
          wasteQuantity: {
            increment: dto.wasteQuantity ?? 0,
          },
          consumedAt: new Date(),
          notes: dto.notes,
        },
      });
    } else {
      consumption = await db.materialConsumption.create({
        data: {
          tenantId,
          productionOrderId: orderId,
          materialProductId: dto.materialProductId,
          plannedQuantity: dto.actualQuantity,
          actualQuantity: dto.actualQuantity,
          unit: dto.unit ?? 'UN',
          wasteQuantity: dto.wasteQuantity ?? 0,
          consumedAt: new Date(),
          notes: dto.notes,
        },
      });
    }

    // Decrementar estoque do material
    await db.product.update({
      where: { id: dto.materialProductId },
      data: { currentStock: { decrement: dto.actualQuantity } },
    });

    // Atualizar custo real da ordem
    const materialCost =
      Number(material.costPrice) * dto.actualQuantity;
    await db.productionOrder.update({
      where: { id: orderId },
      data: { actualCost: { increment: materialCost } },
    });

    return consumption;
  }

  async getTraceability(orderId: string) {
    const order = await this.findOne(orderId);
    const db = this.prisma.tenantClient();

    const [materials, steps, inspections, defects] = await Promise.all([
      db.materialConsumption.findMany({
        where: { productionOrderId: orderId },
        include: {
          materialProduct: {
            select: { id: true, name: true, code: true, unit: true },
          },
        },
      }),
      db.productionStepExecution.findMany({
        where: { productionOrderId: orderId },
        include: {
          chainStep: {
            select: {
              id: true,
              name: true,
              stepOrder: true,
              isQualityCheckpoint: true,
            },
          },
          workCenter: { select: { id: true, name: true } },
        },
        orderBy: { chainStep: { stepOrder: 'asc' } },
      }),
      db.qualityInspection.findMany({
        where: { productionOrderId: orderId },
        orderBy: { inspectionDate: 'asc' },
      }),
      db.qualityDefect.findMany({
        where: { productionOrderId: orderId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        batchCode: order.batchCode,
        product: order.product,
        quantity: order.quantity,
        completedQuantity: order.completedQuantity,
        rejectedQuantity: order.rejectedQuantity,
        status: order.status,
        plannedStartDate: order.plannedStartDate,
        plannedEndDate: order.plannedEndDate,
        actualStartDate: order.actualStartDate,
        actualEndDate: order.actualEndDate,
        costEstimate: order.costEstimate,
        actualCost: order.actualCost,
      },
      materials: materials.map((m) => ({
        material: m.materialProduct,
        plannedQuantity: m.plannedQuantity,
        actualQuantity: m.actualQuantity,
        wasteQuantity: m.wasteQuantity,
        variance:
          Number(m.actualQuantity) - Number(m.plannedQuantity),
        consumedAt: m.consumedAt,
      })),
      productionSteps: steps.map((s) => ({
        step: s.chainStep,
        workCenter: s.workCenter,
        operator: s.operatorName,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        durationMinutes:
          s.startedAt && s.completedAt
            ? Math.round(
                (s.completedAt.getTime() - s.startedAt.getTime()) /
                  60000,
              )
            : null,
        quantityProduced: s.quantityProduced,
        quantityRejected: s.quantityRejected,
      })),
      qualityInspections: inspections,
      defects,
      summary: {
        totalMaterialsCost: order.actualCost,
        yieldRate:
          Number(order.quantity) > 0
            ? Math.round(
                (Number(order.completedQuantity) /
                  Number(order.quantity)) *
                  10000,
              ) / 100
            : 0,
        defectRate:
          Number(order.quantity) > 0
            ? Math.round(
                (Number(order.rejectedQuantity) /
                  Number(order.quantity)) *
                  10000,
              ) / 100
            : 0,
        totalDefects: defects.length,
        qualityApproved: inspections.filter((i) => i.status === 'APPROVED')
          .length,
        qualityRejected: inspections.filter((i) => i.status === 'REJECTED')
          .length,
      },
    };
  }

  private validateStatusTransition(
    current: string,
    next: string,
  ): void {
    const transitions: Record<string, string[]> = {
      DRAFT: ['PLANNED', 'CANCELLED'],
      PLANNED: ['RELEASED', 'CANCELLED'],
      RELEASED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['PAUSED', 'COMPLETED', 'CANCELLED'],
      PAUSED: ['IN_PROGRESS', 'CANCELLED'],
    };

    const allowed = transitions[current];
    if (!allowed || !allowed.includes(next)) {
      throw new BadRequestException(
        `Transição de status "${current}" para "${next}" não é permitida`,
      );
    }
  }
}
