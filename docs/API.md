# API Reference - Endpoints Completos

## Base URL

```
http://localhost:3000/api/v1
```

**Swagger UI:** `http://localhost:3000/docs`

## Autenticacao

Todas as rotas protegidas exigem o header:
```
Authorization: Bearer <access_token>
```

Rotas marcadas com `@Public()` nao exigem autenticacao.

---

## Auth (`/api/v1/auth`)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/auth/register` | Nao | Registra tenant + usuario owner |
| POST | `/auth/login` | Nao | Login com email, senha e slug |

### POST /auth/register
```json
// Request
{
  "tenantName": "string",
  "tenantSlug": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string"
}

// Response 201
{
  "accessToken": "jwt...",
  "refreshToken": "uuid",
  "user": { "id", "email", "role", "tenantId" }
}
```

### POST /auth/login
```json
// Request
{
  "email": "string",
  "password": "string",
  "tenantSlug": "string"
}

// Response 200
{
  "accessToken": "jwt...",
  "refreshToken": "uuid"
}
```

---

## Tenants (`/api/v1/tenants`)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/tenants` | Nao | Cria tenant |
| GET | `/tenants/:slug` | Nao | Busca tenant por slug |

---

## Users (`/api/v1/users`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| GET | `/users` | Sim | MEMBER | Lista usuarios do tenant |
| GET | `/users/:id` | Sim | MEMBER | Busca usuario |
| PATCH | `/users/:id/deactivate` | Sim | ADMIN | Desativa usuario |

---

## HR - Departamentos (`/api/v1/hr/departments`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/hr/departments` | Sim | ADMIN | Criar departamento |
| GET | `/hr/departments` | Sim | MEMBER | Listar |
| GET | `/hr/departments/:id` | Sim | MEMBER | Buscar |
| PATCH | `/hr/departments/:id` | Sim | ADMIN | Atualizar |
| DELETE | `/hr/departments/:id` | Sim | OWNER | Excluir |

**Query params:** `?activeOnly=true`

---

## HR - Cargos (`/api/v1/hr/positions`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/hr/positions` | Sim | ADMIN | Criar cargo |
| GET | `/hr/positions` | Sim | MEMBER | Listar |
| GET | `/hr/positions/:id` | Sim | MEMBER | Buscar |
| PATCH | `/hr/positions/:id` | Sim | ADMIN | Atualizar |
| DELETE | `/hr/positions/:id` | Sim | OWNER | Excluir |

**Query params:** `?departmentId=uuid&activeOnly=true`

---

## HR - Escalas (`/api/v1/hr/work-schedules`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/hr/work-schedules` | Sim | ADMIN | Criar |
| GET | `/hr/work-schedules` | Sim | MEMBER | Listar |
| GET | `/hr/work-schedules/:id` | Sim | MEMBER | Buscar |
| PATCH | `/hr/work-schedules/:id` | Sim | ADMIN | Atualizar |
| DELETE | `/hr/work-schedules/:id` | Sim | OWNER | Excluir |

---

## HR - Funcionarios (`/api/v1/hr/employees`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/hr/employees` | Sim | ADMIN | Cadastrar |
| GET | `/hr/employees` | Sim | MEMBER | Listar |
| GET | `/hr/employees/:id` | Sim | MEMBER | Buscar |
| PATCH | `/hr/employees/:id` | Sim | ADMIN | Atualizar |
| PATCH | `/hr/employees/:id/terminate` | Sim | ADMIN | Desligar |
| DELETE | `/hr/employees/:id` | Sim | OWNER | Excluir |

**Query params:** `?status=ACTIVE&contractType=CLT&departmentId=uuid&positionId=uuid&page=1&limit=20`

---

