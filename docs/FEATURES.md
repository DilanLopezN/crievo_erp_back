# Features do Sistema - Guia Completo

## Visao Geral

O Crievo ERP e um sistema SaaS multi-tenant para gestao empresarial, cobrindo as areas de **Recursos Humanos** e **Gestao Financeira**. Cada empresa (tenant) possui seus dados completamente isolados.

---

## 1. Multi-Tenancy e Autenticacao

### 1.1 Registro de Tenant

Cria uma nova empresa no sistema com um usuario OWNER.

**Endpoint:** `POST /api/v1/auth/register`
**Auth:** Nao requer autenticacao

```json
{
  "tenantName": "Minha Empresa",
  "tenantSlug": "minha-empresa",
  "email": "admin@minhaempresa.com",
  "password": "SenhaSegura@123",
  "firstName": "Admin",
  "lastName": "Silva"
}
```

**O que acontece:**
1. Cria o tenant com o slug informado
2. Cria o primeiro usuario com role OWNER
3. Retorna tokens JWT de acesso

### 1.2 Login

**Endpoint:** `POST /api/v1/auth/login`
**Auth:** Nao requer autenticacao

```json
{
  "email": "admin@minhaempresa.com",
  "password": "SenhaSegura@123",
  "tenantSlug": "minha-empresa"
}
```

**Retorna:** Access token (1 dia) e refresh token (7 dias)

### 1.3 Gestao de Usuarios

**Endpoints:**
| Metodo | Rota | Role Minima | Descricao |
|--------|------|-------------|-----------|
| GET | `/api/v1/users` | MEMBER | Lista usuarios do tenant |
| GET | `/api/v1/users/:id` | MEMBER | Busca usuario por ID |
| PATCH | `/api/v1/users/:id/deactivate` | ADMIN | Desativa usuario |

### 1.4 Roles e Permissoes

| Role | Descricao |
|------|-----------|
| OWNER | Dono da empresa. Acesso total. Criado no registro |
| ADMIN | Administrador. Pode gerenciar usuarios e configuracoes |
| MEMBER | Membro padrao. Acesso a funcionalidades de negocio |
| VIEWER | Somente leitura |

---

## 2. Recursos Humanos (Schema `rh`)

### 2.1 Departamentos

Estrutura organizacional hierarquica da empresa.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/hr/departments` | ADMIN | Criar departamento |
| GET | `/api/v1/hr/departments` | MEMBER | Listar departamentos |
| GET | `/api/v1/hr/departments/:id` | MEMBER | Buscar departamento |
| PATCH | `/api/v1/hr/departments/:id` | ADMIN | Atualizar departamento |
| DELETE | `/api/v1/hr/departments/:id` | OWNER | Excluir departamento |

**Como usar:**

1. **Criar departamentos raiz:**
```json
POST /api/v1/hr/departments
{
  "name": "Diretoria",
  "description": "Diretoria executiva"
}
```

2. **Criar sub-departamentos:**
```json
POST /api/v1/hr/departments
{
  "name": "Financeiro",
  "description": "Departamento financeiro",
  "parentId": "<id-diretoria>"
}
```

3. **Construir a arvore:**
```
Diretoria (raiz)
├── RH
│   ├── Recrutamento
│   └── Treinamento
├── Financeiro
│   ├── Contas a Pagar
│   └── Contas a Receber
└── Comercial
```

**Regras:**
- Nao e possivel excluir departamento com funcionarios vinculados
- Departamentos inativos nao aparecem em listagens padrao
- O `managerId` identifica o gestor do departamento

### 2.2 Cargos

Define cargos com niveis e faixas salariais, vinculados a departamentos.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/hr/positions` | ADMIN | Criar cargo |
| GET | `/api/v1/hr/positions` | MEMBER | Listar cargos |
| GET | `/api/v1/hr/positions/:id` | MEMBER | Buscar cargo |
| PATCH | `/api/v1/hr/positions/:id` | ADMIN | Atualizar cargo |
| DELETE | `/api/v1/hr/positions/:id` | OWNER | Excluir cargo |

**Como usar:**
```json
POST /api/v1/hr/positions
{
  "name": "Analista Financeiro",
  "departmentId": "<id-departamento-financeiro>",
  "level": "PLENO",
  "baseSalaryMin": 5000.00,
  "baseSalaryMax": 8000.00,
  "description": "Analista financeiro pleno"
}
```

