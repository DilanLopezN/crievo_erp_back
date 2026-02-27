# ERP SaaS - Multi-Tenant Backend

## Stack
- **Runtime:** Node.js + NestJS + Fastify
- **ORM:** Prisma 6
- **DB:** PostgreSQL 17 com Row Level Security (RLS)
- **Auth:** JWT (access + refresh tokens)
- **Multi-Tenant:** Shared DB + RLS + Prisma Client Extensions + nestjs-cls

## Arquitetura Multi-Tenant

```
Request → AuthGuard (JWT) → TenantGuard (seta tenantId no CLS)
                                    ↓
                           Service usa prisma.tenantClient()
                                    ↓
                    Prisma Extension: SET app.current_tenant_id
                                    ↓
                        PostgreSQL RLS filtra automaticamente
```

**Abordagem:** Shared database, shared schema com PostgreSQL RLS.

- **Sem request-scoped providers** — usa `nestjs-cls` (AsyncLocalStorage) para propagar o tenant context sem degradar performance
- **Dupla proteção** — mesmo que o dev esqueça de filtrar por tenant, o RLS no PostgreSQL garante isolamento
- **`prisma.tenantClient()`** — para queries tenant-scoped (automático)
- **`prisma.bypassClient()`** — para queries system-level (login, lookup de tenant, admin)

## Setup

```bash
# 1. Subir PostgreSQL
docker compose up -d

# 2. Instalar dependências
npm install

# 3. Gerar Prisma Client
npx prisma generate

# 4. Rodar migrations
npx prisma migrate dev --name init

# 5. Aplicar RLS (após migration inicial)
# Conecte no banco e execute:
psql $DATABASE_URL -f prisma/migrations/enable_rls.sql

# 6. Seed
npm run prisma:seed

# 7. Rodar
npm run start:dev
```

## API Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /api/v1/auth/register | ❌ | Cria tenant + owner |
| POST | /api/v1/auth/login | ❌ | Login com tenant context |
| POST | /api/v1/tenants | ❌ | Cria tenant |
| GET | /api/v1/tenants/:slug | ❌ | Busca tenant por slug |
| GET | /api/v1/users | ✅ | Lista users do tenant |
| GET | /api/v1/users/:id | ✅ | Busca user por ID |
| PATCH | /api/v1/users/:id/deactivate | ✅ OWNER/ADMIN | Desativa user |
| GET | /api/v1/health | ❌ | Health check |

Swagger: `http://localhost:3000/docs`

## Estrutura

```
src/
├── main.ts                          # Bootstrap Fastify
├── app.module.ts                    # Root module
├── config/                          # Config registrars
├── common/
│   ├── decorators/                  # @Public, @Roles, @CurrentUser
│   ├── filters/                     # AllExceptionsFilter
│   └── guards/                      # RolesGuard
└── modules/
    ├── prisma/                      # PrismaService (tenantClient/bypassClient)
    ├── auth/                        # JWT auth + register
    ├── tenant/                      # TenantGuard + CRUD
    ├── user/                        # Exemplo de módulo tenant-scoped
    └── health/                      # Health check
```

## Adicionando novos módulos de ERP

Todo módulo que lida com dados de tenant deve:

1. Adicionar `tenantId` no model do Prisma
2. Usar `this.prisma.tenantClient()` no service
3. Aplicar `@UseGuards(TenantGuard)` no controller
4. Adicionar RLS policy na tabela no `enable_rls.sql`

```typescript
// Exemplo: ProductService
@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const db = this.prisma.tenantClient(); // ← isolamento automático
    return db.product.findMany();
  }
}
```