## HR - Ponto (`/api/v1/hr/time-records`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/hr/time-records/clock-in` | Sim | MEMBER | Entrada |
| PATCH | `/hr/time-records/:id/lunch-start` | Sim | MEMBER | Inicio almoco |
| PATCH | `/hr/time-records/:id/lunch-end` | Sim | MEMBER | Fim almoco |
| PATCH | `/hr/time-records/:id/clock-out` | Sim | MEMBER | Saida |
| GET | `/hr/time-records` | Sim | MEMBER | Listar |
| GET | `/hr/time-records/:id` | Sim | MEMBER | Buscar |
| PATCH | `/hr/time-records/:id/adjust` | Sim | ADMIN | Ajustar |
| PATCH | `/hr/time-records/:id/approve` | Sim | ADMIN | Aprovar |
| GET | `/hr/time-records/report` | Sim | ADMIN | Relatorio |

**Query params (listagem):** `?employeeId=uuid&startDate=2024-01-01&endDate=2024-01-31&status=PENDING`
**Query params (relatorio):** `?employeeId=uuid&startDate=2024-01-01&endDate=2024-01-31`

---

## HR - Licencas (`/api/v1/hr/leaves`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/hr/leaves` | Sim | MEMBER | Solicitar |
| GET | `/hr/leaves` | Sim | MEMBER | Listar |
| GET | `/hr/leaves/:id` | Sim | MEMBER | Buscar |
| PATCH | `/hr/leaves/:id/approve` | Sim | ADMIN | Aprovar |
| PATCH | `/hr/leaves/:id/reject` | Sim | ADMIN | Rejeitar |
| PATCH | `/hr/leaves/:id/cancel` | Sim | MEMBER | Cancelar |
| GET | `/hr/leaves/summary/:employeeId` | Sim | MEMBER | Resumo anual |

**Query params:** `?employeeId=uuid&type=VACATION&status=PENDING&year=2024`

---

## Financeiro - Categorias (`/api/v1/financial/categories`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/financial/categories` | Sim | ADMIN | Criar |
| GET | `/financial/categories` | Sim | MEMBER | Listar |
| GET | `/financial/categories/:id` | Sim | MEMBER | Buscar |
| PATCH | `/financial/categories/:id` | Sim | ADMIN | Atualizar |
| DELETE | `/financial/categories/:id` | Sim | OWNER | Excluir |

**Query params:** `?type=INCOME&activeOnly=true`

---

## Financeiro - Centros de Custo (`/api/v1/financial/cost-centers`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/financial/cost-centers` | Sim | ADMIN | Criar |
| GET | `/financial/cost-centers` | Sim | MEMBER | Listar |
| GET | `/financial/cost-centers/:id` | Sim | MEMBER | Buscar |
| PATCH | `/financial/cost-centers/:id` | Sim | ADMIN | Atualizar |
| DELETE | `/financial/cost-centers/:id` | Sim | OWNER | Excluir |

---

## Financeiro - Contas Bancarias (`/api/v1/financial/bank-accounts`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/financial/bank-accounts` | Sim | ADMIN | Criar |
| GET | `/financial/bank-accounts` | Sim | MEMBER | Listar |
| GET | `/financial/bank-accounts/:id` | Sim | MEMBER | Buscar |
| PATCH | `/financial/bank-accounts/:id` | Sim | ADMIN | Atualizar |
| DELETE | `/financial/bank-accounts/:id` | Sim | OWNER | Excluir |
| GET | `/financial/bank-accounts/:id/balance` | Sim | MEMBER | Ver saldo |
| POST | `/financial/bank-accounts/:id/recalculate` | Sim | ADMIN | Recalcular saldo |

---

## Financeiro - Contas a Pagar (`/api/v1/financial/accounts-payable`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/financial/accounts-payable` | Sim | MEMBER | Criar |
| POST | `/financial/accounts-payable/installments` | Sim | MEMBER | Criar parcelado |
| GET | `/financial/accounts-payable` | Sim | MEMBER | Listar |
| GET | `/financial/accounts-payable/summary` | Sim | MEMBER | Resumo |
| GET | `/financial/accounts-payable/:id` | Sim | MEMBER | Buscar |
| PATCH | `/financial/accounts-payable/:id/pay` | Sim | MEMBER | Pagar |
| PATCH | `/financial/accounts-payable/:id/cancel` | Sim | ADMIN | Cancelar |

