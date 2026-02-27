import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma';

/**
 * Exemplo de service tenant-scoped.
 * Usa `this.prisma.tenantClient()` — todas as queries são
 * automaticamente filtradas pelo tenant do usuário logado.
 */
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const db = this.prisma.tenantClient();
    return db.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    const db = this.prisma.tenantClient();
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async deactivate(id: string) {
    const db = this.prisma.tenantClient();
    return db.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
