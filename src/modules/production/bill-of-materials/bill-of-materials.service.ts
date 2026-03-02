import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateBomDto } from './dto/create-bom.dto';
import { UpdateBomDto } from './dto/update-bom.dto';
import { FilterBomDto } from './dto/filter-bom.dto';

@Injectable()
export class BillOfMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBomDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    // Validar produto existe
    const product = await db.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    // Verificar versão duplicada
    const version = dto.version ?? '1.0';
    const existing = await db.billOfMaterials.findUnique({
      where: {
        tenantId_productId_version: {
          tenantId,
          productId: dto.productId,
          version,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `BOM versão "${version}" já existe para este produto`,
      );
    }

    // Se marcou como default, remover default dos outros
    if (dto.isDefault) {
      await db.billOfMaterials.updateMany({
        where: { tenantId, productId: dto.productId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Validar que materiais existem
    const materialIds = dto.items.map((item) => item.materialProductId);
    const materials = await db.product.findMany({
      where: { id: { in: materialIds } },
    });
    if (materials.length !== materialIds.length) {
      throw new BadRequestException(
        'Um ou mais materiais/insumos não foram encontrados',
      );
    }

    return db.billOfMaterials.create({
      data: {
        tenantId,
        productId: dto.productId,
        version,
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault ?? false,
        yieldQuantity: dto.yieldQuantity ?? 1,
        items: {
          create: dto.items.map((item) => ({
            tenantId,
            materialProductId: item.materialProductId,
            quantity: item.quantity,
            unit: item.unit ?? 'UN',
            wastePercentage: item.wastePercentage ?? 0,
            notes: item.notes,
          })),
        },
      },
      include: {
        product: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            materialProduct: {
              select: { id: true, name: true, code: true, unit: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findAll(filter: FilterBomDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        {
          product: {
            name: { contains: filter.search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (filter.productId) where.productId = filter.productId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    const [data, total] = await Promise.all([
      db.billOfMaterials.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.billOfMaterials.count({ where }),
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
    const bom = await db.billOfMaterials.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, code: true, unit: true } },
        items: {
          include: {
            materialProduct: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                currentStock: true,
                costPrice: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!bom) throw new NotFoundException('Lista de materiais não encontrada');
    return bom;
  }

  async update(id: string, dto: UpdateBomDto) {
    const bom = await this.findOne(id);
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    // Se marcou como default, remover default dos outros
    if (dto.isDefault) {
      await db.billOfMaterials.updateMany({
        where: {
          tenantId,
          productId: bom.productId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    // Se enviou items, substituir todos
    if (dto.items) {
      const materialIds = dto.items.map((item) => item.materialProductId);
      const materials = await db.product.findMany({
        where: { id: { in: materialIds } },
      });
      if (materials.length !== materialIds.length) {
        throw new BadRequestException(
          'Um ou mais materiais/insumos não foram encontrados',
        );
      }

      // Deletar itens antigos e criar novos
      await db.billOfMaterialsItem.deleteMany({ where: { bomId: id } });

      return db.billOfMaterials.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          isDefault: dto.isDefault,
          yieldQuantity: dto.yieldQuantity,
          isActive: dto.isActive,
          items: {
            create: dto.items.map((item) => ({
              tenantId,
              materialProductId: item.materialProductId,
              quantity: item.quantity,
              unit: item.unit ?? 'UN',
              wastePercentage: item.wastePercentage ?? 0,
              notes: item.notes,
            })),
          },
        },
        include: {
          product: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              materialProduct: {
                select: { id: true, name: true, code: true, unit: true },
              },
            },
          },
        },
      });
    }

    return db.billOfMaterials.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault,
        yieldQuantity: dto.yieldQuantity,
        isActive: dto.isActive,
      },
      include: {
        product: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            materialProduct: {
              select: { id: true, name: true, code: true, unit: true },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();
    await db.billOfMaterialsItem.deleteMany({ where: { bomId: id } });
    return db.billOfMaterials.delete({ where: { id } });
  }

  async calculateCost(id: string) {
    const bom = await this.findOne(id);

    const totalCost = bom.items.reduce((sum, item) => {
      const materialCost = Number(item.materialProduct.costPrice) || 0;
      const quantity = Number(item.quantity);
      const waste = Number(item.wastePercentage) / 100;
      return sum + materialCost * quantity * (1 + waste);
    }, 0);

    return {
      bomId: id,
      bomName: bom.name,
      productName: bom.product.name,
      yieldQuantity: bom.yieldQuantity,
      totalCost: Math.round(totalCost * 100) / 100,
      unitCost:
        Math.round((totalCost / Number(bom.yieldQuantity)) * 100) / 100,
      items: bom.items.map((item) => ({
        material: item.materialProduct.name,
        quantity: item.quantity,
        unitCost: item.materialProduct.costPrice,
        wastePercentage: item.wastePercentage,
        totalCost:
          Math.round(
            Number(item.materialProduct.costPrice) *
              Number(item.quantity) *
              (1 + Number(item.wastePercentage) / 100) *
              100,
          ) / 100,
      })),
    };
  }
}
