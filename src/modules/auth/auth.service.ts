import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@/modules/prisma';
import { TenantService } from '@/modules/tenant';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './auth.guard';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Login: operação bypass RLS pois precisa encontrar user pelo email+tenant
   */
  async login(dto: LoginDto) {
    const bypass = this.prisma.bypassClient();

    const tenant = await this.tenantService.findBySlug(dto.tenantSlug);

    const user = await bypass.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email,
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await bypass.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens({
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * Registro: cria tenant + primeiro user (OWNER)
   */
  async register(dto: RegisterDto) {
    const bypass = this.prisma.bypassClient();

    const existingTenant = await bypass.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });

    if (existingTenant) {
      throw new ConflictException('Tenant slug already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const tenant = await bypass.tenant.create({
      data: {
        name: dto.tenantName,
        slug: dto.tenantSlug,
        users: {
          create: {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];

    return this.generateTokens({
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    });
  }

  private async generateTokens(payload: JwtPayload) {
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = uuidv4();
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';
    const days = parseInt(refreshExpiresIn);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const bypass = this.prisma.bypassClient();
    await bypass.refreshToken.create({
      data: {
        userId: payload.sub,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    };
  }
}
