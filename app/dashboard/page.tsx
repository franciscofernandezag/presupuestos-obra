import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Plus, TrendingUp, Package } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name, tenant_id')
    .eq('id', user.id)
    .single()

  // Get budget counts
  const { count: budgetCount } = await supabase
    .from('budgets')
    .select('*', { count: 'exact', head: true })

  const { count: activeBudgetCount } = await supabase
    .from('budgets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-600">
            Bienvenido, {profile?.name || user.email}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/budgets/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Presupuesto
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Presupuestos
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetCount || 0}</div>
            <p className="text-xs text-gray-500">
              presupuestos creados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Presupuestos Activos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBudgetCount || 0}</div>
            <p className="text-xs text-gray-500">
              en proceso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Materiales
            </CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">
              en catalogo
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones Rapidas</CardTitle>
          <CardDescription>
            Accede rapidamente a las funciones principales
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/dashboard/budgets/new">
              <Plus className="mr-2 h-4 w-4" />
              Crear nuevo presupuesto
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/dashboard/materials">
              <Package className="mr-2 h-4 w-4" />
              Gestionar materiales
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/dashboard/inflation">
              <TrendingUp className="mr-2 h-4 w-4" />
              Indices de inflacion
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/dashboard/budgets">
              <FileText className="mr-2 h-4 w-4" />
              Ver todos los presupuestos
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