**Niveis disponíveis:** INTERN, JUNIOR, PLENO, SENIOR, SPECIALIST, COORDINATOR, MANAGER, DIRECTOR, C_LEVEL

**Regras:**
- `baseSalaryMin` deve ser menor ou igual a `baseSalaryMax`
- Nao e possivel excluir cargo com funcionarios vinculados
- O cargo pode estar vinculado a um departamento (opcional)

### 2.3 Escalas de Trabalho

Define jornadas de trabalho com horarios e dias da semana.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/hr/work-schedules` | ADMIN | Criar escala |
| GET | `/api/v1/hr/work-schedules` | MEMBER | Listar escalas |
| GET | `/api/v1/hr/work-schedules/:id` | MEMBER | Buscar escala |
| PATCH | `/api/v1/hr/work-schedules/:id` | ADMIN | Atualizar escala |
| DELETE | `/api/v1/hr/work-schedules/:id` | OWNER | Excluir escala |

**Como usar:**
```json
POST /api/v1/hr/work-schedules
{
  "name": "Comercial padrao",
  "workDays": [1, 2, 3, 4, 5],
  "entryTime": "08:00",
  "exitTime": "17:00",
  "lunchDuration": 60,
  "weeklyHours": 44
}
```

**Campos:**
- `workDays`: Array de numeros (1=Segunda, 5=Sexta, 6=Sabado, 7=Domingo)
- `lunchDuration`: Duracao do almoco em minutos
- `weeklyHours`: Carga horaria semanal

### 2.4 Funcionarios

Cadastro completo de funcionarios com vinculo a departamento, cargo e escala.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/hr/employees` | ADMIN | Cadastrar funcionario |
| GET | `/api/v1/hr/employees` | MEMBER | Listar funcionarios |
| GET | `/api/v1/hr/employees/:id` | MEMBER | Buscar funcionario |
| PATCH | `/api/v1/hr/employees/:id` | ADMIN | Atualizar funcionario |
| PATCH | `/api/v1/hr/employees/:id/terminate` | ADMIN | Desligar funcionario |
| DELETE | `/api/v1/hr/employees/:id` | OWNER | Excluir funcionario |

**Como usar:**
```json
POST /api/v1/hr/employees
{
  "firstName": "Maria",
  "lastName": "Santos",
  "email": "maria@empresa.com",
  "cpf": "12345678900",
  "hireDate": "2024-03-01",
  "contractType": "CLT",
  "salary": 6500.00,
  "departmentId": "<id-departamento>",
  "positionId": "<id-cargo>",
  "workScheduleId": "<id-escala>",
  "phone": "(11) 99999-0000",
  "birthDate": "1990-05-15",
  "address": {
    "street": "Rua Exemplo, 123",
    "city": "Sao Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  },
  "emergencyContact": {
    "name": "Joao Santos",
    "phone": "(11) 88888-0000",
    "relationship": "Esposo"
  },
  "bankInfo": {
    "bank": "Banco do Brasil",
    "agency": "1234",
    "account": "56789-0",
    "pixKey": "maria@empresa.com"
  }
}
```

**Filtros de listagem:**
- `?status=ACTIVE` - Por status (ACTIVE, INACTIVE, ON_LEAVE, TERMINATED)
- `?contractType=CLT` - Por tipo de contrato
- `?departmentId=xxx` - Por departamento
- `?positionId=xxx` - Por cargo
- `?page=1&limit=20` - Paginacao

**Ligando os pontos:**
- O **funcionario** pertence a um **departamento** (ex: "Financeiro")
- O **funcionario** possui um **cargo** (ex: "Analista Financeiro Senior")
- O **cargo** pode estar vinculado ao mesmo **departamento**
- O **funcionario** segue uma **escala de trabalho** (ex: "Comercial 8h-17h")
- O codigo do funcionario (`employeeCode`) e gerado automaticamente

**Desligamento:**
```json
PATCH /api/v1/hr/employees/:id/terminate
{
  "terminationDate": "2024-12-31"
}
```

### 2.5 Ponto Eletronico

