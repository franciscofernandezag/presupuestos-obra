import * as XLSX from 'xlsx'
import type { ParsedCompute, ParsedComputeCategory } from '@/lib/types'

/**
 * Parse an Excel compute file
 * Supports multiple formats:
 * 1. Header-based: columns named "item", "unidad", "cantidad"
 * 2. Positional: 3 columns without headers (name, unit, quantity)
 *
 * Categories are detected as:
 * - Rows ending with ":" (legacy format)
 * - Rows with only 1 non-empty cell (new format)
 */
export function parseComputeExcel(file: ArrayBuffer): ParsedCompute {
  const workbook = XLSX.read(file, { type: 'array' })

  // Try to find relevant sheet - prefer sheets with more data
  // First check if TOTALES has substantial data, otherwise use detailed sheet
  let sheetName = workbook.SheetNames[0]

  const totalesSheet = workbook.SheetNames.find(name => {
    const lower = name.toLowerCase()
    return lower.includes('totales') || lower === 'total'
  })

  const computeSheet = workbook.SheetNames.find(name => {
    const lower = name.toLowerCase()
    return lower.includes('computo') || lower.includes('cómputo') || lower.includes('niveles')
  })

  // Check row counts to pick the better sheet
  if (totalesSheet && computeSheet) {
    const totalesData = XLSX.utils.sheet_to_json(workbook.Sheets[totalesSheet], { header: 1 }) as unknown[][]
    const computeData = XLSX.utils.sheet_to_json(workbook.Sheets[computeSheet], { header: 1 }) as unknown[][]
    // Use the sheet with more rows (likely more complete data)
    sheetName = totalesData.length > computeData.length * 0.5 ? totalesSheet : computeSheet
  } else {
    sheetName = totalesSheet || computeSheet || workbook.SheetNames[0]
  }

  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ''
  }) as unknown[][]

  const result: ParsedCompute = {
    categories: [],
    warnings: []
  }

  // Detect format
  const format = detectFormat(data)

  if (format.type === 'header') {
    return parseWithHeaders(data, format, result)
  } else {
    return parsePositional(data, result)
  }
}

interface FormatInfo {
  type: 'header' | 'positional'
  itemCol: number
  unitCol: number
  qtyCol: number
  startRow: number
}

function detectFormat(data: unknown[][]): FormatInfo {
  // Check first few rows for headers
  for (let i = 0; i < Math.min(3, data.length); i++) {
    const row = data[i] as string[]
    const itemCol = findColumn(row, ['item', 'items', 'ítems', 'itéms', 'descripcion', 'descripción', 'tarea', 'concepto', 'detalle', 'rubro'])
    const unitCol = findColumn(row, ['u', 'unid', 'unidad', 'unit', 'un', 'ud', 'und'])
    const qtyCol = findColumn(row, ['cantidad', 'cant', 'qty', 'quantity', 'cant.', 'total', 'subtotal'])

    if (itemCol >= 0) {
      return {
        type: 'header',
        itemCol,
        unitCol: unitCol >= 0 ? unitCol : 1,
        qtyCol: qtyCol >= 0 ? qtyCol : 2,
        startRow: i + 1
      }
    }
  }

  // No headers found - use positional format
  return {
    type: 'positional',
    itemCol: 0,
    unitCol: 1,
    qtyCol: 2,
    startRow: 0
  }
}

