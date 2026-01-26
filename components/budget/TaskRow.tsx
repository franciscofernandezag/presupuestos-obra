'use client'

import { useState } from 'react'
import { TaskWithPrice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { Edit2 } from 'lucide-react'
import { TaskCostAnalysisModal } from './TaskCostAnalysisModal'

interface TaskRowProps {
  task: TaskWithPrice
  versionId: string
}

export function TaskRow({ task, versionId }: TaskRowProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const price = task.task_price
  const materialsTotal = (price?.materials_total || 0) * task.quantity
  const laborTotal = (price?.labor_total || 0) * task.quantity
  const total = (price?.total || 0) * task.quantity

  const hasPrice = price && price.total > 0

  return (
    <>
      <div className="grid grid-cols-12 gap-2 px-4 py-3 border-t items-center hover:bg-gray-50">
        <div className="col-span-5">
          <span className={hasPrice ? '' : 'text-orange-600'}>
            {task.name}
          </span>
          {!hasPrice && (
            <span className="ml-2 text-xs text-orange-500">(sin precio)</span>
          )}
        </div>
        <div className="col-span-1 text-center text-sm text-gray-500">
          {task.unit}
        </div>
        <div className="col-span-1 text-right text-sm">
          {formatNumber(task.quantity, 2)}
        </div>
        <div className="col-span-1 text-right text-sm">
          {formatCurrency(materialsTotal)}
        </div>
        <div className="col-span-1 text-right text-sm">
          {formatCurrency(laborTotal)}
        </div>
        <div className="col-span-2 text-right font-medium">
          {formatCurrency(total)}
        </div>
        <div className="col-span-1 text-right">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setModalOpen(true)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TaskCostAnalysisModal
        task={task}
        versionId={versionId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
