'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { BudgetVersion, InflationIndex } from '@/lib/types'

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

export async function createVersion(
  budgetId: string,
  sourceVersionId: string,
  options: { name?: string; notes?: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get next version number
  const { data: versions } = await supabase
    .from('budget_versions')
    .select('version_number')
    .eq('budget_id', budgetId)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = (versions?.[0]?.version_number || 0) + 1

  // Create new version
  const { data: newVersion, error } = await supabase
    .from('budget_versions')
    .insert({
      budget_id: budgetId,
      version_number: nextVersion,
      name: options.name || `Version ${nextVersion}`,
      date: new Date().toISOString().split('T')[0],
      notes: options.notes,
      is_current: true,
      created_by: user?.id
    })
    .select()
    .single()

  if (error) throw error

  // Unset current from other versions
  await supabase
    .from('budget_versions')
    .update({ is_current: false })
    .eq('budget_id', budgetId)
    .neq('id', newVersion.id)

  // Copy task_prices from source
  const { data: sourcePrices } = await supabase
    .from('task_prices')
    .select('*')
    .eq('version_id', sourceVersionId)

  for (const price of sourcePrices || []) {
    const { data: newPrice } = await supabase
      .from('task_prices')
      .insert({
        task_id: price.task_id,
        version_id: newVersion.id,
        labor_unit_price: price.labor_unit_price,
        labor_quantity: price.labor_quantity,
        materials_total: price.materials_total
      })
      .select()
      .single()

    // Copy materials
    if (newPrice) {
      const { data: materials } = await supabase
        .from('task_materials')
        .select('*')
        .eq('task_price_id', price.id)

      if (materials && materials.length > 0) {
        await supabase
          .from('task_materials')
          .insert(
            materials.map(m => ({
              task_price_id: newPrice.id,
              material_catalog_id: m.material_catalog_id,
              name: m.name,
              unit: m.unit,
              quantity: m.quantity,
              unit_price: m.unit_price,
              order_index: m.order_index
            }))
          )
      }
    }
  }

  revalidatePath(`/budgets/${budgetId}`)
  return newVersion
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

  revalidatePath(`/budgets/${budgetId}`)
}

export async function deleteVersion(versionId: string, budgetId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('budget_versions')
    .delete()
    .eq('id', versionId)

  if (error) throw error

  revalidatePath(`/budgets/${budgetId}`)
}

export async function applyInflation(
  sourceVersionId: string,
  budgetId: string,
  options: {
    factor: number
    indexName: string
    versionName: string
    isSimulation: boolean
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get next version number
  const { data: versions } = await supabase
    .from('budget_versions')
    .select('version_number')
    .eq('budget_id', budgetId)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = (versions?.[0]?.version_number || 0) + 1

  // Create new version
  const { data: newVersion, error } = await supabase
    .from('budget_versions')
    .insert({
      budget_id: budgetId,
      version_number: nextVersion,
      name: options.versionName || `Version ${nextVersion}`,
      date: new Date().toISOString().split('T')[0],
      inflation_index: options.factor,
      inflation_index_name: options.indexName,
      notes: `Ajuste por inflacion con factor ${options.factor}`,
      is_simulation: options.isSimulation,
      is_current: !options.isSimulation,
      created_by: user?.id
    })
    .select()
    .single()

  if (error) throw error

  // If not simulation, unset current from other versions
  if (!options.isSimulation) {
    await supabase
      .from('budget_versions')
      .update({ is_current: false })
      .eq('budget_id', budgetId)
      .neq('id', newVersion.id)
  }

  // Copy task_prices with inflation adjustment
  const { data: sourcePrices } = await supabase
    .from('task_prices')
    .select('*')
    .eq('version_id', sourceVersionId)

  for (const price of sourcePrices || []) {
    const { data: newPrice } = await supabase
      .from('task_prices')
      .insert({
        task_id: price.task_id,
        version_id: newVersion.id,
        labor_unit_price: Math.round(price.labor_unit_price * options.factor * 100) / 100,
        labor_quantity: price.labor_quantity,
        materials_total: Math.round(price.materials_total * options.factor * 100) / 100
      })
      .select()
      .single()

    // Copy materials with inflation adjustment
    if (newPrice) {
      const { data: materials } = await supabase
        .from('task_materials')
        .select('*')
        .eq('task_price_id', price.id)

      if (materials && materials.length > 0) {
        await supabase
          .from('task_materials')
          .insert(
            materials.map(m => ({
              task_price_id: newPrice.id,
              material_catalog_id: m.material_catalog_id,
              name: m.name,
              unit: m.unit,
              quantity: m.quantity,
              unit_price: Math.round(m.unit_price * options.factor * 100) / 100,
              order_index: m.order_index
            }))
          )
      }
    }
  }

  revalidatePath(`/budgets/${budgetId}`)
  return newVersion
}

// Inflation indexes

export async function getInflationIndexes(): Promise<InflationIndex[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inflation_indexes')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createInflationIndex(input: {
  name: string
  date: string
  value: number
  base_date: string
  source?: string
  notes?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Usuario no encontrado')

  const { data, error } = await supabase
    .from('inflation_indexes')
    .insert({
      tenant_id: profile.tenant_id,
      name: input.name,
      date: input.date,
      value: input.value,
      base_date: input.base_date,
      source: input.source,
      notes: input.notes
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/inflation')
  return data
}

export async function deleteInflationIndex(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inflation_indexes')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/inflation')
}
