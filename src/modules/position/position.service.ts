import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '@/modules/prisma';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async create(dto: CreatePositionDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.cls.get('tenantId');

    try {
      return await db.position.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A position with this name already exists in this tenant',
        );
      }
      throw error;
    }
  }

  async findAll() {
    const db = this.prisma.tenantClient();
    return db.position.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true } },
      },
    });
  }

  async findById(id: string) {
    const db = this.prisma.tenantClient();
    const position = await db.position.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!position) throw new NotFoundException('Position not found');
    return position;
  }

  async update(id: string, dto: UpdatePositionDto) {
    await this.findById(id);

    const db = this.prisma.tenantClient();
    try {
      return await db.position.update({
        where: { id },
        data: dto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A position with this name already exists in this tenant',
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findById(id);

    const db = this.prisma.tenantClient();
    return db.position.delete({ where: { id } });
  }
}