Registro de entrada, almoco e saida com calculo automatico de horas.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/hr/time-records/clock-in` | MEMBER | Registrar entrada |
| PATCH | `/api/v1/hr/time-records/:id/lunch-start` | MEMBER | Inicio almoco |
| PATCH | `/api/v1/hr/time-records/:id/lunch-end` | MEMBER | Fim almoco |
| PATCH | `/api/v1/hr/time-records/:id/clock-out` | MEMBER | Registrar saida |
| GET | `/api/v1/hr/time-records` | MEMBER | Listar registros |
| GET | `/api/v1/hr/time-records/:id` | MEMBER | Buscar registro |
| PATCH | `/api/v1/hr/time-records/:id/adjust` | ADMIN | Ajustar registro |
| PATCH | `/api/v1/hr/time-records/:id/approve` | ADMIN | Aprovar registro |
| GET | `/api/v1/hr/time-records/report` | ADMIN | Relatorio por periodo |

**Fluxo de uso:**

1. **Entrada:** `POST /clock-in` com `employeeId` e `date`
2. **Almoco (inicio):** `PATCH /:id/lunch-start`
3. **Almoco (fim):** `PATCH /:id/lunch-end`
4. **Saida:** `PATCH /:id/clock-out` (calcula horas automaticamente)

**Calculos automaticos:**
- `workedMinutes`: Total de minutos trabalhados (descontando almoco)
- `extraMinutes`: Minutos extras (acima da jornada esperada)
- `missingMinutes`: Minutos faltantes (abaixo da jornada esperada)
- Validacao CLT: almoco de 60min obrigatorio para jornadas > 6h

**Status do registro:**
- `PENDING` → Aguardando aprovacao
- `APPROVED` → Aprovado pelo gestor
- `REJECTED` → Rejeitado
- `ADJUSTED` → Ajustado manualmente

### 2.6 Ferias e Licencas

Gestao de afastamentos com fluxo de aprovacao.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/hr/leaves` | MEMBER | Solicitar licenca |
| GET | `/api/v1/hr/leaves` | MEMBER | Listar licencas |
| GET | `/api/v1/hr/leaves/:id` | MEMBER | Buscar licenca |
| PATCH | `/api/v1/hr/leaves/:id/approve` | ADMIN | Aprovar licenca |
| PATCH | `/api/v1/hr/leaves/:id/reject` | ADMIN | Rejeitar licenca |
| PATCH | `/api/v1/hr/leaves/:id/cancel` | MEMBER | Cancelar licenca |
| GET | `/api/v1/hr/leaves/summary/:employeeId` | MEMBER | Resumo anual |

**Como usar:**
```json
POST /api/v1/hr/leaves
{
  "employeeId": "<id-funcionario>",
  "type": "VACATION",
  "startDate": "2024-07-01",
  "endDate": "2024-07-30",
  "reason": "Ferias anuais"
}
```

**Tipos de licenca:** VACATION (ferias), SICK (medica), MATERNITY (maternidade), PATERNITY (paternidade), PERSONAL (pessoal), BEREAVEMENT (luto), OTHER (outro)

**Regras:**
- Dias uteis sao calculados automaticamente
- Nao permite sobreposicao de periodos para o mesmo funcionario
- Licencas ja iniciadas nao podem ser canceladas
- O resumo anual mostra dias utilizados por tipo

---

## 3. Gestao Financeira (Schema `financeiro`)

### 3.1 Categorias Financeiras

Classificacao hierarquica de receitas e despesas com vinculo ao DRE.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/financial/categories` | ADMIN | Criar categoria |
| GET | `/api/v1/financial/categories` | MEMBER | Listar categorias |
| GET | `/api/v1/financial/categories/:id` | MEMBER | Buscar categoria |
| PATCH | `/api/v1/financial/categories/:id` | ADMIN | Atualizar categoria |
| DELETE | `/api/v1/financial/categories/:id` | OWNER | Excluir categoria |

**Como usar:**
```json
POST /api/v1/financial/categories
{
  "name": "Salarios",
  "code": "DESP-001",
  "type": "EXPENSE",
  "dreGroup": "PERSONNEL_EXPENSES",
  "description": "Pagamento de salarios"
}
```

**Criar sub-categorias:**
```json
{
  "name": "13o Salario",
  "code": "DESP-001-01",
  "type": "EXPENSE",
  "dreGroup": "PERSONNEL_EXPENSES",
  "parentId": "<id-categoria-salarios>"
}
```

**Grupos DRE:**
| Grupo | Descricao | Tipo |
|-------|-----------|------|
| GROSS_REVENUE | Receita Bruta | (+) |
| DEDUCTIONS | Deducoes da Receita | (-) |
| COST_OF_GOODS | Custo dos Produtos/Servicos | (-) |
| OPERATING_EXPENSES | Despesas Operacionais | (-) |
| ADMINISTRATIVE_EXPENSES | Despesas Administrativas | (-) |
| PERSONNEL_EXPENSES | Despesas com Pessoal | (-) |
| FINANCIAL_INCOME | Receitas Financeiras | (+) |
| FINANCIAL_EXPENSES | Despesas Financeiras | (-) |
| OTHER_INCOME | Outras Receitas | (+) |
| OTHER_EXPENSES | Outras Despesas | (-) |
| TAXES | Impostos sobre Lucro | (-) |

### 3.2 Centros de Custo

Alocacao de custos por area/projeto.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/financial/cost-centers` | ADMIN | Criar centro de custo |
| GET | `/api/v1/financial/cost-centers` | MEMBER | Listar |
| GET | `/api/v1/financial/cost-centers/:id` | MEMBER | Buscar |
| PATCH | `/api/v1/financial/cost-centers/:id` | ADMIN | Atualizar |
| DELETE | `/api/v1/financial/cost-centers/:id` | OWNER | Excluir |

