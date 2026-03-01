import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransactionDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.prisma.getTenantId();

    if (dto.type === 'TRANSFER' && !dto.transferToBankAccountId) {
      throw new BadRequestException('Transferência requer conta bancária de destino');
    }

    if (dto.type === 'TRANSFER' && !dto.bankAccountId) {
      throw new BadRequestException('Transferência requer conta bancária de origem');
    }

    if (dto.bankAccountId) {
      const ba = await db.bankAccount.findUnique({ where: { id: dto.bankAccountId } });
      if (!ba) throw new NotFoundException('Conta bancária de origem não encontrada');
    }

    if (dto.transferToBankAccountId) {
      const ba = await db.bankAccount.findUnique({ where: { id: dto.transferToBankAccountId } });
      if (!ba) throw new NotFoundException('Conta bancária de destino não encontrada');
    }

    if (dto.categoryId) {
      const cat = await db.financialCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Categoria não encontrada');
    }

    const transaction = await db.financialTransaction.create({
      data: {
        tenantId,
        type: dto.type,
        description: dto.description,
        amount: dto.amount,
        date: new Date(dto.date),
        bankAccountId: dto.bankAccountId,
        categoryId: dto.categoryId,
        costCenterId: dto.costCenterId,
        paymentMethod: dto.paymentMethod,
        transferToBankAccountId: dto.transferToBankAccountId,
        notes: dto.notes,
      },
      include: {
        bankAccount: { select: { id: true, name: true, bank: true } },
        category: { select: { id: true, name: true, code: true } },
        costCenter: { select: { id: true, name: true } },
      },
    });

    // Update bank balances
    if (dto.bankAccountId) {
      if (dto.type === 'INCOME') {
        await db.bankAccount.update({
          where: { id: dto.bankAccountId },
          data: { currentBalance: { increment: dto.amount } },
        });
      } else if (dto.type === 'EXPENSE' || dto.type === 'TRANSFER') {
        await db.bankAccount.update({
          where: { id: dto.bankAccountId },
          data: { currentBalance: { decrement: dto.amount } },
        });
      }
    }

    if (dto.type === 'TRANSFER' && dto.transferToBankAccountId) {
      await db.bankAccount.update({
        where: { id: dto.transferToBankAccountId },
        data: { currentBalance: { increment: dto.amount } },
      });
    }

    return transaction;
  }

  async findAll(filter: FilterTransactionDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.type) where.type = filter.type;
    if (filter.bankAccountId) where.bankAccountId = filter.bankAccountId;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.costCenterId) where.costCenterId = filter.costCenterId;
    if (filter.reconciled !== undefined) where.reconciled = filter.reconciled;

    if (filter.dateFrom || filter.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filter.dateFrom) dateFilter.gte = new Date(filter.dateFrom);
      if (filter.dateTo) dateFilter.lte = new Date(filter.dateTo);
      where.date = dateFilter;
    }

    if (filter.search) {
      where.OR = [
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      db.financialTransaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          bankAccount: { select: { id: true, name: true, bank: true } },
          category: { select: { id: true, name: true, code: true } },
          costCenter: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
      db.financialTransaction.count({ where }),
    ]);

    const aggregation = await db.financialTransaction.aggregate({
      where,
      _sum: { amount: true },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalAmount: aggregation._sum.amount ?? 0,
      },
    };
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const transaction = await db.financialTransaction.findUnique({
      where: { id },
      include: {
        bankAccount: { select: { id: true, name: true, bank: true } },
        category: { select: { id: true, name: true, code: true } },
        costCenter: { select: { id: true, name: true } },
        accountPayable: { select: { id: true, description: true, supplierName: true } },
        accountReceivable: { select: { id: true, description: true, customerName: true } },
        bankStatement: { select: { id: true, description: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Transação não encontrada');
    return transaction;
  }

  async remove(id: string) {
    const tx = await this.findOne(id);
    const db = this.prisma.tenantClient();

    // Reverse bank balance
    if (tx.bankAccountId) {
      if (tx.type === 'INCOME') {
        await db.bankAccount.update({
          where: { id: tx.bankAccountId },
          data: { currentBalance: { decrement: Number(tx.amount) } },
        });
      } else if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER') {
        await db.bankAccount.update({
          where: { id: tx.bankAccountId },
          data: { currentBalance: { increment: Number(tx.amount) } },
        });
      }
    }

    if (tx.type === 'TRANSFER' && tx.transferToBankAccountId) {
      await db.bankAccount.update({
        where: { id: tx.transferToBankAccountId },
        data: { currentBalance: { decrement: Number(tx.amount) } },
      });
    }

    return db.financialTransaction.delete({ where: { id } });
  }
}
