import * as XLSX from 'xlsx'
import type { ParsedCompute, ParsedComputeCategory } from '@/lib/types'

/**
 * Parse an Excel compute file
 * Detects categories (rows ending with ":" without unit/quantity)
 */
export function parseComputeExcel(file: ArrayBuffer): ParsedCompute {
  const workbook = XLSX.read(file, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ''
  }) as unknown[][]

  const result: ParsedCompute = {
    categories: [],
    warnings: []
  }

  let currentCategory: ParsedComputeCategory | null = null

  // Detect columns
  const headerRow = data[0] as string[]
  const itemCol = findColumn(headerRow, ['item', 'items', 'descripcion', 'tarea', 'concepto', 'detalle'])
  const unitCol = findColumn(headerRow, ['u', 'unid', 'unidad', 'unit', 'un'])
  const qtyCol = findColumn(headerRow, ['cantidad', 'cant', 'qty', 'quantity', 'cant.'])

  if (itemCol === -1) {
    result.warnings.push('No se encontro columna de items')
    return result
  }

  // Parse rows (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[]
    const itemName = String(row[itemCol] || '').trim()
    const unit = unitCol >= 0 ? String(row[unitCol] || '').trim() : ''
    const quantity = qtyCol >= 0 ? parseNumber(row[qtyCol]) : null

    if (!itemName) continue

    // Detect if it's a category (ends with ":" and no unit/quantity)
    const isCategory = (
      itemName.endsWith(':') &&
      !unit &&
      (quantity === null || quantity === 0)
    )

    if (isCategory) {
      // Save previous category if it has tasks
      if (currentCategory && currentCategory.tasks.length > 0) {
        result.categories.push(currentCategory)
      }

      currentCategory = {
        name: itemName.replace(/:$/, '').trim(),
        tasks: []
      }
    } else if (currentCategory) {
      // Add task to current category
      if (unit && quantity !== null && quantity > 0) {
        currentCategory.tasks.push({
          name: itemName,
          unit: unit.toLowerCase(),
          quantity
        })
      } else if (itemName.length > 0) {
        result.warnings.push(`Fila ${i + 1}: "${itemName}" sin unidad o cantidad valida`)
      }
    } else {
      // Task without category - create default category
      if (!currentCategory) {
        currentCategory = { name: 'Sin categoria', tasks: [] }
      }
      if (unit && quantity !== null && quantity > 0) {
        currentCategory.tasks.push({
          name: itemName,
          unit: unit.toLowerCase(),
          quantity
        })
      }
    }
  }

  // Add last category
  if (currentCategory && currentCategory.tasks.length > 0) {
    result.categories.push(currentCategory)
  }

  return result
}

function findColumn(headers: string[], names: string[]): number {
  const normalized = headers.map(h => String(h).toLowerCase().trim())
  for (const name of names) {
    const idx = normalized.indexOf(name)
    if (idx >= 0) return idx
  }
  return -1
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }
  return null
}
