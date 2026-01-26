'use client'

import { useState } from 'react'
import { BudgetVersion } from '@/lib/types'
import { VersionCard } from './VersionCard'
import { InflationAdjustModal } from './InflationAdjustModal'
import { Button } from '@/components/ui/button'
import { TrendingUp, Plus } from 'lucide-react'

interface VersionHistoryProps {
  budgetId: string
  versions: BudgetVersion[]
  currentVersionId?: string
}

export function VersionHistory({
  budgetId,
  versions,
  currentVersionId
}: VersionHistoryProps) {
  const [inflationOpen, setInflationOpen] = useState(false)

  const currentVersion = versions.find(v => v.id === currentVersionId) || versions[0]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setInflationOpen(true)}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Ajustar por Inflacion
        </Button>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white">
          <p className="text-gray-500">No hay versiones registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <VersionCard
              key={version.id}
              version={version}
              budgetId={budgetId}
              isCurrent={version.id === currentVersionId}
            />
          ))}
        </div>
      )}

      {currentVersion && (
        <InflationAdjustModal
          version={currentVersion}
          budgetId={budgetId}
          open={inflationOpen}
          onOpenChange={setInflationOpen}
        />
      )}
    </div>
  )
}
