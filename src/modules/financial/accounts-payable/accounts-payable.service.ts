import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/update-account-payable.dto';
import { FilterAccountPayableDto } from './dto/filter-account-payable.dto';
import { PayAccountDto } from './dto/pay-account.dto';

@Injectable()
export class AccountsPayableService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountPayableDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (dto.categoryId) {
      const cat = await db.financialCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Categoria não encontrada');
      if (cat.type !== 'EXPENSE') throw new BadRequestException('Categoria deve ser do tipo EXPENSE');
    }

    if (dto.costCenterId) {
      const cc = await db.costCenter.findUnique({ where: { id: dto.costCenterId } });
      if (!cc) throw new NotFoundException('Centro de custo não encontrado');
    }

    if (dto.bankAccountId) {
      const ba = await db.bankAccount.findUnique({ where: { id: dto.bankAccountId } });
      if (!ba) throw new NotFoundException('Conta bancária não encontrada');
    }

    return db.accountPayable.create({
      data: {
        tenantId,
        description: dto.description,
        supplierName: dto.supplierName,
        supplierDocument: dto.supplierDocument,
        categoryId: dto.categoryId,
        costCenterId: dto.costCenterId,
        bankAccountId: dto.bankAccountId,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        paymentMethod: dto.paymentMethod,
        documentNumber: dto.documentNumber,
        barcode: dto.barcode,
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

  async createInstallments(dto: CreateAccountPayableDto, totalInstallments: number) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();
    const installmentAmount = Number((dto.amount / totalInstallments).toFixed(2));
    const groupId = crypto.randomUUID();
    const baseDate = new Date(dto.dueDate);

    const installments: Prisma.AccountPayableCreateManyInput[] = [];
    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const amount = i === totalInstallments
        ? Number((dto.amount - installmentAmount * (totalInstallments - 1)).toFixed(2))
        : installmentAmount;

      installments.push({
        tenantId,
        description: `${dto.description} - Parcela ${i}/${totalInstallments}`,
        supplierName: dto.supplierName,
        supplierDocument: dto.supplierDocument,
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

    await db.accountPayable.createMany({ data: installments });

    return db.accountPayable.findMany({
      where: { installmentGroupId: groupId },
      include: {
        category: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true } },
      },
      orderBy: { installmentNumber: 'asc' },
    });
  }

  async findAll(filter: FilterAccountPayableDto) {
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
        { supplierName: { contains: filter.search, mode: 'insensitive' } },
        { documentNumber: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      db.accountPayable.findMany({
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
      db.accountPayable.count({ where }),
    ]);

    const totalAmount = await db.accountPayable.aggregate({ where, _sum: { amount: true, paidAmount: true } });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalAmount: totalAmount._sum.amount ?? 0,
        totalPaid: totalAmount._sum.paidAmount ?? 0,
      },
    };
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const ap = await db.accountPayable.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, code: true } },
        costCenter: { select: { id: true, name: true, code: true } },
        bankAccount: { select: { id: true, name: true, bank: true } },
        transactions: { orderBy: { date: 'desc' } },
      },
    });
    if (!ap) throw new NotFoundException('Conta a pagar não encontrada');
    return ap;
  }

  async update(id: string, dto: UpdateAccountPayableDto) {
    const existing = await this.findOne(id);
    if (existing.status === 'PAID') {
      throw new BadRequestException('Conta já foi paga e não pode ser alterada');
    }

    const db = this.prisma.tenantClient();
    return db.accountPayable.update({
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

  async pay(id: string, dto: PayAccountDto) {
    const ap = await this.findOne(id);
    if (ap.status === 'PAID') {
      throw new BadRequestException('Conta já foi paga');
    }
    if (ap.status === 'CANCELLED') {
      throw new BadRequestException('Conta cancelada não pode ser paga');
    }

    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();
    const newPaidAmount = Number(ap.paidAmount) + dto.paidAmount;
    const totalAmount = Number(ap.amount);
    const status = newPaidAmount >= totalAmount ? 'PAID' : 'PARTIALLY_PAID';

    // Update account payable
    const updated = await db.accountPayable.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        paymentDate: new Date(dto.paymentDate),
        status,
        bankAccountId: dto.bankAccountId ?? ap.bankAccountId,
        paymentMethod: dto.paymentMethod ?? ap.paymentMethod,
      },
    });

    // Create financial transaction
    await db.financialTransaction.create({
      data: {
        tenantId,
        type: 'EXPENSE',
        description: `Pagamento: ${ap.description}`,
        amount: dto.paidAmount,
        date: new Date(dto.paymentDate),
        bankAccountId: dto.bankAccountId ?? ap.bankAccountId,
        categoryId: ap.categoryId,
        costCenterId: ap.costCenterId,
        accountPayableId: id,
        paymentMethod: dto.paymentMethod ?? ap.paymentMethod,
      },
    });

    // Update bank balance
    const targetBankId = dto.bankAccountId ?? ap.bankAccountId;
    if (targetBankId) {
      await db.bankAccount.update({
        where: { id: targetBankId },
        data: { currentBalance: { decrement: dto.paidAmount } },
      });
    }

    return updated;
  }

  async cancel(id: string) {
    const ap = await this.findOne(id);
    if (ap.status === 'PAID') {
      throw new BadRequestException('Conta já paga não pode ser cancelada');
    }

    const db = this.prisma.tenantClient();
    return db.accountPayable.update({
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

    const [total, paid, pending, overdue] = await Promise.all([
      db.accountPayable.aggregate({
        where: dateFilter,
        _sum: { amount: true },
        _count: true,
      }),
      db.accountPayable.aggregate({
        where: { ...dateFilter, status: 'PAID' },
        _sum: { paidAmount: true },
        _count: true,
      }),
      db.accountPayable.aggregate({
        where: { ...dateFilter, status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
        _sum: { amount: true },
        _count: true,
      }),
      db.accountPayable.aggregate({
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
      paid: { amount: paid._sum.paidAmount ?? 0, count: paid._count },
      pending: { amount: pending._sum.amount ?? 0, count: pending._count },
      overdue: { amount: overdue._sum.amount ?? 0, count: overdue._count },
    };
  }

  async remove(id: string) {
    const ap = await this.findOne(id);
    if (ap.status === 'PAID' || ap.status === 'PARTIALLY_PAID') {
      throw new BadRequestException('Conta com pagamentos não pode ser removida');
    }

    const db = this.prisma.tenantClient();
    return db.accountPayable.delete({ where: { id } });
  }
}
