import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateProductionChainDto } from './dto/create-production-chain.dto';
import { UpdateProductionChainDto } from './dto/update-production-chain.dto';
import { FilterProductionChainDto } from './dto/filter-production-chain.dto';

@Injectable()
export class ProductionChainService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductionChainDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (dto.code) {
      const existing = await db.productionChain.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing) {
        throw new ConflictException(
          `Cadeia produtiva com código "${dto.code}" já existe`,
        );
      }
    }

    // Validar que stepOrder é sequencial e sem duplicatas
    const orders = dto.steps.map((s) => s.stepOrder);
    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException('Ordens das etapas devem ser únicas');
    }

    // Validar centros de trabalho se informados
    const workCenterIds = dto.steps
      .map((s) => s.workCenterId)
      .filter(Boolean) as string[];
    if (workCenterIds.length > 0) {
      const centers = await db.workCenter.findMany({
        where: { id: { in: workCenterIds } },
      });
      if (centers.length !== workCenterIds.length) {
        throw new BadRequestException(
          'Um ou mais centros de trabalho não foram encontrados',
        );
      }
    }

    return db.productionChain.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        estimatedDurationMinutes: dto.estimatedDurationMinutes,
        steps: {
          create: dto.steps.map((step) => ({
            tenantId,
            name: step.name,
            description: step.description,
            stepOrder: step.stepOrder,
            estimatedDurationMinutes: step.estimatedDurationMinutes,
            machineTypeRequired: step.machineTypeRequired,
            workCenterId: step.workCenterId,
            instructions: step.instructions ?? undefined,
            isQualityCheckpoint: step.isQualityCheckpoint ?? false,
          })),
        },
      },
      include: {
        steps: {
          include: {
            workCenter: { select: { id: true, name: true, code: true } },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }

  async findAll(filter: FilterProductionChainDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    const [data, total] = await Promise.all([
      db.productionChain.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { steps: true, productionOrders: true } },
        },
        orderBy: { name: 'asc' },
      }),
      db.productionChain.count({ where }),
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
    const chain = await db.productionChain.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            workCenter: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
        _count: { select: { productionOrders: true } },
      },
    });
    if (!chain)
      throw new NotFoundException('Cadeia produtiva não encontrada');
    return chain;
  }

  async update(id: string, dto: UpdateProductionChainDto) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (dto.steps) {
      const orders = dto.steps.map((s) => s.stepOrder);
      if (new Set(orders).size !== orders.length) {
        throw new BadRequestException('Ordens das etapas devem ser únicas');
      }

      // Deletar etapas antigas e criar novas
      await db.productionChainStep.deleteMany({ where: { chainId: id } });

      return db.productionChain.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          estimatedDurationMinutes: dto.estimatedDurationMinutes,
          isActive: dto.isActive,
          steps: {
            create: dto.steps.map((step) => ({
              tenantId,
              name: step.name,
              description: step.description,
              stepOrder: step.stepOrder,
              estimatedDurationMinutes: step.estimatedDurationMinutes,
              machineTypeRequired: step.machineTypeRequired,
              workCenterId: step.workCenterId,
              instructions: step.instructions ?? undefined,
              isQualityCheckpoint: step.isQualityCheckpoint ?? false,
            })),
          },
        },
        include: {
          steps: {
            include: {
              workCenter: { select: { id: true, name: true, code: true } },
            },
            orderBy: { stepOrder: 'asc' },
          },
        },
      });
    }

    return db.productionChain.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        estimatedDurationMinutes: dto.estimatedDurationMinutes,
        isActive: dto.isActive,
      },
      include: {
        steps: {
          include: {
            workCenter: { select: { id: true, name: true, code: true } },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }

  async remove(id: string) {
    const chain = await this.findOne(id);
    if (chain._count.productionOrders > 0) {
      throw new ConflictException(
        'Cadeia produtiva possui ordens de produção vinculadas',
      );
    }
    const db = this.prisma.tenantClient();
    await db.productionChainStep.deleteMany({ where: { chainId: id } });
    return db.productionChain.delete({ where: { id } });
  }

  async duplicate(id: string, newName: string, newCode?: string) {
    const chain = await this.findOne(id);
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (newCode) {
      const existing = await db.productionChain.findUnique({
        where: { tenantId_code: { tenantId, code: newCode } },
      });
      if (existing) {
        throw new ConflictException(
          `Cadeia com código "${newCode}" já existe`,
        );
      }
    }

    return db.productionChain.create({
      data: {
        tenantId,
        name: newName,
        code: newCode,
        description: chain.description,
        estimatedDurationMinutes: chain.estimatedDurationMinutes,
        steps: {
          create: chain.steps.map((step) => ({
            tenantId,
            name: step.name,
            description: step.description,
            stepOrder: step.stepOrder,
            estimatedDurationMinutes: step.estimatedDurationMinutes,
            machineTypeRequired: step.machineTypeRequired,
            workCenterId: step.workCenterId,
            instructions: step.instructions ?? undefined,
            isQualityCheckpoint: step.isQualityCheckpoint,
          })),
        },
      },
      include: {
        steps: {
          include: {
            workCenter: { select: { id: true, name: true, code: true } },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }
}
