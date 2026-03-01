import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FilterCategoryDto } from './dto/filter-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const db = this.prisma.tenantClient();

    if (dto.code) {
      const existing = await db.financialCategory.findFirst({ where: { code: dto.code } });
      if (existing) throw new ConflictException('Código de categoria já existe');
    }

    if (dto.parentId) {
      const parent = await db.financialCategory.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Categoria pai não encontrada');
      if (parent.type !== dto.type) {
        throw new ConflictException('Tipo da subcategoria deve ser igual ao da categoria pai');
      }
    }

    return db.financialCategory.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        name: dto.name,
        code: dto.code,
        type: dto.type,
        dreGroup: dto.dreGroup,
        parentId: dto.parentId,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findAll(filter: FilterCategoryDto) {
    const db = this.prisma.tenantClient();
    const where: Record<string, unknown> = {};

    if (filter.type) where.type = filter.type;
    if (filter.dreGroup) where.dreGroup = filter.dreGroup;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.rootOnly) where.parentId = null;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return db.financialCategory.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: {
          select: { id: true, name: true, code: true, type: true, dreGroup: true, isActive: true },
          orderBy: { code: 'asc' },
        },
        _count: { select: { accountsPayable: true, accountsReceivable: true, transactions: true } },
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const category = await db.financialCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: {
          select: { id: true, name: true, code: true, type: true, dreGroup: true, isActive: true },
          orderBy: { code: 'asc' },
        },
        _count: { select: { accountsPayable: true, accountsReceivable: true, transactions: true } },
      },
    });
    if (!category) throw new NotFoundException('Categoria financeira não encontrada');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();

    if (dto.code) {
      const existing = await db.financialCategory.findFirst({
        where: { code: dto.code, NOT: { id } },
      });
      if (existing) throw new ConflictException('Código de categoria já existe');
    }

    if (dto.parentId) {
      if (dto.parentId === id) throw new ConflictException('Categoria não pode ser pai de si mesma');
      const parent = await db.financialCategory.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Categoria pai não encontrada');
    }

    return db.financialCategory.update({
      where: { id },
      data: dto,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    const db = this.prisma.tenantClient();

    const counts = category._count;
    if (counts.accountsPayable > 0 || counts.accountsReceivable > 0 || counts.transactions > 0) {
      throw new ConflictException('Categoria possui lançamentos vinculados e não pode ser removida');
    }

    return db.financialCategory.delete({ where: { id } });
  }
}
