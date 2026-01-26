'use client'

import { useState } from 'react'
import { BudgetVersion } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { formatDate, formatNumber } from '@/lib/utils/format'
import { MoreVertical, Check, Trash2 } from 'lucide-react'
import { setCurrentVersion, deleteVersion } from '@/lib/actions/versions'

interface VersionCardProps {
  version: BudgetVersion
  budgetId: string
  isCurrent: boolean
}

export function VersionCard({ version, budgetId, isCurrent }: VersionCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSetCurrent() {
    setLoading(true)
    try {
      await setCurrentVersion(version.id, budgetId)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteVersion(version.id, budgetId)
    } finally {
      setLoading(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <Card className={isCurrent ? 'border-blue-500 border-2' : ''}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-gray-300">
                v{version.version_number}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {version.name || `Version ${version.version_number}`}
                  </span>
                  {isCurrent && (
                    <Badge className="bg-blue-100 text-blue-800">Actual</Badge>
                  )}
                  {version.is_simulation && (
                    <Badge variant="outline">Simulacion</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(version.date)}
                  {version.inflation_index && (
                    <span className="ml-2">
                      | Ajuste: x{formatNumber(version.inflation_index, 4)}
                    </span>
                  )}
                  {version.inflation_index_name && (
                    <span className="ml-1">({version.inflation_index_name})</span>
                  )}
                </div>
                {version.notes && (
                  <p className="text-sm text-gray-600 mt-1">{version.notes}</p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={loading}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isCurrent && (
                  <DropdownMenuItem onClick={handleSetCurrent}>
                    <Check className="mr-2 h-4 w-4" />
                    Establecer como actual
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-red-600"
                  disabled={isCurrent}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar version</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente
              la version {version.version_number}.
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
