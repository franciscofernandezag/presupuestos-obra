'use client'

import { useState } from 'react'
import { CategoryWithTasks } from '@/lib/types'
import { TaskRow } from './TaskRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface CategorySectionProps {
  category: CategoryWithTasks
  versionId: string
  budgetId: string
}

export function CategorySection({ category, versionId, budgetId }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true)

  // Calculate totals
  const totals = category.tasks.reduce(
    (acc, task) => {
      const price = task.task_price
      if (price) {
        acc.labor += price.labor_total * task.quantity
        acc.materials += price.materials_total * task.quantity
        acc.total += price.total * task.quantity
      }
      return acc
    },
    { labor: 0, materials: 0, total: 0 }
  )

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <span className="text-sm text-gray-500">
              ({category.tasks.length} items)
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <span className="text-gray-500">Materiales:</span>{' '}
              <span className="font-medium">{formatCurrency(totals.materials)}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500">M.O.:</span>{' '}
              <span className="font-medium">{formatCurrency(totals.labor)}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Total:</span>{' '}
              <span className="font-semibold">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">
              <div className="col-span-5">Item</div>
              <div className="col-span-1 text-center">Unid</div>
              <div className="col-span-1 text-right">Cant</div>
              <div className="col-span-1 text-right">Mat.</div>
              <div className="col-span-1 text-right">M.O.</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1"></div>
            </div>

            {/* Rows */}
            {category.tasks
              .sort((a, b) => a.order_index - b.order_index)
              .map((task) => (
                <TaskRow key={task.id} task={task} versionId={versionId} budgetId={budgetId} />
              ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