**Como usar:**
```json
POST /api/v1/financial/cost-centers
{
  "name": "Departamento de TI",
  "code": "CC-TI",
  "description": "Custos do departamento de tecnologia"
}
```

**Ligacao:** Os centros de custo podem representar departamentos da empresa para fins financeiros, conectando a estrutura de RH com a gestao financeira.

### 3.3 Contas Bancarias

Cadastro e controle de saldo de contas bancarias.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/financial/bank-accounts` | ADMIN | Criar conta |
| GET | `/api/v1/financial/bank-accounts` | MEMBER | Listar contas |
| GET | `/api/v1/financial/bank-accounts/:id` | MEMBER | Buscar conta |
| PATCH | `/api/v1/financial/bank-accounts/:id` | ADMIN | Atualizar conta |
| DELETE | `/api/v1/financial/bank-accounts/:id` | OWNER | Excluir conta |
| GET | `/api/v1/financial/bank-accounts/:id/balance` | MEMBER | Ver saldo |
| POST | `/api/v1/financial/bank-accounts/:id/recalculate` | ADMIN | Recalcular saldo |

**Como usar:**
```json
POST /api/v1/financial/bank-accounts
{
  "name": "Conta Principal",
  "bank": "Banco do Brasil",
  "agency": "1234-5",
  "accountNumber": "67890-1",
  "accountType": "corrente",
  "pixKey": "empresa@email.com",
  "initialBalance": 50000.00
}
```

### 3.4 Contas a Pagar

Controle de pagamentos a fornecedores com parcelamento.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/financial/accounts-payable` | MEMBER | Criar conta |
| POST | `/api/v1/financial/accounts-payable/installments` | MEMBER | Criar parcelado |
| GET | `/api/v1/financial/accounts-payable` | MEMBER | Listar |
| GET | `/api/v1/financial/accounts-payable/summary` | MEMBER | Resumo |
| GET | `/api/v1/financial/accounts-payable/:id` | MEMBER | Buscar |
| PATCH | `/api/v1/financial/accounts-payable/:id/pay` | MEMBER | Registrar pagamento |
| PATCH | `/api/v1/financial/accounts-payable/:id/cancel` | ADMIN | Cancelar |

**Criar conta simples:**
```json
POST /api/v1/financial/accounts-payable
{
  "description": "Aluguel escritorio",
  "supplierName": "Imobiliaria XYZ",
  "supplierDocument": "12.345.678/0001-90",
  "amount": 5000.00,
  "dueDate": "2024-04-10",
  "categoryId": "<id-categoria>",
  "costCenterId": "<id-centro-custo>",
  "bankAccountId": "<id-conta-bancaria>"
}
```

**Criar parcelado:**
```json
POST /api/v1/financial/accounts-payable/installments
{
  "description": "Equipamentos de TI",
  "supplierName": "Tech Store",
  "amount": 12000.00,
  "installments": 6,
  "firstDueDate": "2024-04-10",
  "categoryId": "<id-categoria>"
}
```
Gera 6 parcelas de R$ 2.000,00 com vencimentos mensais.

**Registrar pagamento:**
```json
PATCH /api/v1/financial/accounts-payable/:id/pay
{
  "paidAmount": 5000.00,
  "paymentDate": "2024-04-10",
  "paymentMethod": "PIX",
  "bankAccountId": "<id-conta>"
}
```

### 3.5 Contas a Receber

