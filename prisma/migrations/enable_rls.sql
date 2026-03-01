-- Row Level Security for Multi-Tenant Isolation
-- Run this AFTER the initial Prisma migration

-- Create app role (non-superuser for RLS enforcement)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password' NOSUPERUSER;
  END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;

-- ============================================================
-- Enable RLS on tenant-scoped tables
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Tenant isolation policies
-- ============================================================

-- Users
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY bypass_rls_policy ON users
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Refresh Tokens (via user's tenant)
CREATE POLICY tenant_isolation_policy ON refresh_tokens
  USING (user_id IN (
    SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
  ));

CREATE POLICY bypass_rls_policy ON refresh_tokens
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Invitations
CREATE POLICY tenant_isolation_policy ON invitations
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY bypass_rls_policy ON invitations
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- ============================================================
-- HR Module: Enable RLS
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Departments
CREATE POLICY tenant_isolation_policy ON departments
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON departments
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Positions
CREATE POLICY tenant_isolation_policy ON positions
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON positions
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Work Schedules
CREATE POLICY tenant_isolation_policy ON work_schedules
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON work_schedules
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Employees
CREATE POLICY tenant_isolation_policy ON employees
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON employees
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Time Records
CREATE POLICY tenant_isolation_policy ON time_records
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON time_records
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');

-- Leaves
CREATE POLICY tenant_isolation_policy ON leaves
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
CREATE POLICY bypass_rls_policy ON leaves
  USING (current_setting('app.bypass_rls', TRUE)::text = 'on');
