import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ClsModule } from 'nestjs-cls';

import { appConfig, jwtConfig, throttleConfig } from '@/config';
import { PrismaModule } from '@/modules/prisma';
import { AuthModule, AuthGuard } from '@/modules/auth';
import { TenantModule } from '@/modules/tenant';
import { UserModule } from '@/modules/user';
import { HealthModule } from '@/modules/health/health.module';
import { HrModule } from '@/modules/hr/hr.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, throttleConfig],
    }),

    // CLS - AsyncLocalStorage para propagação do tenantId
    // Sem request-scope, sem overhead de performance
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true, // Monta automaticamente como middleware Fastify
      },
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl: config.get<number>('throttle.ttl') ?? 60000,
          limit: config.get<number>('throttle.limit') ?? 100,
        }],
      }),
    }),

    // Core modules
    PrismaModule,
    AuthModule,
    TenantModule,

    // Feature modules
    UserModule,
    HealthModule,

    // HR Module
    HrModule,
  ],
  providers: [
    // AuthGuard global - todas as rotas protegidas por padrão
    // Use @Public() para rotas abertas
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // Throttle global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
