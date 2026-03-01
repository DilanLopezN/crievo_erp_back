import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClockActionDto } from './dto/clock-action.dto';
import { AdjustTimeRecordDto } from './dto/adjust-time-record.dto';
import { FilterTimeRecordDto } from './dto/filter-time-record.dto';


@Injectable()
export class TimeRecordService {
  constructor(private readonly prisma: PrismaService) {}

  private todayDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private parseTimeToDate(date: Date, time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  }

  /**
   * Calculate worked minutes considering lunch break.
   * Validates CLT rules:
   *  - Lunch must be >= 60 min when total work > 6h
   */
  private calculateMinutes(
    entryTime: Date,
    exitTime: Date,
    lunchStartTime?: Date | null,
    lunchEndTime?: Date | null,
  ): { workedMinutes: number; lunchMinutes: number } {
    const totalMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / 60000);
    let lunchMinutes = 0;

    if (lunchStartTime && lunchEndTime) {
      lunchMinutes = Math.floor((lunchEndTime.getTime() - lunchStartTime.getTime()) / 60000);
    }

    const workedMinutes = totalMinutes - lunchMinutes;
    return { workedMinutes, lunchMinutes };
  }

  private computeExtraAndMissing(
    workedMinutes: number,
    expectedMinutes: number,
  ): { extraMinutes: number; missingMinutes: number } {
    if (workedMinutes >= expectedMinutes) {
      return { extraMinutes: workedMinutes - expectedMinutes, missingMinutes: 0 };
    }
    return { extraMinutes: 0, missingMinutes: expectedMinutes - workedMinutes };
  }

  private getExpectedMinutes(workSchedule: {
    entryTime: string;
    exitTime: string;
    lunchDuration: number;
  }): number {
    const [eH, eM] = workSchedule.entryTime.split(':').map(Number);
    const [xH, xM] = workSchedule.exitTime.split(':').map(Number);
    const total = (xH * 60 + xM) - (eH * 60 + eM);
    return total - workSchedule.lunchDuration;
  }

  /** Bater Entrada */
  async clockIn(employeeId: string, dto: ClockActionDto) {
    const db = this.prisma.tenantClient();

    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    if (employee.status !== 'ACTIVE') throw new ForbiddenException('Funcionário não está ativo');

    const today = this.todayDate();
    const existing = await db.timeRecord.findFirst({
      where: { employeeId, date: today },
    });

    if (existing?.entryTime) {
      throw new ConflictException('Entrada já registrada para hoje');
    }

    const now = new Date();

    if (existing) {
      return db.timeRecord.update({
        where: { id: existing.id },
        data: { entryTime: now, notes: dto.notes, location: dto.location ?? undefined },
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      });
    }

    return db.timeRecord.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        employeeId,
        date: today,
        entryTime: now,
        type: 'NORMAL',
        status: 'PENDING',
        notes: dto.notes,
        location: dto.location ?? undefined,
      },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  /** Iniciar Almoço */
  async lunchStart(employeeId: string, dto: ClockActionDto) {
    const db = this.prisma.tenantClient();
    const today = this.todayDate();

    const record = await db.timeRecord.findFirst({ where: { employeeId, date: today } });
    if (!record) throw new NotFoundException('Entrada não registrada hoje');
    if (!record.entryTime) throw new BadRequestException('Bata a entrada antes de iniciar o almoço');
    if (record.lunchStartTime) throw new ConflictException('Almoço já iniciado hoje');

    return db.timeRecord.update({
      where: { id: record.id },
      data: { lunchStartTime: new Date(), notes: dto.notes ?? record.notes },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  /** Retornar do Almoço */
  async lunchEnd(employeeId: string, dto: ClockActionDto) {
    const db = this.prisma.tenantClient();
    const today = this.todayDate();

    const record = await db.timeRecord.findFirst({ where: { employeeId, date: today } });
    if (!record) throw new NotFoundException('Entrada não registrada hoje');
    if (!record.lunchStartTime) throw new BadRequestException('Almoço não foi iniciado');
    if (record.lunchEndTime) throw new ConflictException('Retorno do almoço já registrado');

    const now = new Date();

    return db.timeRecord.update({
      where: { id: record.id },
      data: { lunchEndTime: now, notes: dto.notes ?? record.notes },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  /** Bater Saída */
  async clockOut(employeeId: string, dto: ClockActionDto) {
    const db = this.prisma.tenantClient();
    const today = this.todayDate();

    const record = await db.timeRecord.findFirst({
      where: { employeeId, date: today },
    });
    if (!record) throw new NotFoundException('Entrada não registrada hoje');
    if (!record.entryTime) throw new BadRequestException('Bata a entrada antes de registrar a saída');
    if (record.exitTime) throw new ConflictException('Saída já registrada para hoje');

    if (record.lunchStartTime && !record.lunchEndTime) {
      throw new BadRequestException('Retorno do almoço não foi registrado');
    }

    const now = new Date();
    const { workedMinutes } = this.calculateMinutes(
      record.entryTime,
      now,
      record.lunchStartTime,
      record.lunchEndTime,
    );

    // Get expected minutes from work schedule
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { workSchedule: true },
    });

    let expectedMinutes = 480; // Default 8h
    if (employee?.workSchedule) {
      expectedMinutes = this.getExpectedMinutes(employee.workSchedule);
    }

    const { extraMinutes, missingMinutes } = this.computeExtraAndMissing(workedMinutes, expectedMinutes);

    return db.timeRecord.update({
      where: { id: record.id },
      data: {
        exitTime: now,
        workedMinutes,
        extraMinutes,
        missingMinutes,
        notes: dto.notes ?? record.notes,
        location: dto.location ?? record.location ?? undefined,
      },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  /** Obter registro de hoje do funcionário */
  async getToday(employeeId: string) {
    const db = this.prisma.tenantClient();
    const today = this.todayDate();

    const record = await db.timeRecord.findFirst({
      where: { employeeId, date: today },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });

    if (!record) {
      return {
        message: 'Nenhum registro de ponto para hoje',
        date: today,
        status: 'NOT_STARTED',
      };
    }

    return {
      ...record,
      currentStatus: this.getCurrentStatus(record),
    };
  }

  private getCurrentStatus(record: {
    entryTime: Date | null;
    lunchStartTime: Date | null;
    lunchEndTime: Date | null;
    exitTime: Date | null;
  }): string {
    if (!record.entryTime) return 'NOT_STARTED';
    if (!record.lunchStartTime) return 'WORKING';
    if (!record.lunchEndTime) return 'LUNCH';
    if (!record.exitTime) return 'WORKING';
    return 'COMPLETED';
  }

  /** Listar registros com filtros */
  async findAll(filter: FilterTimeRecordDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 30, employeeId, startDate, endDate, status } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      db.timeRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      db.timeRecord.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Relatório de ponto por funcionário em período */
  async report(employeeId: string, startDate: string, endDate: string) {
    const db = this.prisma.tenantClient();

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { workSchedule: true },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');

    const records = await db.timeRecord.findMany({
      where: {
        employeeId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });

    const totalWorkedMinutes = records.reduce((sum, r) => sum + (r.workedMinutes ?? 0), 0);
    const totalExtraMinutes = records.reduce((sum, r) => sum + (r.extraMinutes ?? 0), 0);
    const totalMissingMinutes = records.reduce((sum, r) => sum + (r.missingMinutes ?? 0), 0);
    const daysWorked = records.filter((r) => r.exitTime).length;
    const pendingDays = records.filter((r) => !r.exitTime && r.entryTime).length;

    return {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeCode,
      },
      period: { startDate, endDate },
      summary: {
        daysWorked,
        pendingDays,
        totalWorkedMinutes,
        totalWorkedHours: +(totalWorkedMinutes / 60).toFixed(2),
        totalExtraMinutes,
        totalExtraHours: +(totalExtraMinutes / 60).toFixed(2),
        totalMissingMinutes,
        totalMissingHours: +(totalMissingMinutes / 60).toFixed(2),
      },
      records,
    };
  }

  /** Ajustar/Aprovar/Rejeitar registro de ponto (gestores) */
  async adjust(id: string, dto: AdjustTimeRecordDto, adjustedById: string) {
    const db = this.prisma.tenantClient();
    const record = await db.timeRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Registro de ponto não encontrado');

    const date = record.date;

    const entryTime = dto.entryTime ? this.parseTimeToDate(date, dto.entryTime) : record.entryTime;
    const lunchStartTime = dto.lunchStartTime
      ? this.parseTimeToDate(date, dto.lunchStartTime)
      : record.lunchStartTime;
    const lunchEndTime = dto.lunchEndTime
      ? this.parseTimeToDate(date, dto.lunchEndTime)
      : record.lunchEndTime;
    const exitTime = dto.exitTime ? this.parseTimeToDate(date, dto.exitTime) : record.exitTime;

    let workedMinutes = record.workedMinutes;
    let extraMinutes = record.extraMinutes;
    let missingMinutes = record.missingMinutes;

    if (entryTime && exitTime) {
      const calc = this.calculateMinutes(entryTime, exitTime, lunchStartTime, lunchEndTime);
      workedMinutes = calc.workedMinutes;

      const employee = await db.employee.findUnique({
        where: { id: record.employeeId },
        include: { workSchedule: true },
      });
      const expectedMinutes = employee?.workSchedule
        ? this.getExpectedMinutes(employee.workSchedule)
        : 480;

      const computed = this.computeExtraAndMissing(workedMinutes, expectedMinutes);
      extraMinutes = computed.extraMinutes;
      missingMinutes = computed.missingMinutes;
    }

    return db.timeRecord.update({
      where: { id },
      data: {
        entryTime,
        lunchStartTime,
        lunchEndTime,
        exitTime,
        workedMinutes,
        extraMinutes,
        missingMinutes,
        status: dto.status ?? 'ADJUSTED',
        notes: dto.notes ?? record.notes,
        adjustedById,
        adjustedAt: new Date(),
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }
}
