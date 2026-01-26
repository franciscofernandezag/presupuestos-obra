import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBudget } from '@/lib/actions/budgets'
import { BudgetEditor } from '@/components/budget/BudgetEditor'

interface BudgetPageProps {
  params: Promise<{ id: string }>
}

export default async function BudgetPage({ params }: BudgetPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const budget = await getBudget(id)

  if (!budget) {
    notFound()
  }

  return <BudgetEditor budget={budget} />
}
