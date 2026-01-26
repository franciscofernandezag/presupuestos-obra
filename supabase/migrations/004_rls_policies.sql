-- Migration: 004_rls_policies
-- Description: Enable Row Level Security and create policies

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inflation_indexes ENABLE ROW LEVEL SECURITY;

-- Helper function to get tenant_id of current user (in public schema)
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- TENANTS policies
CREATE POLICY "Users can view own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_tenant_id());

CREATE POLICY "Admins can update tenant"
  ON public.tenants FOR UPDATE
  USING (id = public.get_tenant_id() AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- USERS policies
CREATE POLICY "Users can view users in same tenant"
  ON public.users FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert during registration"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- BUDGETS policies
CREATE POLICY "Users can view budgets in tenant"
  ON public.budgets FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Editors can create budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (
    tenant_id = public.get_tenant_id() AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Editors can update budgets"
  ON public.budgets FOR UPDATE
  USING (
    tenant_id = public.get_tenant_id() AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins can delete budgets"
  ON public.budgets FOR DELETE
  USING (
    tenant_id = public.get_tenant_id() AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- BUDGET_VERSIONS policies (inherited from budget)
CREATE POLICY "Users can view versions"
  ON public.budget_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_id()
  ));

CREATE POLICY "Editors can insert versions"
  ON public.budget_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_id()
  ) AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));

CREATE POLICY "Editors can update versions"
  ON public.budget_versions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_id()
  ) AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));

CREATE POLICY "Editors can delete versions"
  ON public.budget_versions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_id()
  ) AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));

-- CATEGORIES policies
CREATE POLICY "Users can view categories"
  ON public.categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_id()
  ));

CREATE POLICY "Editors can manage categories"
  ON public.categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_id()
  ) AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));

-- TASKS policies
CREATE POLICY "Users can view tasks"
  ON public.tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_id()
  ));

CREATE POLICY "Editors can manage tasks"
  ON public.tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_id()
  ) AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));

-- TASK_PRICES policies
CREATE POLICY "Users can view task prices"
  ON public.task_prices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.budgets b ON b.id = t.budget_id
    WHERE t.id = task_id AND b.tenant_id = public.get_tenant_id()
  ));

CREATE POLICY "Editors can manage task prices"
  ON public.task_prices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.budgets b ON b.id = t.budget_id
    WHERE t.id = task_id AND b.tenant_id = public.get_tenant_id()
  ) AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));

-- TASK_MATERIALS policies
CREATE POLICY "Users can view task materials"
  ON public.task_materials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.task_prices tp
    JOIN public.tasks t ON t.id = tp.task_id
    JOIN public.budgets b ON b.id = t.budget_id
    WHERE tp.id = task_price_id AND b.tenant_id = public.get_tenant_id()
  ));

CREATE POLICY "Editors can manage task materials"
  ON public.task_materials FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.task_prices tp
    JOIN public.tasks t ON t.id = tp.task_id
    JOIN public.budgets b ON b.id = t.budget_id
    WHERE tp.id = task_price_id AND b.tenant_id = public.get_tenant_id()
  ) AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));

-- MATERIAL_CATALOG policies
CREATE POLICY "Users can view materials in tenant"
  ON public.material_catalog FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Editors can manage materials"
  ON public.material_catalog FOR ALL
  USING (tenant_id = public.get_tenant_id() AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));

-- MATERIAL_PRICES policies
CREATE POLICY "Users can view material prices"
  ON public.material_prices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.material_catalog m
    WHERE m.id = material_id AND m.tenant_id = public.get_tenant_id()
  ));

CREATE POLICY "Editors can manage material prices"
  ON public.material_prices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.material_catalog m
    WHERE m.id = material_id AND m.tenant_id = public.get_tenant_id()
  ) AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));

-- INFLATION_INDEXES policies
CREATE POLICY "Users can view indexes in tenant"
  ON public.inflation_indexes FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Editors can manage indexes"
  ON public.inflation_indexes FOR ALL
  USING (tenant_id = public.get_tenant_id() AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  ));
