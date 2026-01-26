'use client'

import { Budget } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/utils/format'
import { MoreVertical, Edit, Trash2, Archive, FileText, History } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { deleteBudget, updateBudgetStatus } from '@/lib/actions/budgets'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface BudgetCardProps {
  budget: Budget & {
    budget_versions?: {
      id: string
      version_number: number
      name: string | null
      date: string
      is_current: boolean
    }[]
  }
}

const statusLabels = {
  draft: 'Borrador',
  active: 'Activo',
  archived: 'Archivado'
}

const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800'
}

export function BudgetCard({ budget }: BudgetCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const currentVersion = budget.budget_versions?.find(v => v.is_current)
  const versionCount = budget.budget_versions?.length || 0

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteBudget(budget.id)
    } catch (error) {
      console.error('Error deleting budget:', error)
    } finally {
      setLoading(false)
      setDeleteOpen(false)
    }
  }

  async function handleArchive() {
    try {
      await updateBudgetStatus(budget.id, 'archived')
    } catch (error) {
      console.error('Error archiving budget:', error)
    }
  }

  async function handleActivate() {
    try {
      await updateBudgetStatus(budget.id, 'active')
    } catch (error) {
      console.error('Error activating budget:', error)
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                <Link
                  href={`/budgets/${budget.id}`}
                  className="hover:underline"
                >
                  {budget.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {budget.project_name || 'Sin nombre de obra'}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/budgets/${budget.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/budgets/${budget.id}/versions`}>
                    <History className="mr-2 h-4 w-4" />
                    Versiones
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {budget.status !== 'active' && (
                  <DropdownMenuItem onClick={handleActivate}>
                    <FileText className="mr-2 h-4 w-4" />
                    Activar
                  </DropdownMenuItem>
                )}
                {budget.status !== 'archived' && (
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archivar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={statusColors[budget.status]}>
                {statusLabels[budget.status]}
              </Badge>
              {versionCount > 0 && (
                <Badge variant="outline">
                  {versionCount} version{versionCount !== 1 ? 'es' : ''}
                </Badge>
              )}
            </div>

            {budget.client_name && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Cliente:</span> {budget.client_name}
              </p>
            )}

            {budget.location && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Ubicacion:</span> {budget.location}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
              <span>Actualizado: {formatDate(budget.updated_at)}</span>
              {currentVersion && (
                <span>v{currentVersion.version_number}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar presupuesto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el
              presupuesto &quot;{budget.name}&quot; y todas sus versiones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