Controle de recebimentos de clientes (espelho do Contas a Pagar).

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/financial/accounts-receivable` | MEMBER | Criar |
| POST | `/api/v1/financial/accounts-receivable/installments` | MEMBER | Criar parcelado |
| GET | `/api/v1/financial/accounts-receivable` | MEMBER | Listar |
| GET | `/api/v1/financial/accounts-receivable/summary` | MEMBER | Resumo |
| GET | `/api/v1/financial/accounts-receivable/:id` | MEMBER | Buscar |
| PATCH | `/api/v1/financial/accounts-receivable/:id/receive` | MEMBER | Registrar recebimento |
| PATCH | `/api/v1/financial/accounts-receivable/:id/cancel` | ADMIN | Cancelar |

**Como usar:**
```json
POST /api/v1/financial/accounts-receivable
{
  "description": "Consultoria Projeto X",
  "customerName": "Cliente ABC",
  "customerDocument": "98.765.432/0001-10",
  "amount": 15000.00,
  "dueDate": "2024-04-15",
  "categoryId": "<id-categoria-receita>",
  "bankAccountId": "<id-conta>"
}
```

### 3.6 Transacoes Financeiras

Registro de movimentacoes (receita, despesa, transferencia).

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/financial/transactions` | MEMBER | Criar transacao |
| GET | `/api/v1/financial/transactions` | MEMBER | Listar |
| GET | `/api/v1/financial/transactions/:id` | MEMBER | Buscar |
| DELETE | `/api/v1/financial/transactions/:id` | ADMIN | Excluir |

**Tipos:**
- `INCOME` - Receita (credito na conta)
- `EXPENSE` - Despesa (debito na conta)
- `TRANSFER` - Transferencia entre contas

**Criar transacao:**
```json
POST /api/v1/financial/transactions
{
  "type": "EXPENSE",
  "description": "Pagamento fornecedor",
  "amount": 3500.00,
  "date": "2024-04-01",
  "bankAccountId": "<id-conta>",
  "categoryId": "<id-categoria>",
  "costCenterId": "<id-centro-custo>",
  "paymentMethod": "PIX"
}
```

**Transferencia entre contas:**
```json
{
  "type": "TRANSFER",
  "description": "Transferencia para conta poupanca",
  "amount": 10000.00,
  "date": "2024-04-01",
  "bankAccountId": "<id-conta-origem>",
  "transferToBankAccountId": "<id-conta-destino>"
}
```

**O saldo bancario e atualizado automaticamente.**

### 3.7 Conciliacao Bancaria

