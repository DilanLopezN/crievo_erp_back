import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

/**
 * PrismaService com suporte a multi-tenant via:
 * - CLS (Continuation Local Storage) para propagação do tenantId sem request-scope
 * - Prisma Client Extensions ($allOperations) para injetar SET tenant antes de cada query
 * - PostgreSQL RLS (Row Level Security) para isolamento no nível do banco
 *
 * Fluxo:
 * 1. TenantGuard extrai tenantId do JWT e seta no CLS
 * 2. PrismaService lê tenantId do CLS em cada operação
 * 3. Executa SET app.current_tenant_id antes de cada query
 * 4. PostgreSQL RLS filtra automaticamente por tenant
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly cls: ClsService) {
    super({
      log: [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }

  /**
   * Retorna um Prisma Client extended com tenant context via RLS.
   * Toda query executada por esse client terá isolamento automático.
   */
  tenantClient() {
    const tenantId = this.cls.get('tenantId');

    if (!tenantId) {
      throw new Error('Tenant ID not found in context. Ensure TenantGuard is applied.');
    }

    return this.$extends({
      query: {
        $allOperations: async ({ args, query, operation }) => {
          const [, result] = await this.$transaction([
            this.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    });
  }

  /**
   * Client que bypassa RLS — para operações admin/system.
   * Ex: lookup de tenant pelo slug, login inicial, etc.
   */
  bypassClient() {
    return this.$extends({
      query: {
        $allOperations: async ({ args, query }) => {
          const [, result] = await this.$transaction([
            this.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    });
  }
}
