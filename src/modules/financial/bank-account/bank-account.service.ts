import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Injectable()
export class BankAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBankAccountDto) {
    const db = this.prisma.tenantClient();

    return db.bankAccount.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        name: dto.name,
        bank: dto.bank,
        agency: dto.agency,
        accountNumber: dto.accountNumber,
        accountType: dto.accountType,
        pixKey: dto.pixKey,
        initialBalance: dto.initialBalance ?? 0,
        currentBalance: dto.initialBalance ?? 0,
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
        { bank: { contains: search, mode: 'insensitive' } },
      ];
    }

    return db.bankAccount.findMany({
      where,
      include: {
        _count: { select: { transactions: true, bankStatements: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const account = await db.bankAccount.findUnique({
      where: { id },
      include: {
        _count: { select: { transactions: true, bankStatements: true } },
      },
    });
    if (!account) throw new NotFoundException('Conta bancária não encontrada');
    return account;
  }

  async update(id: string, dto: UpdateBankAccountDto) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();

    return db.bankAccount.update({
      where: { id },
      data: {
        name: dto.name,
        bank: dto.bank,
        agency: dto.agency,
        accountNumber: dto.accountNumber,
        accountType: dto.accountType,
        pixKey: dto.pixKey,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    const account = await this.findOne(id);
    const db = this.prisma.tenantClient();

    if (account._count.transactions > 0) {
      throw new ConflictException('Conta bancária possui transações vinculadas e não pode ser removida');
    }

    return db.bankAccount.delete({ where: { id } });
  }

  async getBalance(id: string) {
    const account = await this.findOne(id);
    return {
      id: account.id,
      name: account.name,
      currentBalance: account.currentBalance,
      bank: account.bank,
    };
  }

  async recalculateBalance(bankAccountId: string) {
    const db = this.prisma.tenantClient();
    const account = await this.findOne(bankAccountId);

    const transactions = await db.financialTransaction.findMany({
      where: { bankAccountId },
      select: { type: true, amount: true },
    });

    let balance = Number(account.initialBalance);
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (tx.type === 'INCOME') {
        balance += amount;
      } else if (tx.type === 'EXPENSE') {
        balance -= amount;
      } else if (tx.type === 'TRANSFER') {
        balance -= amount;
      }
    }

    // Check if this account is a target of transfers
    const transfersIn = await db.financialTransaction.findMany({
      where: { transferToBankAccountId: bankAccountId },
      select: { amount: true },
    });

    for (const tx of transfersIn) {
      balance += Number(tx.amount);
    }

    await db.bankAccount.update({
      where: { id: bankAccountId },
      data: { currentBalance: balance },
    });

    return { id: bankAccountId, currentBalance: balance };
  }
}
