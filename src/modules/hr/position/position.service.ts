import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePositionDto) {
    const db = this.prisma.tenantClient();

    if (dto.departmentId) {
      const dept = await db.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new NotFoundException('Departamento não encontrado');
    }

    if (dto.baseSalaryMin && dto.baseSalaryMax && dto.baseSalaryMin > dto.baseSalaryMax) {
      throw new BadRequestException('O salário mínimo não pode ser maior que o máximo');
    }

    return db.position.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        name: dto.name,
        description: dto.description,
        departmentId: dto.departmentId,
        level: dto.level,
        baseSalaryMin: dto.baseSalaryMin,
        baseSalaryMax: dto.baseSalaryMax,
        isActive: dto.isActive ?? true,
      },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async findAll(departmentId?: string, onlyActive = false) {
    const db = this.prisma.tenantClient();
    return db.position.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
        ...(onlyActive ? { isActive: true } : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const position = await db.position.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        employees: {
          where: { status: 'ACTIVE' },
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
          take: 10,
        },
        _count: { select: { employees: true } },
      },
    });
    if (!position) throw new NotFoundException('Cargo não encontrado');
    return position;
  }

  async update(id: string, dto: UpdatePositionDto) {
    await this.findOne(id);

    if (dto.departmentId) {
      const dept = await this.prisma.tenantClient().department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new NotFoundException('Departamento não encontrado');
    }

    if (dto.baseSalaryMin && dto.baseSalaryMax && dto.baseSalaryMin > dto.baseSalaryMax) {
      throw new BadRequestException('O salário mínimo não pode ser maior que o máximo');
    }

    const db = this.prisma.tenantClient();
    return db.position.update({
      where: { id },
      data: dto,
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const db = this.prisma.tenantClient();
    const position = await db.position.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!position) throw new NotFoundException('Cargo não encontrado');

    if (position._count.employees > 0) {
      throw new ConflictException('Não é possível remover um cargo com funcionários vinculados');
    }

    return db.position.delete({ where: { id } });
  }
}