Importacao de extratos e conciliacao com transacoes.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/financial/bank-reconciliation/import` | ADMIN | Importar extrato |
| GET | `/api/v1/financial/bank-reconciliation/suggestions` | MEMBER | Sugestoes de match |
| POST | `/api/v1/financial/bank-reconciliation/reconcile` | ADMIN | Conciliar |
| POST | `/api/v1/financial/bank-reconciliation/undo` | ADMIN | Desfazer conciliacao |

**Fluxo:**
1. Importar extrato bancario (array de lancamentos)
2. O sistema sugere matches automaticamente (valor +-1%, data +-3 dias)
3. Confirmar ou ajustar as conciliacoes
4. Transacoes conciliadas ficam marcadas como `reconciled = true`

### 3.8 Fluxo de Caixa

Projecao e acompanhamento do fluxo de caixa.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| GET | `/api/v1/financial/cash-flow` | MEMBER | Fluxo por periodo |
| GET | `/api/v1/financial/cash-flow/daily` | MEMBER | Posicao diaria |

**Parametros:** `?startDate=2024-04-01&endDate=2024-06-30`

**Retorna:**
- Saldo inicial
- Entradas e saidas por periodo
- Projecao para os proximos 3 meses
- Posicao diaria com saldo acumulado

### 3.9 Dashboard Financeiro

Visao geral consolidada das financas.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| GET | `/api/v1/financial/dashboard/overview` | MEMBER | Visao geral |
| GET | `/api/v1/financial/dashboard/expenses-by-category` | MEMBER | Despesas por categoria |
| GET | `/api/v1/financial/dashboard/income-by-category` | MEMBER | Receitas por categoria |
| GET | `/api/v1/financial/dashboard/monthly-evolution` | MEMBER | Evolucao mensal |

**Visao geral retorna:**
- Saldos de todas as contas bancarias
- Resultado mensal (receitas - despesas)
- Contas a pagar/receber (vencidas, desta semana, do mes)
- 10 ultimas transacoes

### 3.10 DRE - Demonstracao do Resultado

Demonstracao de Resultado do Exercicio em tempo real.

**Endpoints:**
| Metodo | Rota | Role | Descricao |
|--------|------|------|-----------|
| GET | `/api/v1/financial/dre` | MEMBER | DRE por periodo |
| GET | `/api/v1/financial/dre/monthly` | MEMBER | DRE mensal por ano |

**Parametros:** `?startDate=2024-01-01&endDate=2024-12-31`

**Estrutura do DRE:**
```
(+) Receita Bruta
(-) Deducoes da Receita
(=) Receita Liquida
(-) Custo dos Produtos/Servicos
(=) Lucro Bruto
(-) Despesas Operacionais
(-) Despesas Administrativas
(-) Despesas com Pessoal
(=) Resultado Operacional
(+) Receitas Financeiras
(-) Despesas Financeiras
(+) Outras Receitas
(-) Outras Despesas
(=) Resultado Antes dos Impostos
(-) Impostos sobre o Lucro
(=) Resultado Liquido
```

**Margens calculadas:**
- Margem Bruta = Lucro Bruto / Receita Liquida
- Margem Operacional = Resultado Operacional / Receita Liquida
- Margem Liquida = Resultado Liquido / Receita Liquida

---

## 4. Como Tudo se Conecta

### Funcionario → Departamento → Empresa

```
Tenant "Crievo Ltda"
  └── Department "Financeiro"
        ├── Position "Analista Financeiro Senior"
        │     └── Employee "Maria Santos" (CLT, R$ 6.500)
        │           ├── WorkSchedule "Comercial 8h-17h"
        │           ├── TimeRecord (ponto diario)
        │           └── Leave (ferias jul/2024)
        └── Position "Gerente Financeiro"
              └── Employee "Carlos Lima" (CLT, R$ 12.000)
```

### Fluxo Financeiro Completo

```
1. Categoria "Salarios" (EXPENSE, DRE: PERSONNEL_EXPENSES)
   └── vinculada a despesas com pessoal

2. Centro de Custo "Depto Financeiro"
   └── aloca custos ao departamento

3. Conta a Pagar "Salario Maria Santos - Mar/2024"
   ├── categoria: Salarios
   ├── centro de custo: Depto Financeiro
   ├── conta bancaria: Conta Principal BB
   └── valor: R$ 6.500,00

4. Ao pagar → gera FinancialTransaction
   └── atualiza saldo da BankAccount

5. DRE reflete: Despesas com Pessoal += R$ 6.500
```

### Resumo das Conexoes

| De | Para | Tipo | Descricao |
|----|------|------|-----------|
| Employee | Department | N:1 | Funcionario pertence a um departamento |
| Employee | Position | N:1 | Funcionario ocupa um cargo |
| Employee | WorkSchedule | N:1 | Funcionario segue uma escala |
| Position | Department | N:1 | Cargo pertence a um departamento |
| Department | Department | N:1 | Sub-departamento tem departamento pai |
| TimeRecord | Employee | N:1 | Ponto pertence a um funcionario |
| Leave | Employee | N:1 | Licenca pertence a um funcionario |
| AccountPayable | FinancialCategory | N:1 | Conta tem uma categoria |
| AccountPayable | CostCenter | N:1 | Conta alocada a um centro de custo |
| AccountPayable | BankAccount | N:1 | Pago de uma conta bancaria |
| AccountReceivable | FinancialCategory | N:1 | Receita tem uma categoria |
| AccountReceivable | CostCenter | N:1 | Receita alocada a um centro de custo |
| AccountReceivable | BankAccount | N:1 | Recebido em uma conta bancaria |
| FinancialTransaction | BankAccount | N:1 | Transacao em uma conta |
| FinancialTransaction | FinancialCategory | N:1 | Transacao categorizada |
| FinancialTransaction | CostCenter | N:1 | Transacao alocada |
| FinancialTransaction | AccountPayable | N:1 | Gerada por pagamento |
| FinancialTransaction | AccountReceivable | N:1 | Gerada por recebimento |
| FinancialTransaction | BankStatement | N:1 | Conciliada com extrato |
| BankStatement | BankAccount | N:1 | Extrato de uma conta |
| **Todos** | **Tenant** | **N:1** | **Tudo pertence a um tenant** |
