-- Migration: 003_materials_schema
-- Description: Create tables for material catalog and inflation indexes

-- Material catalog (reusable materials library)
CREATE TABLE public.material_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  category TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_material_catalog_updated_at
  BEFORE UPDATE ON public.material_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Material prices (historical)
CREATE TABLE public.material_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES public.material_catalog(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC(15, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inflation indexes
CREATE TABLE public.inflation_indexes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC(10, 4) NOT NULL,
  base_date DATE NOT NULL,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, name, date)
);

-- Add foreign key to task_materials for material_catalog
ALTER TABLE public.task_materials
ADD CONSTRAINT fk_task_materials_catalog
FOREIGN KEY (material_catalog_id) REFERENCES public.material_catalog(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_material_catalog_tenant ON public.material_catalog(tenant_id);
CREATE INDEX idx_material_catalog_category ON public.material_catalog(category);
CREATE INDEX idx_material_prices_material ON public.material_prices(material_id);
CREATE INDEX idx_material_prices_date ON public.material_prices(date DESC);
CREATE INDEX idx_inflation_indexes_tenant ON public.inflation_indexes(tenant_id);
CREATE INDEX idx_inflation_indexes_date ON public.inflation_indexes(date DESC);
