import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

/**
 * Guard que extrai o tenantId do JWT (já decodificado pelo AuthGuard)
 * e injeta no CLS store para uso pelo PrismaService.
 *
 * Deve ser usado APÓS o AuthGuard na cadeia de guards.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.tenantId) {
      throw new ForbiddenException('Tenant context not found');
    }

    // Seta o tenantId no CLS para propagação automática
    this.cls.set('tenantId', user.tenantId);
    this.cls.set('userId', user.sub);
    this.cls.set('userRole', user.role);

    return true;
  }
}
