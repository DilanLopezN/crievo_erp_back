import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria novo tenant (operação system-level, bypassa RLS)
   */
  async create(dto: CreateTenantDto) {
    const bypass = this.prisma.bypassClient();

    const exists = await bypass.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (exists) {
      throw new ConflictException('Tenant slug already exists');
    }

    return bypass.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        domain: dto.domain,
        plan: dto.plan,
        settings: dto.settings ?? {},
      },
    });
  }

  async findBySlug(slug: string) {
    const bypass = this.prisma.bypassClient();

    const tenant = await bypass.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return tenant;
  }

  async findById(id: string) {
    const bypass = this.prisma.bypassClient();

    const tenant = await bypass.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return tenant;
  }
}
