import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { FilterEmployeeDto } from './dto/filter-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateEmployeeCode(db: ReturnType<PrismaService['tenantClient']>): Promise<string> {
    const count = await db.employee.count();
    return `EMP${String(count + 1).padStart(5, '0')}`;
  }

  async create(dto: CreateEmployeeDto) {
    const db = this.prisma.tenantClient();

    if (dto.cpf) {
      const existing = await db.employee.findFirst({ where: { cpf: dto.cpf } });
      if (existing) throw new ConflictException('CPF já cadastrado para outro funcionário');
    }

    if (dto.positionId) {
      const pos = await db.position.findUnique({ where: { id: dto.positionId } });
      if (!pos) throw new NotFoundException('Cargo não encontrado');
    }

    if (dto.departmentId) {
      const dept = await db.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new NotFoundException('Departamento não encontrado');
    }

    if (dto.workScheduleId) {
      const ws = await db.workSchedule.findUnique({ where: { id: dto.workScheduleId } });
      if (!ws) throw new NotFoundException('Escala de trabalho não encontrada');
    }

    const employeeCode = dto.employeeCode ?? (await this.generateEmployeeCode(db));

    return db.employee.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        cpf: dto.cpf,
        rg: dto.rg,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        hireDate: new Date(dto.hireDate),
        positionId: dto.positionId,
        departmentId: dto.departmentId,
        workScheduleId: dto.workScheduleId,
        userId: dto.userId,
        contractType: dto.contractType,
        salary: dto.salary,
        status: dto.status ?? 'ACTIVE',
        photo: dto.photo,
        address: dto.address ?? undefined,
        emergencyContact: dto.emergencyContact ?? undefined,
        bankInfo: dto.bankInfo ?? undefined,
        notes: dto.notes,
      },
      include: {
        position: { select: { id: true, name: true, level: true } },
        department: { select: { id: true, name: true } },
        workSchedule: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(filter: FilterEmployeeDto) {
    const db = this.prisma.tenantClient();
    const { page = 1, limit = 20, search, status, contractType, departmentId, positionId } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (contractType) where.contractType = contractType;
    if (departmentId) where.departmentId = departmentId;
    if (positionId) where.positionId = positionId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      db.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          position: { select: { id: true, name: true, level: true } },
          department: { select: { id: true, name: true } },
          workSchedule: { select: { id: true, name: true } },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      db.employee.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        position: { select: { id: true, name: true, level: true, baseSalaryMin: true, baseSalaryMax: true } },
        department: { select: { id: true, name: true } },
        workSchedule: true,
        _count: { select: { timeRecords: true, leaves: true } },
      },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();

    if (dto.cpf) {
      const existing = await db.employee.findFirst({ where: { cpf: dto.cpf, NOT: { id } } });
      if (existing) throw new ConflictException('CPF já cadastrado para outro funcionário');
    }

    if (dto.positionId) {
      const pos = await db.position.findUnique({ where: { id: dto.positionId } });
      if (!pos) throw new NotFoundException('Cargo não encontrado');
    }

    if (dto.departmentId) {
      const dept = await db.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new NotFoundException('Departamento não encontrado');
    }

    if (dto.workScheduleId) {
      const ws = await db.workSchedule.findUnique({ where: { id: dto.workScheduleId } });
      if (!ws) throw new NotFoundException('Escala de trabalho não encontrada');
    }

    return db.employee.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
        address: dto.address ?? undefined,
        emergencyContact: dto.emergencyContact ?? undefined,
        bankInfo: dto.bankInfo ?? undefined,
      },
      include: {
        position: { select: { id: true, name: true, level: true } },
        department: { select: { id: true, name: true } },
        workSchedule: { select: { id: true, name: true } },
      },
    });
  }

  async terminate(id: string, terminationDate: string) {
    await this.findOne(id);
    const db = this.prisma.tenantClient();
    return db.employee.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        terminationDate: new Date(terminationDate),
      },
    });
  }

  async remove(id: string) {
    const db = this.prisma.tenantClient();
    const employee = await db.employee.findUnique({
      where: { id },
      include: { _count: { select: { timeRecords: true, leaves: true } } },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    return db.employee.delete({ where: { id } });
  }
}
