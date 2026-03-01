# Crievo ERP SaaS - Multi-Tenant Backend

## Stack
- **Runtime:** Node.js + NestJS 11 + Fastify
- **ORM:** Prisma 6
- **DB:** PostgreSQL 17 com Row Level Security (RLS)
- **Auth:** JWT (access + refresh tokens)
- **Multi-Tenant:** Shared DB + Multi-Schema + RLS + Prisma Client Extensions + nestjs-cls

## Schemas do Banco de Dados

O banco de dados esta organizado em **3 schemas semanticos**:

| Schema | Dominio | Tabelas |
|--------|---------|---------|
| `core` | Multi-tenant e Autenticacao | Tenant, User, RefreshToken, Invitation |
| `rh` | Recursos Humanos | Department, Position, WorkSchedule, Employee, TimeRecord, Leave |
| `financeiro` | Gestao Financeira | FinancialCategory, CostCenter, BankAccount, AccountPayable, AccountReceivable, FinancialTransaction, BankStatement |

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

**Abordagem:** Shared database, multi-schema com PostgreSQL RLS.

- **Sem request-scoped providers** — usa `nestjs-cls` (AsyncLocalStorage) para propagar o tenant context sem degradar performance
- **Dupla protecao** — mesmo que o dev esqueca de filtrar por tenant, o RLS no PostgreSQL garante isolamento
- **`prisma.tenantClient()`** — para queries tenant-scoped (automatico)
- **`prisma.bypassClient()`** — para queries system-level (login, lookup de tenant, admin)

## Setup

```bash
# 1. Subir PostgreSQL
docker compose up -d

# 2. Instalar dependencias
npm install

# 3. Gerar Prisma Client
npx prisma generate

# 4. Rodar migrations
npx prisma migrate dev --name init

# 5. Aplicar RLS (apos migration inicial)
psql $DATABASE_URL -f prisma/migrations/enable_rls.sql

# 6. Seed
npm run prisma:seed

# 7. Rodar
npm run start:dev
```

## Documentacao

| Documento | Descricao |
|-----------|-----------|
| [docs/DATABASE.md](docs/DATABASE.md) | Schemas, tabelas, relacionamentos e diagramas |
| [docs/FEATURES.md](docs/FEATURES.md) | Features completas com exemplos de uso |
| [docs/API.md](docs/API.md) | Referencia completa de endpoints da API |

Swagger: `http://localhost:3000/docs`

## Estrutura do Projeto

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
    ├── user/                        # Gestao de usuarios
    ├── health/                      # Health check
    ├── hr/                          # Recursos Humanos
    │   ├── department/              #   Departamentos (hierarquico)
    │   ├── position/                #   Cargos e niveis
    │   ├── work-schedule/           #   Escalas de trabalho
    │   ├── employee/                #   Funcionarios
    │   ├── time-record/             #   Ponto eletronico
    │   └── leave/                   #   Ferias e licencas
    └── financial/                   # Gestao Financeira
        ├── category/                #   Categorias (hierarquica)
        ├── cost-center/             #   Centros de custo
        ├── bank-account/            #   Contas bancarias
        ├── accounts-payable/        #   Contas a pagar
        ├── accounts-receivable/     #   Contas a receber
        ├── transaction/             #   Transacoes
        ├── bank-reconciliation/     #   Conciliacao bancaria
        ├── cash-flow/               #   Fluxo de caixa
        ├── dashboard/               #   Dashboard financeiro
        └── dre/                     #   DRE
```

## Como os Modulos se Conectam

```
┌─────────────────────────────────────────────┐
│               CORE (core)                    │
│  Tenant → User → RefreshToken / Invitation   │
└─────────────────┬───────────────────────────┘
                  │ tenant_id
     ┌────────────┼────────────┐
     │            │            │
┌────▼────┐       │     ┌──────▼──────┐
│   RH    │       │     │ FINANCEIRO  │
│  (rh)   │       │     │(financeiro) │
│         │       │     │             │
│ Dept ←──┼── Employee  │ Category    │
│ Position│       │     │ CostCenter  │
│ Schedule│       │     │ BankAccount │
│ TimeRec │       │     │ AP / AR     │
│ Leave   │       │     │ Transaction │
└─────────┘       │     │ Statement   │
                  │     │ DRE         │
                  │     └─────────────┘
                  │
     Todos isolados por tenant_id + RLS
```

## Adicionando Novos Modulos

Todo modulo que lida com dados de tenant deve:

1. Adicionar `tenantId` no model do Prisma com `@@schema("nome_schema")`
2. Usar `this.prisma.tenantClient()` no service
3. Aplicar `@UseGuards(TenantGuard)` no controller
4. Adicionar RLS policy na tabela no `enable_rls.sql`

```typescript
// Exemplo: ProductService
@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const db = this.prisma.tenantClient(); // ← isolamento automatico
    return db.product.findMany();
  }
}
```
