'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  Budget,
  BudgetWithCategories,
  BudgetVersion,
  CreateBudgetInput,
  UpdateBudgetInput,
  ParsedCompute
} from '@/lib/types'

export async function getBudgets() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('budgets')
    .select('*, budget_versions(id, version_number, name, date, is_current)')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getBudget(id: string): Promise<BudgetWithCategories | null> {
  const supabase = await createClient()

  const { data: budget, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  if (!budget) return null

  // Get current version
  const { data: currentVersion } = await supabase
    .from('budget_versions')
    .select('*')
    .eq('budget_id', id)
    .eq('is_current', true)
    .single()

  // Get categories with tasks
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('budget_id', id)
    .order('order_index')

  // Get tasks for all categories
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('budget_id', id)
    .order('order_index')

  // Get task prices for current version
  let taskPrices: Record<string, any> = {}
  if (currentVersion) {
    const { data: prices } = await supabase
      .from('task_prices')
      .select('*')
      .eq('version_id', currentVersion.id)

    if (prices) {
      taskPrices = prices.reduce((acc, p) => {
        acc[p.task_id] = p
        return acc
      }, {} as Record<string, any>)
    }
  }

  // Build categories with tasks
  const categoriesWithTasks = (categories || []).map(cat => ({
    ...cat,
    tasks: (tasks || [])
      .filter(t => t.category_id === cat.id)
      .map(t => ({
        ...t,
        task_price: taskPrices[t.id] || null
      }))
  }))

  return {
    ...budget,
    categories: categoriesWithTasks,
    current_version: currentVersion || null
  }
}

export async function createBudget(input: CreateBudgetInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Usuario no encontrado')

  // Create budget
  const { data: budget, error } = await supabase
    .from('budgets')
    .insert({
      tenant_id: profile.tenant_id,
      name: input.name,
      project_name: input.project_name || null,
      location: input.location || null,
      client_name: input.client_name || null,
      notes: input.notes || null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw error

  // Create initial version
  await supabase
    .from('budget_versions')
    .insert({
      budget_id: budget.id,
      version_number: 1,
      name: 'Version inicial',
      date: new Date().toISOString().split('T')[0],
      is_current: true,
      created_by: user.id
    })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/budgets')

  return budget
}

export async function updateBudget(id: string, input: UpdateBudgetInput) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('budgets')
    .update({
      name: input.name,
      project_name: input.project_name,
      location: input.location,
      client_name: input.client_name,
      notes: input.notes,
      status: input.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) throw error

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/budgets')
  revalidatePath(`/dashboard/budgets/${id}`)
}

export async function deleteBudget(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/budgets')
}

export async function updateBudgetStatus(id: string, status: 'draft' | 'active' | 'archived') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('budgets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/budgets')
  revalidatePath(`/dashboard/budgets/${id}`)
}

export async function importCompute(budgetId: string, parsed: ParsedCompute) {
  const supabase = await createClient()

  if (parsed.categories.length === 0) {
    throw new Error('No se encontraron categorias validas en el archivo')
  }

  // Get current version
  const { data: version } = await supabase
    .from('budget_versions')
    .select('id')
    .eq('budget_id', budgetId)
    .eq('is_current', true)
    .single()

  if (!version) throw new Error('No hay version activa')

  // Insert categories and tasks
  for (let catIdx = 0; catIdx < parsed.categories.length; catIdx++) {
    const cat = parsed.categories[catIdx]

    const { data: category, error: catError } = await supabase
      .from('categories')
      .insert({
        budget_id: budgetId,
        name: cat.name,
        order_index: catIdx
      })
      .select()
      .single()

    if (catError) throw catError

    // Insert tasks
    for (let taskIdx = 0; taskIdx < cat.tasks.length; taskIdx++) {
      const task = cat.tasks[taskIdx]

      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          budget_id: budgetId,
          category_id: category.id,
          name: task.name,
          unit: task.unit,
          quantity: task.quantity,
          order_index: taskIdx
        })
        .select()
        .single()

      if (taskError) throw taskError

      // Create empty task_price for current version
      await supabase
        .from('task_prices')
        .insert({
          task_id: newTask.id,
          version_id: version.id,
          labor_unit_price: 0,
          labor_quantity: 0,
          materials_total: 0
        })
    }
  }

  revalidatePath(`/dashboard/budgets/${budgetId}`)

  return { success: true, warnings: parsed.warnings }
}

export async function getVersions(budgetId: string): Promise<BudgetVersion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('budget_versions')
    .select('*')
    .eq('budget_id', budgetId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data || []
}

export async function setCurrentVersion(versionId: string, budgetId: string) {
  const supabase = await createClient()

  // Unset current from all versions
  await supabase
    .from('budget_versions')
    .update({ is_current: false })
    .eq('budget_id', budgetId)

  // Set new current
  const { error } = await supabase
    .from('budget_versions')
    .update({ is_current: true })
    .eq('id', versionId)

  if (error) throw error

  revalidatePath(`/dashboard/budgets/${budgetId}`)
}
