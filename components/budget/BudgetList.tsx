'use client'

import { Budget } from '@/lib/types'
import { BudgetCard } from './BudgetCard'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'

interface BudgetListProps {
  budgets: (Budget & { budget_versions?: { id: string; version_number: number; name: string | null; date: string; is_current: boolean }[] })[]
}

export function BudgetList({ budgets }: BudgetListProps) {
  if (budgets.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-white">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No hay presupuestos
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Comienza creando tu primer presupuesto de obra.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/budgets/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Presupuesto
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {budgets.map((budget) => (
        <BudgetCard key={budget.id} budget={budget} />
      ))}
    </div>
  )
}
