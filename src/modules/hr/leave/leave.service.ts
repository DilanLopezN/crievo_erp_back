import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ApproveLeaveDto, RejectLeaveDto } from './dto/review-leave.dto';
import { FilterLeaveDto } from './dto/filter-leave.dto';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  private countBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  async create(dto: CreateLeaveDto) {
    const db = this.prisma.tenantClient();

    const employee = await db.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    if (employee.status === 'TERMINATED') {
      throw new ForbiddenException('Não é possível criar afastamento para funcionário demitido');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start > end) {
      throw new BadRequestException('A data de início não pode ser maior que a data de término');
    }

    // Check for overlapping leaves
    const overlapping = await db.leave.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException('Já existe um afastamento pendente ou aprovado neste período');
    }

    const days = this.countBusinessDays(start, end);

    return db.leave.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        employeeId: dto.employeeId,
        type: dto.type,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason,
        status: 'PENDING',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  async findAll(filter: FilterLeaveDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20, employeeId, type, status, startDate, endDate } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.startDate = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      db.leave.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.leave.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const leave = await db.leave.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
    if (!leave) throw new NotFoundException('Afastamento não encontrado');
    return leave;
  }

  async approve(id: string, dto: ApproveLeaveDto, approvedById: string) {
    const leave = await this.findOne(id);

    if (leave.status !== 'PENDING') {
      throw new ConflictException(`Afastamento já está com status: ${leave.status}`);
    }

    const db = this.prisma.tenantClient();
    const updated = await db.leave.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
        rejectedNote: dto.notes,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });

    // Update employee status if on leave starting today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (leave.startDate <= today) {
      await db.employee.update({
        where: { id: leave.employeeId },
        data: { status: 'ON_LEAVE' },
      });
    }

    return updated;
  }

  async reject(id: string, dto: RejectLeaveDto, rejectedById: string) {
    const leave = await this.findOne(id);

    if (leave.status !== 'PENDING') {
      throw new ConflictException(`Afastamento já está com status: ${leave.status}`);
    }

    const db = this.prisma.tenantClient();
    return db.leave.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: rejectedById,
        approvedAt: new Date(),
        rejectedNote: dto.rejectedNote,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  async cancel(id: string, employeeId: string) {
    const leave = await this.findOne(id);

    if (leave.employeeId !== employeeId) {
      throw new ForbiddenException('Você não tem permissão para cancelar este afastamento');
    }

    if (leave.status === 'APPROVED') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (leave.startDate <= today) {
        throw new ConflictException('Não é possível cancelar um afastamento já iniciado');
      }
    }

    if (leave.status === 'REJECTED' || leave.status === 'CANCELLED') {
      throw new ConflictException(`Afastamento já está com status: ${leave.status}`);
    }

    const db = this.prisma.tenantClient();
    return db.leave.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  /** Retorna resumo de afastamentos por funcionário no ano */
  async summaryByEmployee(employeeId: string, year: number) {
    const db = this.prisma.tenantClient();

    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');

    const leaves = await db.leave.findMany({
      where: {
        employeeId,
        status: { in: ['APPROVED', 'PENDING'] },
        startDate: { gte: new Date(`${year}-01-01`) },
        endDate: { lte: new Date(`${year}-12-31`) },
      },
      orderBy: { startDate: 'asc' },
    });

    const byType = leaves.reduce(
      (acc, l) => {
        acc[l.type] = (acc[l.type] ?? 0) + l.days;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      employee: { id: employee.id, name: `${employee.firstName} ${employee.lastName}` },
      year,
      totalDays: leaves.reduce((s, l) => s + l.days, 0),
      byType,
      leaves,
    };
  }
}
