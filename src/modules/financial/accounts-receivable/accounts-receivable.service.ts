import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/update-account-receivable.dto';
import { FilterAccountReceivableDto } from './dto/filter-account-receivable.dto';
import { ReceiveAccountDto } from './dto/receive-account.dto';

@Injectable()
export class AccountsReceivableService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountReceivableDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (dto.categoryId) {
      const cat = await db.financialCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Categoria não encontrada');
      if (cat.type !== 'INCOME') throw new BadRequestException('Categoria deve ser do tipo INCOME');
    }

    if (dto.costCenterId) {
      const cc = await db.costCenter.findUnique({ where: { id: dto.costCenterId } });
      if (!cc) throw new NotFoundException('Centro de custo não encontrado');
    }

    if (dto.bankAccountId) {
      const ba = await db.bankAccount.findUnique({ where: { id: dto.bankAccountId } });
      if (!ba) throw new NotFoundException('Conta bancária não encontrada');
    }

    return db.accountReceivable.create({
      data: {
        tenantId,
        description: dto.description,
        customerName: dto.customerName,
        customerDocument: dto.customerDocument,
        categoryId: dto.categoryId,
        costCenterId: dto.costCenterId,
        bankAccountId: dto.bankAccountId,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        paymentMethod: dto.paymentMethod,
        documentNumber: dto.documentNumber,
        installmentNumber: dto.installmentNumber,
        installmentTotal: dto.installmentTotal,
        notes: dto.notes,
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
        costCenter: { select: { id: true, name: true, code: true } },
        bankAccount: { select: { id: true, name: true, bank: true } },
      },
    });
  }

  async createInstallments(dto: CreateAccountReceivableDto, totalInstallments: number) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();
    const installmentAmount = Number((dto.amount / totalInstallments).toFixed(2));
    const groupId = crypto.randomUUID();
    const baseDate = new Date(dto.dueDate);

    const installments: Prisma.AccountReceivableCreateManyInput[] = [];
    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const amount = i === totalInstallments
        ? Number((dto.amount - installmentAmount * (totalInstallments - 1)).toFixed(2))
        : installmentAmount;

      installments.push({
        tenantId,
        description: `${dto.description} - Parcela ${i}/${totalInstallments}`,
        customerName: dto.customerName,
        customerDocument: dto.customerDocument,
        categoryId: dto.categoryId,
        costCenterId: dto.costCenterId,
        bankAccountId: dto.bankAccountId,
        amount,
        dueDate,
        paymentMethod: dto.paymentMethod,
        documentNumber: dto.documentNumber,
        installmentNumber: i,
        installmentTotal: totalInstallments,
        installmentGroupId: groupId,
        notes: dto.notes,
      });
    }

    await db.accountReceivable.createMany({ data: installments });

    return db.accountReceivable.findMany({
      where: { installmentGroupId: groupId },
      include: {
        category: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true } },
      },
      orderBy: { installmentNumber: 'asc' },
    });
  }

  async findAll(filter: FilterAccountReceivableDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.status) where.status = filter.status;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.costCenterId) where.costCenterId = filter.costCenterId;

    if (filter.dueDateFrom || filter.dueDateTo) {
      const dueDateFilter: Record<string, Date> = {};
      if (filter.dueDateFrom) dueDateFilter.gte = new Date(filter.dueDateFrom);
      if (filter.dueDateTo) dueDateFilter.lte = new Date(filter.dueDateTo);
      where.dueDate = dueDateFilter;
    }

    if (filter.overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['PENDING', 'PARTIALLY_PAID'] };
    }

    if (filter.search) {
      where.OR = [
        { description: { contains: filter.search, mode: 'insensitive' } },
        { customerName: { contains: filter.search, mode: 'insensitive' } },
        { documentNumber: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      db.accountReceivable.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, code: true } },
          costCenter: { select: { id: true, name: true, code: true } },
          bankAccount: { select: { id: true, name: true, bank: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      db.accountReceivable.count({ where }),
    ]);

    const totalAmount = await db.accountReceivable.aggregate({
      where,
      _sum: { amount: true, receivedAmount: true },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalAmount: totalAmount._sum.amount ?? 0,
        totalReceived: totalAmount._sum.receivedAmount ?? 0,
      },
    };
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const ar = await db.accountReceivable.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, code: true } },
        costCenter: { select: { id: true, name: true, code: true } },
        bankAccount: { select: { id: true, name: true, bank: true } },
        transactions: { orderBy: { date: 'desc' } },
      },
    });
    if (!ar) throw new NotFoundException('Conta a receber não encontrada');
    return ar;
  }

  async update(id: string, dto: UpdateAccountReceivableDto) {
    const existing = await this.findOne(id);
    if (existing.status === 'PAID') {
      throw new BadRequestException('Conta já recebida e não pode ser alterada');
    }

    const db = this.prisma.tenantClient();
    return db.accountReceivable.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true } },
        bankAccount: { select: { id: true, name: true } },
      },
    });
  }

  async receive(id: string, dto: ReceiveAccountDto) {
    const ar = await this.findOne(id);
    if (ar.status === 'PAID') {
      throw new BadRequestException('Conta já foi recebida');
    }
    if (ar.status === 'CANCELLED') {
      throw new BadRequestException('Conta cancelada não pode ser recebida');
    }

    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();
    const newReceivedAmount = Number(ar.receivedAmount) + dto.receivedAmount;
    const totalAmount = Number(ar.amount);
    const status = newReceivedAmount >= totalAmount ? 'PAID' : 'PARTIALLY_PAID';

    const updated = await db.accountReceivable.update({
      where: { id },
      data: {
        receivedAmount: newReceivedAmount,
        receivedDate: new Date(dto.receivedDate),
        status,
        bankAccountId: dto.bankAccountId ?? ar.bankAccountId,
        paymentMethod: dto.paymentMethod ?? ar.paymentMethod,
      },
    });

    // Create financial transaction
    await db.financialTransaction.create({
      data: {
        tenantId,
        type: 'INCOME',
        description: `Recebimento: ${ar.description}`,
        amount: dto.receivedAmount,
        date: new Date(dto.receivedDate),
        bankAccountId: dto.bankAccountId ?? ar.bankAccountId,
        categoryId: ar.categoryId,
        costCenterId: ar.costCenterId,
        accountReceivableId: id,
        paymentMethod: dto.paymentMethod ?? ar.paymentMethod,
      },
    });

    // Update bank balance
    const targetBankId = dto.bankAccountId ?? ar.bankAccountId;
    if (targetBankId) {
      await db.bankAccount.update({
        where: { id: targetBankId },
        data: { currentBalance: { increment: dto.receivedAmount } },
      });
    }

    return updated;
  }

  async cancel(id: string) {
    const ar = await this.findOne(id);
    if (ar.status === 'PAID') {
      throw new BadRequestException('Conta já recebida não pode ser cancelada');
    }

    const db = this.prisma.tenantClient();
    return db.accountReceivable.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async getSummary(startDate: string, endDate: string) {
    const db = this.prisma.tenantClient();
    const dateFilter = {
      dueDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    const [total, received, pending, overdue] = await Promise.all([
      db.accountReceivable.aggregate({
        where: dateFilter,
        _sum: { amount: true },
        _count: true,
      }),
      db.accountReceivable.aggregate({
        where: { ...dateFilter, status: 'PAID' },
        _sum: { receivedAmount: true },
        _count: true,
      }),
      db.accountReceivable.aggregate({
        where: { ...dateFilter, status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
        _sum: { amount: true },
        _count: true,
      }),
      db.accountReceivable.aggregate({
        where: {
          dueDate: { lt: new Date() },
          status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      period: { startDate, endDate },
      total: { amount: total._sum.amount ?? 0, count: total._count },
      received: { amount: received._sum.receivedAmount ?? 0, count: received._count },
      pending: { amount: pending._sum.amount ?? 0, count: pending._count },
      overdue: { amount: overdue._sum.amount ?? 0, count: overdue._count },
    };
  }

  async remove(id: string) {
    const ar = await this.findOne(id);
    if (ar.status === 'PAID' || ar.status === 'PARTIALLY_PAID') {
      throw new BadRequestException('Conta com recebimentos não pode ser removida');
    }

    const db = this.prisma.tenantClient();
    return db.accountReceivable.delete({ where: { id } });
  }
}