**Query params:** `?status=PENDING&categoryId=uuid&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=20`

---

## Financeiro - Contas a Receber (`/api/v1/financial/accounts-receivable`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/financial/accounts-receivable` | Sim | MEMBER | Criar |
| POST | `/financial/accounts-receivable/installments` | Sim | MEMBER | Criar parcelado |
| GET | `/financial/accounts-receivable` | Sim | MEMBER | Listar |
| GET | `/financial/accounts-receivable/summary` | Sim | MEMBER | Resumo |
| GET | `/financial/accounts-receivable/:id` | Sim | MEMBER | Buscar |
| PATCH | `/financial/accounts-receivable/:id/receive` | Sim | MEMBER | Receber |
| PATCH | `/financial/accounts-receivable/:id/cancel` | Sim | ADMIN | Cancelar |

**Query params:** `?status=PENDING&categoryId=uuid&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=20`

---

## Financeiro - Transacoes (`/api/v1/financial/transactions`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/financial/transactions` | Sim | MEMBER | Criar |
| GET | `/financial/transactions` | Sim | MEMBER | Listar |
| GET | `/financial/transactions/:id` | Sim | MEMBER | Buscar |
| DELETE | `/financial/transactions/:id` | Sim | ADMIN | Excluir |

**Query params:** `?type=INCOME&bankAccountId=uuid&categoryId=uuid&costCenterId=uuid&startDate=2024-01-01&endDate=2024-12-31&reconciled=false&page=1&limit=20`

---

## Financeiro - Conciliacao (`/api/v1/financial/bank-reconciliation`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| POST | `/financial/bank-reconciliation/import` | Sim | ADMIN | Importar extrato |
| GET | `/financial/bank-reconciliation/suggestions` | Sim | MEMBER | Sugestoes match |
| POST | `/financial/bank-reconciliation/reconcile` | Sim | ADMIN | Conciliar |
| POST | `/financial/bank-reconciliation/undo` | Sim | ADMIN | Desfazer |

---

## Financeiro - Fluxo de Caixa (`/api/v1/financial/cash-flow`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| GET | `/financial/cash-flow` | Sim | MEMBER | Fluxo por periodo |
| GET | `/financial/cash-flow/daily` | Sim | MEMBER | Posicao diaria |

**Query params:** `?startDate=2024-01-01&endDate=2024-06-30`

---

## Financeiro - Dashboard (`/api/v1/financial/dashboard`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| GET | `/financial/dashboard/overview` | Sim | MEMBER | Visao geral |
| GET | `/financial/dashboard/expenses-by-category` | Sim | MEMBER | Despesas por cat. |
| GET | `/financial/dashboard/income-by-category` | Sim | MEMBER | Receitas por cat. |
| GET | `/financial/dashboard/monthly-evolution` | Sim | MEMBER | Evolucao mensal |

**Query params (overview):** `?month=2024-04`
**Query params (evolucao):** `?year=2024`

---

## Financeiro - DRE (`/api/v1/financial/dre`)

| Metodo | Rota | Auth | Role | Descricao |
|--------|------|------|------|-----------|
| GET | `/financial/dre` | Sim | MEMBER | DRE por periodo |
| GET | `/financial/dre/monthly` | Sim | MEMBER | DRE mensal |

**Query params (DRE):** `?startDate=2024-01-01&endDate=2024-12-31`
**Query params (mensal):** `?year=2024`

---

## Health Check

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/health` | Nao | Status do sistema |

---

## Codigos de Resposta

| Codigo | Descricao |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Bad Request - dados invalidos |
| 401 | Nao autenticado |
| 403 | Sem permissao (role insuficiente) |
| 404 | Recurso nao encontrado |
| 409 | Conflito (dado duplicado) |
| 429 | Rate limit excedido |
| 500 | Erro interno |

## Rate Limiting

- **Limite padrao:** 100 requisicoes por 60 segundos
- Configuravel via variaveis de ambiente `THROTTLE_TTL` e `THROTTLE_LIMIT`
