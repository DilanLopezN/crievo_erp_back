import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';

@Injectable()
export class WorkScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkScheduleDto) {
    const db = this.prisma.tenantClient();
    return db.workSchedule.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        name: dto.name,
        workDays: dto.workDays,
        entryTime: dto.entryTime,
        exitTime: dto.exitTime,
        lunchDuration: dto.lunchDuration ?? 60,
        weeklyHours: dto.weeklyHours ?? 44,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(onlyActive = false) {
    const db = this.prisma.tenantClient();
    return db.workSchedule.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const ws = await db.workSchedule.findUnique({
      where: { id },
      include: {
        employees: {
          where: { status: 'ACTIVE' },
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
          take: 10,
        },
        _count: { select: { employees: true } },
      },
    });
    if (!ws) throw new NotFoundException('Escala de trabalho não encontrada');
    return ws;
  }

  async update(id: string, dto: UpdateWorkScheduleDto) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();
    return db.workSchedule.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const db = this.prisma.tenantClient();
    const ws = await db.workSchedule.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!ws) throw new NotFoundException('Escala de trabalho não encontrada');

    if (ws._count.employees > 0) {
      throw new ConflictException('Não é possível remover uma escala com funcionários vinculados');
    }

    return db.workSchedule.delete({ where: { id } });
  }

  /** Calcula os minutos esperados de trabalho em um dia baseado na escala */
  calculateExpectedMinutes(ws: { entryTime: string; exitTime: string; lunchDuration: number }): number {
    const [entryH, entryM] = ws.entryTime.split(':').map(Number);
    const [exitH, exitM] = ws.exitTime.split(':').map(Number);
    const totalMinutes = (exitH * 60 + exitM) - (entryH * 60 + entryM);
    return totalMinutes - ws.lunchDuration;
  }
}
