import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

@Injectable()
export class CostCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCostCenterDto) {
    const db = this.prisma.tenantClient();

    if (dto.code) {
      const existing = await db.costCenter.findFirst({ where: { code: dto.code } });
      if (existing) throw new ConflictException('Código de centro de custo já existe');
    }

    return db.costCenter.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(search?: string) {
    const db = this.prisma.tenantClient();
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return db.costCenter.findMany({
      where,
      include: {
        _count: { select: { accountsPayable: true, accountsReceivable: true, transactions: true } },
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const costCenter = await db.costCenter.findUnique({
      where: { id },
      include: {
        _count: { select: { accountsPayable: true, accountsReceivable: true, transactions: true } },
      },
    });
    if (!costCenter) throw new NotFoundException('Centro de custo não encontrado');
    return costCenter;
  }

  async update(id: string, dto: UpdateCostCenterDto) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();

    if (dto.code) {
      const existing = await db.costCenter.findFirst({
        where: { code: dto.code, NOT: { id } },
      });
      if (existing) throw new ConflictException('Código de centro de custo já existe');
    }

    return db.costCenter.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const costCenter = await this.findOne(id);
    const db = this.prisma.tenantClient();
    const counts = costCenter._count;

    if (counts.accountsPayable > 0 || counts.accountsReceivable > 0 || counts.transactions > 0) {
      throw new ConflictException('Centro de custo possui lançamentos vinculados e não pode ser removido');
    }

    return db.costCenter.delete({ where: { id } });
  }
}
