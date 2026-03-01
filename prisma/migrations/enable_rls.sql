-- ============================================================
-- Row Level Security for Multi-Tenant Isolation
-- Run this AFTER the initial Prisma migration
-- ============================================================
-- Schemas:
--   core       → Tenant, User, RefreshToken, Invitation
--   rh         → Department, Position, WorkSchedule, Employee, TimeRecord, Leave
--   financeiro → FinancialCategory, CostCenter, BankAccount, AccountPayable,
--                AccountReceivable, FinancialTransaction, BankStatement
-- ============================================================

-- Create app role (non-superuser for RLS enforcement)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password' NOSUPERUSER;
  END IF;
END
$$;

-- Grant permissions on all schemas
GRANT USAGE ON SCHEMA core TO app_user;
GRANT USAGE ON SCHEMA rh TO app_user;
GRANT USAGE ON SCHEMA financeiro TO app_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA core TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA rh TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA financeiro TO app_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA core TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA rh TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financeiro TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT ALL ON SEQUENCES TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA rh GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA rh GRANT ALL ON SEQUENCES TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA financeiro GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA financeiro GRANT ALL ON SEQUENCES TO app_user;

-- ============================================================
-- CORE SCHEMA: Enable RLS
-- ============================================================

ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.invitations ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY tenant_isolation_policy ON core.users
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON core.users
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Refresh Tokens (via user's tenant)
CREATE POLICY tenant_isolation_policy ON core.refresh_tokens
  USING (user_id IN (
    SELECT id FROM core.users WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
  ));
CREATE POLICY bypass_rls_policy ON core.refresh_tokens
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Invitations
CREATE POLICY tenant_isolation_policy ON core.invitations
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON core.invitations
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- ============================================================
-- RH SCHEMA: Enable RLS
-- ============================================================

ALTER TABLE rh.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.leaves ENABLE ROW LEVEL SECURITY;

-- Departments
CREATE POLICY tenant_isolation_policy ON rh.departments
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON rh.departments
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Positions
CREATE POLICY tenant_isolation_policy ON rh.positions
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON rh.positions
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Work Schedules
CREATE POLICY tenant_isolation_policy ON rh.work_schedules
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON rh.work_schedules
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Employees
CREATE POLICY tenant_isolation_policy ON rh.employees
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON rh.employees
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Time Records
CREATE POLICY tenant_isolation_policy ON rh.time_records
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON rh.time_records
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Leaves
CREATE POLICY tenant_isolation_policy ON rh.leaves
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON rh.leaves
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- ============================================================
-- FINANCEIRO SCHEMA: Enable RLS
-- ============================================================

ALTER TABLE financeiro.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.bank_statements ENABLE ROW LEVEL SECURITY;

-- Financial Categories
CREATE POLICY tenant_isolation_policy ON financeiro.financial_categories
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON financeiro.financial_categories
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Cost Centers
CREATE POLICY tenant_isolation_policy ON financeiro.cost_centers
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON financeiro.cost_centers
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Bank Accounts
CREATE POLICY tenant_isolation_policy ON financeiro.bank_accounts
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON financeiro.bank_accounts
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Accounts Payable
CREATE POLICY tenant_isolation_policy ON financeiro.accounts_payable
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON financeiro.accounts_payable
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Accounts Receivable
CREATE POLICY tenant_isolation_policy ON financeiro.accounts_receivable
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON financeiro.accounts_receivable
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Financial Transactions
CREATE POLICY tenant_isolation_policy ON financeiro.financial_transactions
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON financeiro.financial_transactions
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Bank Statements
CREATE POLICY tenant_isolation_policy ON financeiro.bank_statements
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON financeiro.bank_statements
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');
