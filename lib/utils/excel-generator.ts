import ExcelJS from 'exceljs'
import type { BudgetWithCategories, BudgetVersion } from '@/lib/types'
import { formatDate } from './format'

export interface ExportOptions {
  includeIVA: boolean
  ivaPercentage: number
}

export async function generateBudgetExcel(
  budget: BudgetWithCategories,
  version: BudgetVersion | null,
  options: ExportOptions = { includeIVA: true, ivaPercentage: 10.5 }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistema de Presupuestos'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Presupuesto', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true
    }
  })

  // Column widths
  sheet.columns = [
    { key: 'item', width: 45 },
    { key: 'unit', width: 8 },
    { key: 'quantity', width: 12 },
    { key: 'unit_materials', width: 15 },
    { key: 'materials', width: 18 },
    { key: 'unit_labor', width: 15 },
    { key: 'labor', width: 18 },
    { key: 'total', width: 18 }
  ]

  // Styles
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  const categoryFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF5F5F5' }
  }

  const currencyFormat = '#,##0.00'

  // Document header
  sheet.mergeCells('A1:H1')
  const titleCell = sheet.getCell('A1')
  titleCell.value = `Presupuesto: ${budget.name}`
  titleCell.font = { bold: true, size: 16 }

  sheet.getCell('A2').value = `Obra: ${budget.project_name || '-'}`
  sheet.getCell('A3').value = `Ubicacion: ${budget.location || '-'}`
  sheet.getCell('A4').value = `Comitente: ${budget.client_name || '-'}`
  sheet.getCell('A5').value = `Fecha: ${version ? formatDate(version.date) : formatDate(new Date())}`
  sheet.getCell('A6').value = `Version: ${version?.name || version?.version_number || 1}`

  // Table header row
  const headerRowNum = 8
  const headerRow = sheet.getRow(headerRowNum)
  headerRow.values = [
    'Item',
    'Unid',
    'Cant',
    'Unit. Mat.',
    'Materiales',
    'Unit. M.O.',
    'Mano de Obra',
    'Totales'
  ]
  headerRow.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  })
  headerRow.height = 20

  let currentRow = headerRowNum + 1
  let grandTotalLabor = 0
  let grandTotalMaterials = 0

  // Iterate categories
  for (const category of budget.categories.sort((a, b) => a.order_index - b.order_index)) {
    let categoryLabor = 0
    let categoryMaterials = 0

    // Calculate category totals
    for (const task of category.tasks) {
      const price = task.task_price
      if (price) {
        categoryLabor += price.labor_total * task.quantity
        categoryMaterials += price.materials_total * task.quantity
      }
    }

    const categoryTotal = categoryLabor + categoryMaterials

    // Category row
    const catRow = sheet.getRow(currentRow)
    catRow.values = [
      category.name,
      '', '', '',
      categoryMaterials,
      '',
      categoryLabor,
      categoryTotal
    ]
    catRow.eachCell((cell, colNumber) => {
      cell.fill = categoryFill
      cell.font = { bold: true }
      if (colNumber >= 5) {
        cell.numFmt = currencyFormat
        cell.alignment = { horizontal: 'right' }
      }
    })
    currentRow++

    // Task rows
    for (const task of category.tasks.sort((a, b) => a.order_index - b.order_index)) {
      const price = task.task_price
      const materialsPerUnit = price ? price.materials_total : 0
      const laborPerUnit = price ? price.labor_total : 0
      const taskMaterials = materialsPerUnit * task.quantity
      const taskLabor = laborPerUnit * task.quantity
      const taskTotal = taskMaterials + taskLabor

      const taskRow = sheet.getRow(currentRow)
      taskRow.values = [
        `  ${task.name}`,
        task.unit || '',
        task.quantity,
        materialsPerUnit,
        taskMaterials,
        laborPerUnit,
        taskLabor,
        taskTotal
      ]

      // Format cells
      taskRow.getCell(3).numFmt = '#,##0.00'
      taskRow.getCell(3).alignment = { horizontal: 'right' }
      for (let col = 4; col <= 8; col++) {
        taskRow.getCell(col).numFmt = currencyFormat
        taskRow.getCell(col).alignment = { horizontal: 'right' }
      }

      currentRow++
    }

    grandTotalLabor += categoryLabor
    grandTotalMaterials += categoryMaterials
  }

  // Empty row
  currentRow++

  // Totals section
  const subtotal = grandTotalLabor + grandTotalMaterials

  // Subtotal row
  const subtotalRow = sheet.getRow(currentRow)
  sheet.mergeCells(`A${currentRow}:F${currentRow}`)
  subtotalRow.getCell(1).value = 'Subtotal:'
  subtotalRow.getCell(1).alignment = { horizontal: 'right' }
  subtotalRow.getCell(1).font = { bold: true }
  subtotalRow.getCell(7).value = grandTotalLabor
  subtotalRow.getCell(7).numFmt = currencyFormat
  subtotalRow.getCell(8).value = subtotal
  subtotalRow.getCell(8).numFmt = currencyFormat
  subtotalRow.getCell(8).font = { bold: true }
  currentRow++

  // IVA row
  if (options.includeIVA) {
    const iva = subtotal * (options.ivaPercentage / 100)
    const ivaRow = sheet.getRow(currentRow)
    sheet.mergeCells(`A${currentRow}:G${currentRow}`)
    ivaRow.getCell(1).value = `IVA ${options.ivaPercentage}%:`
    ivaRow.getCell(1).alignment = { horizontal: 'right' }
    ivaRow.getCell(8).value = iva
    ivaRow.getCell(8).numFmt = currencyFormat
    currentRow++

    // Total row
    const total = subtotal + iva
    const totalRow = sheet.getRow(currentRow)
    sheet.mergeCells(`A${currentRow}:G${currentRow}`)
    totalRow.getCell(1).value = 'TOTAL:'
    totalRow.getCell(1).alignment = { horizontal: 'right' }
    totalRow.getCell(1).font = { bold: true, size: 12 }
    totalRow.getCell(8).value = total
    totalRow.getCell(8).numFmt = currencyFormat
    totalRow.getCell(8).font = { bold: true, size: 12 }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
