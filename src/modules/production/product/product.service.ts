import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    const existing = await db.product.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException(`Produto com código "${dto.code}" já existe`);
    }

    return db.product.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async findAll(filter: FilterProductDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.type) where.type = filter.type;
    if (filter.category) where.category = filter.category;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    if (filter.belowMinStock) {
      where.currentStock = { lt: { ref: 'minStock' } };
      // Prisma doesn't support column comparison directly, use raw approach
      // Instead, we filter after query or use a simpler approach
      delete where.currentStock;
    }

    const [data, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              billsOfMaterials: true,
              productionOrders: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      db.product.count({ where }),
    ]);

    // Filter below min stock in application layer if needed
    const filteredData = filter.belowMinStock
      ? data.filter((p) => Number(p.currentStock) < Number(p.minStock))
      : data;

    return {
      data: filteredData,
      meta: {
        total: filter.belowMinStock ? filteredData.length : total,
        page,
        limit,
        totalPages: Math.ceil(
          (filter.belowMinStock ? filteredData.length : total) / limit,
        ),
      },
    };
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const product = await db.product.findUnique({
      where: { id },
      include: {
        billsOfMaterials: {
          where: { isActive: true },
          select: { id: true, name: true, version: true, isDefault: true },
        },
        _count: {
          select: {
            productionOrders: true,
            bomItems: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (dto.code) {
      const existing = await db.product.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Produto com código "${dto.code}" já existe`,
        );
      }
    }

    return db.product.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    if (product._count.productionOrders > 0) {
      throw new ConflictException(
        'Produto possui ordens de produção vinculadas',
      );
    }

    const db = this.prisma.tenantClient();
    return db.product.delete({ where: { id } });
  }

  async adjustStock(id: string, quantity: number) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();
    return db.product.update({
      where: { id },
      data: { currentStock: { increment: quantity } },
    });
  }
}
