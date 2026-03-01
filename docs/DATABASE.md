# Banco de Dados - Schemas e Relacionamentos

## Visao Geral dos Schemas

O banco de dados PostgreSQL esta organizado em **3 schemas semanticos**, cada um agrupando tabelas por dominio de negocio:

```
PostgreSQL
├── core        → Tenant, User, RefreshToken, Invitation
├── rh          → Department, Position, WorkSchedule, Employee, TimeRecord, Leave
└── financeiro  → FinancialCategory, CostCenter, BankAccount, AccountPayable,
                  AccountReceivable, FinancialTransaction, BankStatement
```

---

## Schema `core` - Nucleo Multi-Tenant

Responsavel pela base do sistema: organizacoes (tenants), usuarios, autenticacao e convites.

### Tabelas

| Tabela | Nome BD | Descricao |
|--------|---------|-----------|
| Tenant | `core.tenants` | Organizacoes/empresas do sistema |
| User | `core.users` | Usuarios com acesso ao sistema |
| RefreshToken | `core.refresh_tokens` | Tokens JWT de refresh |
| Invitation | `core.invitations` | Convites para novos usuarios |

### Enums

| Enum | Valores | Uso |
|------|---------|-----|
| `Plan` | FREE, STARTER, PROFESSIONAL, ENTERPRISE | Plano do tenant |
| `Role` | OWNER, ADMIN, MEMBER, VIEWER | Papel do usuario |
| `InvitationStatus` | PENDING, ACCEPTED, EXPIRED, CANCELLED | Status do convite |

### Relacionamentos

```
Tenant (1) ──→ (N) User
Tenant (1) ──→ (N) Invitation
User   (1) ──→ (N) RefreshToken
```

- **Tenant** e a raiz de todo o sistema. Cada tenant representa uma empresa/organizacao
- **User** pertence a exatamente um Tenant. O email e unico por tenant (`@@unique([tenantId, email])`)
- **RefreshToken** pertence a um User. Exclusao em cascata quando o User e removido
- **Invitation** pertence a um Tenant e possui token unico para aceite

---

## Schema `rh` - Recursos Humanos

Gestao completa de RH: estrutura organizacional, funcionarios, ponto e ferias.

### Tabelas

| Tabela | Nome BD | Descricao |
|--------|---------|-----------|
| Department | `rh.departments` | Departamentos da empresa (hierarquico) |
| Position | `rh.positions` | Cargos com faixa salarial |
| WorkSchedule | `rh.work_schedules` | Escalas/jornadas de trabalho |
| Employee | `rh.employees` | Funcionarios |
| TimeRecord | `rh.time_records` | Registros de ponto |
| Leave | `rh.leaves` | Ferias, licencas e afastamentos |

### Enums

| Enum | Valores | Uso |
|------|---------|-----|
| `PositionLevel` | INTERN, JUNIOR, PLENO, SENIOR, SPECIALIST, COORDINATOR, MANAGER, DIRECTOR, C_LEVEL | Nivel do cargo |
| `ContractType` | CLT, PJ, INTERN, TEMPORARY, FREELANCER | Tipo de contrato |
| `EmployeeStatus` | ACTIVE, INACTIVE, ON_LEAVE, TERMINATED | Status do funcionario |
| `TimeRecordType` | NORMAL, OVERTIME, REMOTE, HOLIDAY, COMPENSATORY | Tipo do registro de ponto |
| `TimeRecordStatus` | PENDING, APPROVED, REJECTED, ADJUSTED | Status do ponto |
| `LeaveType` | VACATION, SICK, MATERNITY, PATERNITY, PERSONAL, BEREAVEMENT, OTHER | Tipo de licenca |
| `LeaveStatus` | PENDING, APPROVED, REJECTED, CANCELLED | Status da licenca |

### Relacionamentos

```
Tenant (1) ──→ (N) Department
Tenant (1) ──→ (N) Position
Tenant (1) ──→ (N) WorkSchedule
Tenant (1) ──→ (N) Employee
Tenant (1) ──→ (N) TimeRecord
Tenant (1) ──→ (N) Leave

Department (1) ──→ (N) Department   [hierarquia pai-filho]
Department (1) ──→ (N) Position     [cargos do departamento]
Department (1) ──→ (N) Employee     [funcionarios do departamento]

Position     (1) ──→ (N) Employee   [funcionarios no cargo]
WorkSchedule (1) ──→ (N) Employee   [funcionarios na escala]

Employee (1) ──→ (N) TimeRecord     [registros de ponto]
Employee (1) ──→ (N) Leave          [licencas/ferias]
```

### Diagrama de Relacionamentos RH

