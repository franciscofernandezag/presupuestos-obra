import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBudgets } from '@/lib/actions/budgets'
import { BudgetList } from '@/components/budget/BudgetList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const budgets = await getBudgets()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <p className="text-gray-600">
            Gestiona tus presupuestos de obra
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/budgets/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Presupuesto
          </Link>
        </Button>
      </div>

      <BudgetList budgets={budgets || []} />
    </div>
  )
}
