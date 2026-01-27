// Type definitions for database tables

export type Role = 'admin' | 'editor' | 'viewer'
export type BudgetStatus = 'draft' | 'active' | 'archived'

// Tenant (organization)
export interface Tenant {
  id: string
  name: string
  slug: string
  settings: {
    iva_percentage: number
    default_currency: string
    date_format?: string
  }
  created_at: string
  updated_at: string
}

// User profile
export interface User {
  id: string
  tenant_id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
  updated_at: string
}

// Budget
export interface Budget {
  id: string
  tenant_id: string
  name: string
  project_name: string | null
  location: string | null
  client_name: string | null
  status: BudgetStatus
  base_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// Budget version (snapshot)
export interface BudgetVersion {
  id: string
  budget_id: string
  version_number: number
  name: string | null
  date: string
  inflation_index: number | null
  inflation_index_name: string | null
  notes: string | null
  is_current: boolean
  is_simulation: boolean
  totals: BudgetTotals | null
  created_by: string | null
  created_at: string
}

// Category (rubro)
export interface Category {
  id: string
  budget_id: string
  name: string
  order_index: number
  created_at: string
}

// Task (item del presupuesto)
export interface Task {
  id: string
  budget_id: string
  category_id: string
  name: string
  unit: string | null
  quantity: number
  order_index: number
  notes: string | null
  created_at: string
}

// Task price (per version)
export interface TaskPrice {
  id: string
  task_id: string
  version_id: string
  labor_unit_price: number
  labor_quantity: number
  labor_total: number
  materials_total: number
  total: number
}

// Task material
export interface TaskMaterial {
  id: string
  task_price_id: string
  material_catalog_id: string | null
  name: string
  unit: string | null
  quantity: number
  unit_price: number
  total: number
  order_index: number
}

// Material catalog
export interface MaterialCatalog {
  id: string
  tenant_id: string
  name: string
  unit: string | null
  category: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Material price (historical)
export interface MaterialPrice {
  id: string
  material_id: string
  price: number
  date: string
  source: string | null
  notes: string | null
  created_at: string
}

// Inflation index
export interface InflationIndex {
  id: string
  tenant_id: string
  name: string
  date: string
  value: number
  base_date: string
  source: string | null
  notes: string | null
  created_at: string
}

// Computed types for UI

export interface BudgetTotals {
  labor_total: number
  materials_total: number
  subtotal: number
}

export interface CategoryTotals {
  id: string
  name: string
  labor_total: number
  materials_total: number
  total: number
}

// Extended types with relations

export interface TaskWithPrice extends Task {
  task_price?: TaskPrice | null
}

export interface TaskWithPriceAndMaterials extends TaskWithPrice {
  materials?: TaskMaterial[]
}

export interface CategoryWithTasks extends Category {
  tasks: TaskWithPrice[]
}

export interface BudgetWithCategories extends Budget {
  categories: CategoryWithTasks[]
  current_version?: BudgetVersion | null
}

export interface BudgetWithVersion extends Budget {
  budget_versions: BudgetVersion[]
}

// Form types

export interface CreateBudgetInput {
  name: string
  project_name?: string
  location?: string
  client_name?: string
  notes?: string
}

export interface UpdateBudgetInput extends Partial<CreateBudgetInput> {
  status?: BudgetStatus
}

export interface CreateTaskPriceInput {
  task_id: string
  version_id: string
  labor_unit_price?: number
  labor_quantity?: number
}

export interface UpdateTaskPriceInput {
  labor_unit_price?: number
  labor_quantity?: number
  materials_total?: number
}

export interface CreateTaskMaterialInput {
  name: string
  unit?: string
  quantity?: number
  unit_price?: number
  material_catalog_id?: string
}

export interface UpdateTaskMaterialInput extends Partial<CreateTaskMaterialInput> {}

export interface CreateInflationIndexInput {
  name: string
  date: string
  value: number
  base_date: string
  source?: string
  notes?: string
}

// Excel parsing types

export interface ParsedComputeTask {
  name: string
  unit: string
  quantity: number
}

export interface ParsedComputeCategory {
  name: string
  tasks: ParsedComputeTask[]
}

export interface ParsedCompute {
  categories: ParsedComputeCategory[]
  warnings: string[]
}

// Copy items types

export interface CopyTasksInput {
  sourceBudgetId: string
  sourceVersionId: string
  taskIds: string[]
  targetBudgetId: string
  targetCategoryId: string | null
  newCategoryName?: string
}

export interface CopyTasksResult {
  success: boolean
  copiedCount: number
  newTaskIds: string[]
  errors?: string[]
}

export interface TaskForCopy extends Task {
  task_price: TaskPrice | null
  materials: TaskMaterial[]
}

export interface CategoryForCopy {
  id: string
  name: string
  tasks: TaskForCopy[]
}

export interface BudgetForCopy {
  id: string
  name: string
  project_name: string | null
  current_version: { id: string; version_number: number } | null
  categories: CategoryForCopy[]
}
