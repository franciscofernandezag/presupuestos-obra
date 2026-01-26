-- Migration: 005_functions
-- Description: Create helper functions and triggers

-- Function to handle new user registration (creates tenant and user profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  company_name TEXT;
  user_name TEXT;
BEGIN
  -- Get company name from metadata or use email prefix
  company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1)
  );

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create new tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (
    company_name,
    LOWER(REGEXP_REPLACE(company_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTR(gen_random_uuid()::text, 1, 8)
  )
  RETURNING id INTO new_tenant_id;

  -- Create user profile linked to tenant
  INSERT INTO public.users (id, tenant_id, email, name, role)
  VALUES (
    NEW.id,
    new_tenant_id,
    NEW.email,
    user_name,
    'admin' -- First user of tenant is admin
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate budget totals for a version
CREATE OR REPLACE FUNCTION public.calculate_budget_totals(p_version_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'labor_total', COALESCE(SUM(tp.labor_total * t.quantity), 0),
    'materials_total', COALESCE(SUM(tp.materials_total * t.quantity), 0),
    'subtotal', COALESCE(SUM(tp.total * t.quantity), 0)
  )
  INTO result
  FROM public.tasks t
  LEFT JOIN public.task_prices tp ON tp.task_id = t.id AND tp.version_id = p_version_id
  WHERE t.budget_id = (
    SELECT budget_id FROM public.budget_versions WHERE id = p_version_id
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to duplicate version with inflation adjustment
CREATE OR REPLACE FUNCTION public.duplicate_version_with_inflation(
  p_source_version_id UUID,
  p_inflation_factor NUMERIC,
  p_new_version_name TEXT DEFAULT NULL,
  p_is_simulation BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  new_version_id UUID;
  source_version RECORD;
  new_version_number INTEGER;
  v_budget_id UUID;
BEGIN
  -- Get source version
  SELECT * INTO source_version FROM public.budget_versions WHERE id = p_source_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source version not found';
  END IF;

  v_budget_id := source_version.budget_id;

  -- Calculate next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO new_version_number
  FROM public.budget_versions WHERE budget_id = v_budget_id;

  -- Create new version
  INSERT INTO public.budget_versions (
    budget_id, version_number, name, date, inflation_index,
    inflation_index_name, notes, is_simulation, is_current, created_by
  ) VALUES (
    v_budget_id,
    new_version_number,
    COALESCE(p_new_version_name, 'Version ' || new_version_number),
    CURRENT_DATE,
    p_inflation_factor,
    'Ajuste por inflacion',
    'Creado desde version ' || source_version.version_number || ' con factor ' || p_inflation_factor,
    p_is_simulation,
    NOT p_is_simulation, -- Set as current only if not simulation
    auth.uid()
  ) RETURNING id INTO new_version_id;

  -- If not simulation, unset current from other versions
  IF NOT p_is_simulation THEN
    UPDATE public.budget_versions
    SET is_current = FALSE
    WHERE budget_id = v_budget_id AND id != new_version_id;
  END IF;

  -- Copy task_prices with inflation adjustment
  INSERT INTO public.task_prices (task_id, version_id, labor_unit_price, labor_quantity, materials_total)
  SELECT
    tp.task_id,
    new_version_id,
    ROUND(tp.labor_unit_price * p_inflation_factor, 2),
    tp.labor_quantity,
    ROUND(tp.materials_total * p_inflation_factor, 2)
  FROM public.task_prices tp
  WHERE tp.version_id = p_source_version_id;

  -- Copy task_materials with inflation adjustment
  INSERT INTO public.task_materials (task_price_id, material_catalog_id, name, unit, quantity, unit_price, order_index)
  SELECT
    new_tp.id,
    tm.material_catalog_id,
    tm.name,
    tm.unit,
    tm.quantity,
    ROUND(tm.unit_price * p_inflation_factor, 2),
    tm.order_index
  FROM public.task_materials tm
  JOIN public.task_prices old_tp ON old_tp.id = tm.task_price_id
  JOIN public.task_prices new_tp ON new_tp.task_id = old_tp.task_id AND new_tp.version_id = new_version_id
  WHERE old_tp.version_id = p_source_version_id;

  RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate materials_total on task_prices
CREATE OR REPLACE FUNCTION public.update_task_price_materials_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.task_prices
    SET materials_total = (
      SELECT COALESCE(SUM(total), 0)
      FROM public.task_materials
      WHERE task_price_id = OLD.task_price_id
    )
    WHERE id = OLD.task_price_id;
    RETURN OLD;
  ELSE
    UPDATE public.task_prices
    SET materials_total = (
      SELECT COALESCE(SUM(total), 0)
      FROM public.task_materials
      WHERE task_price_id = NEW.task_price_id
    )
    WHERE id = NEW.task_price_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update materials_total when task_materials change
CREATE TRIGGER update_materials_total_on_insert
  AFTER INSERT ON public.task_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_task_price_materials_total();

CREATE TRIGGER update_materials_total_on_update
  AFTER UPDATE ON public.task_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_task_price_materials_total();

CREATE TRIGGER update_materials_total_on_delete
  AFTER DELETE ON public.task_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_task_price_materials_total();
