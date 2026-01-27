'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { BudgetForCopy, CopyTasksInput, CopyTasksResult, Category, TaskForCopy } from '@/lib/types'

export async function getBudgetsForCopy(excludeBudgetId: string): Promise<BudgetForCopy[]> {
  const supabase = await createClient()

  // Get budgets with current version
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select(`
      id, name, project_name,
      budget_versions!inner(id, version_number, is_current)
    `)
    .neq('id', excludeBudgetId)
    .eq('budget_versions.is_current', true)
    .order('updated_at', { ascending: false })

  if (error) throw error

  const result: BudgetForCopy[] = []

  for (const budget of budgets || []) {
    const versionData = budget.budget_versions as unknown as { id: string; version_number: number }[]
    const versionId = versionData?.[0]?.id
    if (!versionId) continue

    // Get categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, order_index')
      .eq('budget_id', budget.id)
      .order('order_index')

    // Get tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('budget_id', budget.id)
      .order('order_index')

    // Get task_prices for current version
    const { data: prices } = await supabase
      .from('task_prices')
      .select('*')
      .eq('version_id', versionId)

    const pricesMap = new Map(prices?.map(p => [p.task_id, p]) || [])

    // Get materials for all prices
    const priceIds = prices?.map(p => p.id) || []
    let materials: typeof prices = []
    if (priceIds.length > 0) {
      const { data: mats } = await supabase
        .from('task_materials')
        .select('*')
        .in('task_price_id', priceIds)
      materials = mats || []
    }

    const materialsMap = new Map<string, typeof materials>()
    for (const mat of materials) {
      const existing = materialsMap.get(mat.task_price_id) || []
      existing.push(mat)
      materialsMap.set(mat.task_price_id, existing)
    }

    // Build categories with tasks
    const categoriesWithTasks = (categories || []).map(cat => ({
      id: cat.id,
      name: cat.name,
      tasks: (tasks || [])
        .filter(t => t.category_id === cat.id)
        .map(t => {
          const price = pricesMap.get(t.id)
          return {
            ...t,
            task_price: price || null,
            materials: price ? (materialsMap.get(price.id) || []) : []
          }
        })
    }))

    result.push({
      id: budget.id,
      name: budget.name,
      project_name: budget.project_name,
      current_version: {
        id: versionId,
        version_number: versionData[0].version_number
      },
      categories: categoriesWithTasks
    })
  }

  return result
}

export async function getTargetCategories(budgetId: string): Promise<Category[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('budget_id', budgetId)
    .order('order_index')

  if (error) throw error
  return data || []
}

export async function copyTasksFromBudget(input: CopyTasksInput): Promise<CopyTasksResult> {
  const supabase = await createClient()

  const { sourceBudgetId, sourceVersionId, taskIds, targetBudgetId, targetCategoryId, newCategoryName } = input

  if (taskIds.length === 0) {
    return { success: false, copiedCount: 0, newTaskIds: [], errors: ['No hay items seleccionados'] }
  }

  // Get target version
  const { data: targetVersion } = await supabase
    .from('budget_versions')
    .select('id')
    .eq('budget_id', targetBudgetId)
    .eq('is_current', true)
    .single()

  if (!targetVersion) {
    return { success: false, copiedCount: 0, newTaskIds: [], errors: ['No hay version activa en el presupuesto destino'] }
  }

  // Determine target category
  let categoryId = targetCategoryId

  if (!categoryId && newCategoryName) {
    // Create new category
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('order_index')
      .eq('budget_id', targetBudgetId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = (existingCategories?.[0]?.order_index ?? -1) + 1

    const { data: newCategory, error: catError } = await supabase
      .from('categories')
      .insert({
        budget_id: targetBudgetId,
        name: newCategoryName,
        order_index: nextOrderIndex
      })
      .select()
      .single()

    if (catError) {
      return { success: false, copiedCount: 0, newTaskIds: [], errors: [catError.message] }
    }

    categoryId = newCategory.id
  }

  if (!categoryId) {
    return { success: false, copiedCount: 0, newTaskIds: [], errors: ['No se especifico categoria destino'] }
  }

  // Get source tasks
  const { data: sourceTasks } = await supabase
    .from('tasks')
    .select('*')
    .in('id', taskIds)

  if (!sourceTasks || sourceTasks.length === 0) {
    return { success: false, copiedCount: 0, newTaskIds: [], errors: ['No se encontraron los items origen'] }
  }

  // Get source prices
  const { data: sourcePrices } = await supabase
    .from('task_prices')
    .select('*')
    .eq('version_id', sourceVersionId)
    .in('task_id', taskIds)

  const pricesMap = new Map(sourcePrices?.map(p => [p.task_id, p]) || [])

  // Get materials
  const priceIds = sourcePrices?.map(p => p.id) || []
  let sourceMaterials: typeof sourcePrices = []
  if (priceIds.length > 0) {
    const { data: mats } = await supabase
      .from('task_materials')
      .select('*')
      .in('task_price_id', priceIds)
    sourceMaterials = mats || []
  }

  const materialsMap = new Map<string, typeof sourceMaterials>()
  for (const mat of sourceMaterials) {
    const existing = materialsMap.get(mat.task_price_id) || []
    existing.push(mat)
    materialsMap.set(mat.task_price_id, existing)
  }

  // Get next order_index for target category
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('order_index')
    .eq('category_id', categoryId)
    .order('order_index', { ascending: false })
    .limit(1)

  let nextOrderIndex = (existingTasks?.[0]?.order_index ?? -1) + 1

  // Copy tasks
  const newTaskIds: string[] = []
  const errors: string[] = []

  for (const sourceTask of sourceTasks) {
    // Create new task
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        budget_id: targetBudgetId,
        category_id: categoryId,
        name: sourceTask.name,
        unit: sourceTask.unit,
        quantity: sourceTask.quantity,
        notes: sourceTask.notes,
        order_index: nextOrderIndex++
      })
      .select()
      .single()

    if (taskError) {
      errors.push(`Error copiando "${sourceTask.name}": ${taskError.message}`)
      continue
    }

    newTaskIds.push(newTask.id)

    // Copy task_price
    const sourcePrice = pricesMap.get(sourceTask.id)

    const { data: newPrice, error: priceError } = await supabase
      .from('task_prices')
      .insert({
        task_id: newTask.id,
        version_id: targetVersion.id,
        labor_unit_price: sourcePrice?.labor_unit_price || 0,
        labor_quantity: sourcePrice?.labor_quantity || 0,
        materials_total: sourcePrice?.materials_total || 0
      })
      .select()
      .single()

    if (priceError) {
      errors.push(`Error copiando precio de "${sourceTask.name}": ${priceError.message}`)
      continue
    }

    // Copy materials
    if (sourcePrice && newPrice) {
      const taskMaterials = materialsMap.get(sourcePrice.id) || []

      if (taskMaterials.length > 0) {
        const { error: matError } = await supabase
          .from('task_materials')
          .insert(
            taskMaterials.map((m, idx) => ({
              task_price_id: newPrice.id,
              material_catalog_id: m.material_catalog_id,
              name: m.name,
              unit: m.unit,
              quantity: m.quantity,
              unit_price: m.unit_price,
              order_index: idx
            }))
          )

        if (matError) {
          errors.push(`Error copiando materiales de "${sourceTask.name}": ${matError.message}`)
        }
      }
    }
  }

  revalidatePath(`/budgets/${targetBudgetId}`)

  return {
    success: errors.length === 0,
    copiedCount: newTaskIds.length,
    newTaskIds,
    errors: errors.length > 0 ? errors : undefined
  }
}

