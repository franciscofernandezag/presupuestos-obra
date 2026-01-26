import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBudget, getVersions } from '@/lib/actions/budgets'
import { VersionHistory } from '@/components/version/VersionHistory'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface VersionsPageProps {
  params: Promise<{ id: string }>
}

export default async function VersionsPage({ params }: VersionsPageProps) {
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

  const versions = await getVersions(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/budgets/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Historial de Versiones</h1>
          <p className="text-gray-600">{budget.name}</p>
        </div>
      </div>

      <VersionHistory
        budgetId={id}
        versions={versions}
        currentVersionId={budget.current_version?.id}
      />
    </div>
  )
}
