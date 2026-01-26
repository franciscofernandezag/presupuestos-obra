'use client'

import { useState } from 'react'
import { BudgetWithCategories } from '@/lib/types'
import { CategorySection } from './CategorySection'
import { BudgetSummary } from './BudgetSummary'
import { ImportComputeDialog } from './ImportComputeDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, History, Download, Settings } from 'lucide-react'
import Link from 'next/link'

interface BudgetEditorProps {
  budget: BudgetWithCategories
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

export function BudgetEditor({ budget }: BudgetEditorProps) {
  const [importOpen, setImportOpen] = useState(false)

  const version = budget.current_version

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{budget.name}</h1>
            <Badge className={statusColors[budget.status]}>
              {statusLabels[budget.status]}
            </Badge>
          </div>
          <div className="text-gray-600 mt-1">
            {budget.project_name && <span>{budget.project_name}</span>}
            {budget.client_name && (
              <span className="ml-2">| {budget.client_name}</span>
            )}
            {version && (
              <span className="ml-2">| Version {version.version_number}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Computo
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/budgets/${budget.id}/versions`}>
              <History className="h-4 w-4 mr-2" />
              Versiones
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/api/export/${budget.id}`}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      {budget.categories.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Sin items cargados
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Importa un archivo Excel de computo para comenzar.
          </p>
          <div className="mt-6">
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Computo desde Excel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Categories and tasks */}
          <div className="space-y-4">
            {budget.categories
              .sort((a, b) => a.order_index - b.order_index)
              .map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  versionId={version?.id || ''}
                />
              ))}
          </div>

          {/* Summary */}
          <BudgetSummary budget={budget} />
        </>
      )}

      {/* Import dialog */}
      <ImportComputeDialog
        budgetId={budget.id}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  )
}