export interface SimilarTaskResult {
  task: TaskForCopy
  budgetName: string
  budgetId: string
  similarity: number
}

export async function searchSimilarTasks(
  taskName: string,
  excludeBudgetId: string
): Promise<SimilarTaskResult[]> {
  const supabase = await createClient()

  // Normalize task name for search
  const searchTerms = taskName.toLowerCase().split(/\s+/).filter(t => t.length > 2)

  // Get budgets with their current versions
  const { data: budgets } = await supabase
    .from('budgets')
    .select(`
      id, name,
      budget_versions!inner(id, is_current)
    `)
    .neq('id', excludeBudgetId)
    .eq('budget_versions.is_current', true)

  if (!budgets || budgets.length === 0) return []

  const results: SimilarTaskResult[] = []

  for (const budget of budgets) {
    const versionData = budget.budget_versions as unknown as { id: string }[]
    const versionId = versionData?.[0]?.id
    if (!versionId) continue

    // Get tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('budget_id', budget.id)

    if (!tasks) continue

    // Get task_prices for this version
    const { data: prices } = await supabase
      .from('task_prices')
      .select('*')
      .eq('version_id', versionId)

    const pricesMap = new Map(prices?.map(p => [p.task_id, p]) || [])

    // Get materials
    const priceIds = prices?.map(p => p.id) || []
    let materials: typeof prices = []
    if (priceIds.length > 0) {
      const { data: mats } = await supabase
        .from('task_materials')
        .select('*')
        .in('task_price_id', priceIds)
      materials = mats || []
    }

    const materialsMap = new Map<string, typeof materials>()
    for (const mat of materials) {
      const existing = materialsMap.get(mat.task_price_id) || []
      existing.push(mat)
      materialsMap.set(mat.task_price_id, existing)
    }

    // Find similar tasks
    for (const task of tasks) {
      const taskNameLower = task.name.toLowerCase()

      // Calculate similarity (simple word matching)
      let matchCount = 0
      for (const term of searchTerms) {
        if (taskNameLower.includes(term)) {
          matchCount++
        }
      }

      // Only include if at least one term matches
      if (matchCount > 0) {
        const similarity = searchTerms.length > 0 ? matchCount / searchTerms.length : 0
        const price = pricesMap.get(task.id)

        // Only include tasks with prices
        if (price && (price.labor_unit_price > 0 || price.materials_total > 0)) {
          results.push({
            task: {
              ...task,
              task_price: price,
              materials: price ? (materialsMap.get(price.id) || []) : []
            },
            budgetName: budget.name,
            budgetId: budget.id,
            similarity
          })
        }
      }
    }
  }

  // Sort by similarity (descending) and limit to 20 results
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20)
}
