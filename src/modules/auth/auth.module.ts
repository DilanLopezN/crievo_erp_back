import { Module } from '@nestjs/common'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { TenantModule } from '@/modules/tenant'

@Module({
  imports: [
    TenantModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.get<string>('JWT_SECRET')
        const expiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '24h'

        if (!secret) {
          throw new Error('JWT_SECRET is not defined')
        }

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any // necessário por tipagem do pacote
          }
        }
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard, JwtModule]
})
export class AuthModule {}