```
                    ┌──────────────┐
                    │    Tenant    │ (core)
                    │   (empresa)  │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────────────┐
            │              │                      │
     ┌──────▼──────┐ ┌────▼─────┐         ┌──────▼──────┐
     │ Department  │ │ Position │         │WorkSchedule │
     │(departamento)│ │  (cargo) │         │  (escala)   │
     └──────┬──────┘ └────┬─────┘         └──────┬──────┘
            │              │                      │
            │    ┌─────────┘                      │
            │    │                                │
     ┌──────▼────▼────────────────────────────────▼──┐
     │                  Employee                      │
     │               (funcionario)                    │
     │  pertence a: Department, Position, WorkSchedule│
     └──────────────────┬────────────────────────────┘
                        │
              ┌─────────┼─────────┐
              │                   │
       ┌──────▼──────┐    ┌──────▼──────┐
       │ TimeRecord  │    │    Leave    │
       │   (ponto)   │    │  (licenca)  │
       └─────────────┘    └─────────────┘
```

### Ligacao entre Entidades (o "ligar os pontos")

Um **funcionario** (`Employee`) faz parte de um **departamento** (`Department`), que pode ser:
- Departamento Financeiro
- Departamento de RH
- Departamento Comercial
- etc.

Os departamentos sao hierarquicos - um departamento pode ter sub-departamentos:
```
Empresa
├── Diretoria
│   ├── RH
│   │   ├── Recrutamento
│   │   └── Treinamento
│   ├── Financeiro
│   │   ├── Contas a Pagar
│   │   └── Contas a Receber
│   └── Comercial
│       ├── Vendas
│       └── Marketing
```

Cada funcionario tambem tem:
- Um **cargo** (`Position`) com nivel e faixa salarial, vinculado ao departamento
- Uma **escala de trabalho** (`WorkSchedule`) que define horarios
- Registros de **ponto** (`TimeRecord`) diarios
- **Licencas/ferias** (`Leave`) com fluxo de aprovacao

---

## Schema `financeiro` - Gestao Financeira

Controle financeiro completo: categorias, contas bancarias, contas a pagar/receber, transacoes e conciliacao.

### Tabelas

| Tabela | Nome BD | Descricao |
|--------|---------|-----------|
| FinancialCategory | `financeiro.financial_categories` | Categorias financeiras (hierarquica) |
| CostCenter | `financeiro.cost_centers` | Centros de custo |
| BankAccount | `financeiro.bank_accounts` | Contas bancarias |
| AccountPayable | `financeiro.accounts_payable` | Contas a pagar |
| AccountReceivable | `financeiro.accounts_receivable` | Contas a receber |
| FinancialTransaction | `financeiro.financial_transactions` | Transacoes financeiras |
| BankStatement | `financeiro.bank_statements` | Extratos bancarios |

### Enums

| Enum | Valores | Uso |
|------|---------|-----|
| `FinancialCategoryType` | INCOME, EXPENSE | Tipo da categoria |
| `DreGroup` | GROSS_REVENUE, DEDUCTIONS, COST_OF_GOODS, OPERATING_EXPENSES, ADMINISTRATIVE_EXPENSES, PERSONNEL_EXPENSES, FINANCIAL_INCOME, FINANCIAL_EXPENSES, OTHER_INCOME, OTHER_EXPENSES, TAXES | Grupo DRE |
| `PaymentStatus` | PENDING, PAID, PARTIALLY_PAID, OVERDUE, CANCELLED | Status do pagamento |
| `TransactionType` | INCOME, EXPENSE, TRANSFER | Tipo da transacao |
| `PaymentMethod` | CASH, BANK_TRANSFER, PIX, CREDIT_CARD, DEBIT_CARD, BOLETO, CHECK, OTHER | Metodo de pagamento |
| `ReconciliationStatus` | OPEN, IN_PROGRESS, COMPLETED | Status da conciliacao |

### Relacionamentos

```
Tenant (1) ──→ (N) FinancialCategory
Tenant (1) ──→ (N) CostCenter
Tenant (1) ──→ (N) BankAccount
Tenant (1) ──→ (N) AccountPayable
Tenant (1) ──→ (N) AccountReceivable
Tenant (1) ──→ (N) FinancialTransaction
Tenant (1) ──→ (N) BankStatement

FinancialCategory (1) ──→ (N) FinancialCategory  [hierarquia]
FinancialCategory (1) ──→ (N) AccountPayable
FinancialCategory (1) ──→ (N) AccountReceivable
FinancialCategory (1) ──→ (N) FinancialTransaction

CostCenter (1) ──→ (N) AccountPayable
CostCenter (1) ──→ (N) AccountReceivable
CostCenter (1) ──→ (N) FinancialTransaction

BankAccount (1) ──→ (N) FinancialTransaction
BankAccount (1) ──→ (N) BankStatement
BankAccount (1) ──→ (N) AccountPayable      [conta de pagamento]
BankAccount (1) ──→ (N) AccountReceivable   [conta de recebimento]

AccountPayable    (1) ──→ (N) FinancialTransaction
AccountReceivable (1) ──→ (N) FinancialTransaction
BankStatement     (1) ──→ (N) FinancialTransaction [conciliacao]
```

