import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BudgetForm } from '@/components/budget/BudgetForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewBudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Presupuesto</CardTitle>
          <CardDescription>
            Crea un nuevo presupuesto de obra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm />
        </CardContent>
      </Card>
    </div>
  )
}
