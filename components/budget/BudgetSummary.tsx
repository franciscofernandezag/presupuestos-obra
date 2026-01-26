'use client'

import { BudgetWithCategories } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils/format'

interface BudgetSummaryProps {
  budget: BudgetWithCategories
  ivaPercentage?: number
}

export function BudgetSummary({ budget, ivaPercentage = 10.5 }: BudgetSummaryProps) {
  // Calculate totals
  const totals = budget.categories.reduce(
    (acc, category) => {
      category.tasks.forEach(task => {
        const price = task.task_price
        if (price) {
          acc.labor += price.labor_total * task.quantity
          acc.materials += price.materials_total * task.quantity
        }
      })
      return acc
    },
    { labor: 0, materials: 0 }
  )

  const subtotal = totals.labor + totals.materials
  const iva = subtotal * (ivaPercentage / 100)
  const total = subtotal + iva

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del Presupuesto</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Category breakdown */}
          {budget.categories.map(category => {
            const catTotal = category.tasks.reduce((sum, task) => {
              const price = task.task_price
              return sum + (price ? price.total * task.quantity : 0)
            }, 0)
            return (
              <div key={category.id} className="flex justify-between text-sm">
                <span>{category.name}</span>
                <span>{formatCurrency(catTotal)}</span>
              </div>
            )
          })}

          <Separator />

          {/* Totals */}
          <div className="flex justify-between">
            <span>Total Materiales:</span>
            <span className="font-medium">{formatCurrency(totals.materials)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Mano de Obra:</span>
            <span className="font-medium">{formatCurrency(totals.labor)}</span>
          </div>

          <Separator />

          <div className="flex justify-between font-medium">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>IVA ({ivaPercentage}%):</span>
            <span>{formatCurrency(iva)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