### Diagrama de Relacionamentos Financeiro

```
                         ┌──────────────┐
                         │    Tenant    │ (core)
                         │   (empresa)  │
                         └──────┬───────┘
                                │
         ┌──────────┬───────────┼───────────┬──────────┐
         │          │           │           │          │
  ┌──────▼───┐ ┌────▼────┐ ┌───▼────┐ ┌────▼────┐ ┌───▼────────┐
  │ Category │ │  Cost   │ │  Bank  │ │  Bank  │ │ Financial  │
  │(categoria)│ │ Center  │ │Account │ │Statement│ │Transaction │
  └─────┬────┘ └────┬────┘ └───┬────┘ └────┬───┘ └─────┬──────┘
        │           │          │            │           │
        │     ┌─────┘    ┌─────┘      ┌─────┘          │
        │     │          │            │                 │
  ┌─────▼─────▼──────────▼──┐   ┌─────▼─────────────────▼──┐
  │    AccountPayable       │   │   AccountReceivable      │
  │   (contas a pagar)      │   │   (contas a receber)     │
  │                         │   │                          │
  │ → categoria             │   │ → categoria              │
  │ → centro de custo       │   │ → centro de custo        │
  │ → conta bancaria        │   │ → conta bancaria         │
  │ → gera transacoes       │   │ → gera transacoes        │
  └─────────────────────────┘   └──────────────────────────┘
```

---

## Relacionamentos Cross-Schema

O sistema conecta os schemas atraves do **Tenant** (schema `core`), que e a raiz de todos os dados:

```
                    ┌─────────────────────────┐
                    │      CORE SCHEMA        │
                    │                         │
                    │  Tenant ──→ User        │
                    │     │    ──→ Invitation  │
                    │     │    ──→ RefreshToken│
                    └─────┼───────────────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
    ┌──────▼──────┐       │     ┌────────▼────────┐
    │  RH SCHEMA  │       │     │FINANCEIRO SCHEMA│
    │             │       │     │                 │
    │ Department  │       │     │ Category        │
    │ Position    │       │     │ CostCenter      │
    │ WorkSchedule│       │     │ BankAccount     │
    │ Employee    │       │     │ AccountPayable  │
    │ TimeRecord  │       │     │ AccountReceivable│
    │ Leave       │       │     │ Transaction     │
    └─────────────┘       │     │ BankStatement   │
                          │     └─────────────────┘
                          │
              Todos os dados sao isolados
              por tenant_id (RLS)
```

### Como os schemas se conectam

1. **Tenant** (core) e o ponto central - toda tabela de `rh` e `financeiro` possui `tenant_id` referenciando `core.tenants`
2. **Employee** (rh) pertence a um **Department** (rh), que pode representar qualquer area da empresa (Financeiro, RH, Comercial, etc.)
3. **Employee** (rh) pode ser vinculado a um **User** (core) para acesso ao sistema
4. Despesas com pessoal no **financeiro** podem ser categorizadas com `DreGroup.PERSONNEL_EXPENSES`, conectando conceitualmente funcionarios a custos
5. **CostCenter** (financeiro) pode representar departamentos para fins de alocacao de custos

---

## Row Level Security (RLS)

Todas as tabelas (exceto `core.tenants`) possuem RLS habilitado com duas politicas:

1. **tenant_isolation_policy** - Filtra registros pelo `app.current_tenant_id` do PostgreSQL
2. **bypass_rls_policy** - Permite operacoes de sistema quando `app.bypass_rls = 'on'`

Para aplicar o RLS apos uma migration:
```bash
psql $DATABASE_URL -f prisma/migrations/enable_rls.sql
```

---

## Indices

Todas as tabelas possuem indice em `tenant_id` para performance. Alem disso:

| Tabela | Indices Adicionais |
|--------|-------------------|
| `core.users` | `[tenantId, email]` (unique) |
| `rh.employees` | `[tenantId, employeeCode]` (unique), `[tenantId, cpf]` (unique) |
| `rh.time_records` | `[tenantId, employeeId, date]` (unique), `employeeId` |
| `rh.leaves` | `employeeId` |
| `financeiro.financial_categories` | `[tenantId, code]` (unique) |
| `financeiro.cost_centers` | `[tenantId, code]` (unique) |
| `financeiro.accounts_payable` | `dueDate`, `status` |
| `financeiro.accounts_receivable` | `dueDate`, `status` |
| `financeiro.financial_transactions` | `date`, `bankAccountId`, `reconciled` |
| `financeiro.bank_statements` | `bankAccountId`, `date`, `reconciled` |