function parseWithHeaders(data: unknown[][], format: FormatInfo, result: ParsedCompute): ParsedCompute {
  let currentCategory: ParsedComputeCategory | null = null

  for (let i = format.startRow; i < data.length; i++) {
    const row = data[i] as unknown[]
    const itemName = String(row[format.itemCol] || '').trim()
    const unit = String(row[format.unitCol] || '').trim()
    const quantity = parseNumber(row[format.qtyCol])

    if (!itemName) continue

    // Detect if it's a category (ends with ":" and no unit/quantity)
    const isCategory = (
      itemName.endsWith(':') &&
      !unit &&
      (quantity === null || quantity === 0)
    )

    if (isCategory) {
      if (currentCategory && currentCategory.tasks.length > 0) {
        result.categories.push(currentCategory)
      }
      currentCategory = {
        name: itemName.replace(/:$/, '').trim(),
        tasks: []
      }
    } else if (currentCategory) {
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

  if (currentCategory && currentCategory.tasks.length > 0) {
    result.categories.push(currentCategory)
  }

  return result
}

function parsePositional(data: unknown[][], result: ParsedCompute): ParsedCompute {
  let currentCategory: ParsedComputeCategory | null = null
  let currentSubcategory: string | null = null
  let pendingTaskName: string | null = null // For sub-item headers

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as unknown[]

    // Skip empty rows
    if (!row || row.length === 0) continue

    // Get values from row
    const col0 = String(row[0] || '').trim()
    const col1 = String(row[1] || '').trim()
    const col2 = row[2]
    const col2Num = parseNumber(col2)

    if (!col0) continue

    // Count non-empty cells
    const nonEmptyCells = row.filter(cell => {
      const val = String(cell || '').trim()
      return val.length > 0
    }).length

    // Single cell row = category or subcategory
    if (nonEmptyCells === 1) {
      // Check if it looks like a main category (all uppercase or specific keywords)
      const isMainCategory = isLikelyCategory(col0)

      if (isMainCategory) {
        // Save previous category
        if (currentCategory && currentCategory.tasks.length > 0) {
          result.categories.push(currentCategory)
        }
        currentCategory = {
          name: col0,
          tasks: []
        }
        currentSubcategory = null
        pendingTaskName = null
      } else {
        // It's a subcategory (like "Planta Baja", "Piso 1")
        currentSubcategory = col0
      }
      continue
    }

    // Check if this is a sub-item header (name + empty + total)
    // Pattern: "Task name" | "" | 123.45
    if (nonEmptyCells === 2 && !col1 && col2Num !== null && col2Num > 0) {
      // This is a sub-item header - save the name for following rows
      pendingTaskName = col0
      continue
    }

    // 3 cells with unit and quantity = task
    const unit = col1.toLowerCase()
    const quantity = parseNumber(col2)

    // Validate it looks like a task (has valid unit and quantity)
    if (isValidUnit(unit) && quantity !== null && quantity >= 0) {
      if (!currentCategory) {
        currentCategory = { name: 'Sin categoria', tasks: [] }
      }

      // Determine task name
      let taskName: string

      // Check if this row is a detail row following a sub-item header
      // Detail rows have level names like "PLANTA BAJA", "PISO 1", etc.
      const isLevelName = isLevelIdentifier(col0)

      if (isLevelName && pendingTaskName) {
        // Use the pending task name with level as suffix
        taskName = `${pendingTaskName} (${col0})`
      } else if (currentSubcategory && !isLevelName) {
        // Regular task with subcategory context
        taskName = `${col0} (${currentSubcategory})`
        // Reset pending since we found a real task
        pendingTaskName = null
      } else {
        taskName = col0
        // Reset pending since we found a real task
        if (!isLevelName) {
          pendingTaskName = null
        }
      }

      currentCategory.tasks.push({
        name: taskName,
        unit: unit,
        quantity
      })
    } else if (col0.length > 0 && nonEmptyCells > 1) {
      // Row has multiple values but doesn't look like a task
      result.warnings.push(`Fila ${i + 1}: "${col0}" - formato no reconocido`)
    }
  }

  // Add last category
  if (currentCategory && currentCategory.tasks.length > 0) {
    result.categories.push(currentCategory)
  }

  return result
}

function isLevelIdentifier(text: string): boolean {
  const levelPatterns = [
    /^(planta\s*baja|pb|p\.?b\.?)$/i,
    /^piso\s*\d+$/i,
    /^p\s*\d+$/i,
    /^(subsuelo|ss|s\.?s\.?)$/i,
    /^terraza$/i,
    /^azotea$/i,
    /^cochera/i,
    /^sala\s*de\s*maquinas$/i,
    /^global$/i,
    /^(primer|segundo|tercer|cuarto|quinto|sexto)\s*(piso)?$/i
  ]
  return levelPatterns.some(pattern => pattern.test(text.trim()))
}

function isLikelyCategory(text: string): boolean {
  // Check if text is all uppercase (common for categories)
  const isAllCaps = text === text.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(text)

  // Check for common category keywords
  const categoryKeywords = [
    'trabajos', 'preliminares', 'movimientos', 'suelo', 'estructura',
    'mamposteria', 'albañileria', 'revoques', 'aislaciones', 'pisos',
    'revestimientos', 'cielorrasos', 'carpinteria', 'instalaciones',
    'pintura', 'varios', 'electricidad', 'sanitaria', 'gas', 'climatizacion',
    'cerramientos', 'fundaciones', 'cimentaciones', 'resistente', 'terminaciones'
  ]

  const lowerText = text.toLowerCase()
  const hasKeyword = categoryKeywords.some(kw => lowerText.includes(kw))

  return isAllCaps || hasKeyword
}

function isValidUnit(unit: string): boolean {
  const validUnits = [
    'm', 'm2', 'm3', 'ml', 'u', 'un', 'ud', 'und', 'unid', 'unidad',
    'kg', 'tn', 'lt', 'l', 'gl', 'glb', 'global', 'hs', 'h', 'hr',
    'pa', 'pza', 'pieza', 'jgo', 'juego', 'par', 'rollo', 'bolsa',
    'balde', 'lata', 'caja', 'paquete', 'sobre', 'día', 'dia', 'mes'
  ]
  return validUnits.includes(unit.toLowerCase())
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
