-- Migration: 002_budgets_schema
-- Description: Create tables for budgets, versions, categories, tasks, and prices

-- Budgets table
CREATE TABLE public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  project_name TEXT,
  location TEXT,
  client_name TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  base_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Budget versions (snapshots)
CREATE TABLE public.budget_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  name TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  inflation_index NUMERIC(10, 4),
  inflation_index_name TEXT,
  notes TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  is_simulation BOOLEAN DEFAULT FALSE,
  totals JSONB,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(budget_id, version_number)
);

-- Categories (rubros)
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (items del presupuesto)
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC(15, 4) DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task prices (per version)
CREATE TABLE public.task_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE NOT NULL,
  labor_unit_price NUMERIC(15, 2) DEFAULT 0,
  labor_quantity NUMERIC(10, 2) DEFAULT 0,
  labor_total NUMERIC(15, 2) GENERATED ALWAYS AS (labor_unit_price * labor_quantity) STORED,
  materials_total NUMERIC(15, 2) DEFAULT 0,
  total NUMERIC(15, 2) GENERATED ALWAYS AS ((labor_unit_price * labor_quantity) + materials_total) STORED,

  UNIQUE(task_id, version_id)
);

-- Task materials
CREATE TABLE public.task_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_price_id UUID REFERENCES public.task_prices(id) ON DELETE CASCADE NOT NULL,
  material_catalog_id UUID,
  name TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC(15, 4) DEFAULT 0,
  unit_price NUMERIC(15, 2) DEFAULT 0,
  total NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  order_index INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_budgets_tenant ON public.budgets(tenant_id);
CREATE INDEX idx_budgets_status ON public.budgets(status);
CREATE INDEX idx_budget_versions_budget ON public.budget_versions(budget_id);
CREATE INDEX idx_categories_budget ON public.categories(budget_id);
CREATE INDEX idx_tasks_budget ON public.tasks(budget_id);
CREATE INDEX idx_tasks_category ON public.tasks(category_id);
CREATE INDEX idx_task_prices_version ON public.task_prices(version_id);
CREATE INDEX idx_task_prices_task ON public.task_prices(task_id);
CREATE INDEX idx_task_materials_task_price ON public.task_materials(task_price_id);
