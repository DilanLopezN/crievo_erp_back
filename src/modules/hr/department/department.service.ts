import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    const db = this.prisma.tenantClient();

    if (dto.parentId) {
      const parent = await db.department.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Departamento pai não encontrado');
    }

    return db.department.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        managerId: dto.managerId,
        isActive: dto.isActive ?? true,
      },
      include: { parent: { select: { id: true, name: true } } },
    });
  }

  async findAll(onlyActive = false) {
    const db = this.prisma.tenantClient();
    return db.department.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { employees: true, positions: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const db = this.prisma.tenantClient();
    const department = await db.department.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, isActive: true } },
        positions: { select: { id: true, name: true, level: true, isActive: true } },
        _count: { select: { employees: true } },
      },
    });
    if (!department) throw new NotFoundException('Departamento não encontrado');
    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);

    if (dto.parentId === id) {
      throw new ConflictException('Um departamento não pode ser seu próprio pai');
    }

    if (dto.parentId) {
      const parent = await this.prisma.tenantClient().department.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Departamento pai não encontrado');
    }

    const db = this.prisma.tenantClient();
    return db.department.update({
      where: { id },
      data: dto,
      include: { parent: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const db = this.prisma.tenantClient();
    const department = await db.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true, children: true } } },
    });
    if (!department) throw new NotFoundException('Departamento não encontrado');

    if (department._count.employees > 0) {
      throw new ConflictException('Não é possível remover um departamento com funcionários vinculados');
    }
    if (department._count.children > 0) {
      throw new ConflictException('Não é possível remover um departamento com subdepartamentos');
    }

    return db.department.delete({ where: { id } });
  }
}
