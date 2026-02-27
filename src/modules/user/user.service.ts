import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '@/modules/prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  position: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
} as const;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async create(dto: CreateUserDto) {
    const db = this.prisma.tenantClient();
    const tenantId = this.cls.get('tenantId');

    if (dto.positionId) {
      const position = await db.position.findUnique({
        where: { id: dto.positionId },
      });
      if (!position) {
        throw new BadRequestException('Position not found in this tenant');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      return await db.user.create({
        data: {
          tenantId,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          positionId: dto.positionId,
        },
        select: USER_SELECT,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A user with this email already exists in this tenant',
        );
      }
      throw error;
    }
  }

  async findAll() {
    const db = this.prisma.tenantClient();
    return db.user.findMany({ select: USER_SELECT });
  }

  async findById(id: string) {
    const db = this.prisma.tenantClient();
    const user = await db.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    const db = this.prisma.tenantClient();

    if (dto.positionId) {
      const position = await db.position.findUnique({
        where: { id: dto.positionId },
      });
      if (!position) {
        throw new BadRequestException('Position not found in this tenant');
      }
    }

    return db.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        positionId: dto.positionId,
        isActive: dto.isActive,
      },
      select: USER_SELECT,
    });
  }

  async deactivate(id: string) {
    const db = this.prisma.tenantClient();
    return db.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }
}
