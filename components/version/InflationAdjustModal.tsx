'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BudgetVersion, InflationIndex } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatNumber, formatPercentage } from '@/lib/utils/format'
import { applyInflation, getInflationIndexes } from '@/lib/actions/versions'

interface InflationAdjustModalProps {
  version: BudgetVersion
  budgetId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InflationAdjustModal({
  version,
  budgetId,
  open,
  onOpenChange
}: InflationAdjustModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'manual' | 'index'>('manual')
  const [percentage, setPercentage] = useState(10)
  const [selectedIndexId, setSelectedIndexId] = useState<string>('')
  const [isSimulation, setIsSimulation] = useState(false)
  const [versionName, setVersionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [indexes, setIndexes] = useState<InflationIndex[]>([])

  useEffect(() => {
    if (open) {
      loadIndexes()
    }
  }, [open])

  async function loadIndexes() {
    try {
      const data = await getInflationIndexes()
      setIndexes(data)
    } catch (err) {
      console.error('Error loading indexes:', err)
    }
  }

  const factor = mode === 'manual'
    ? 1 + (percentage / 100)
    : calculateFactorFromIndex()

  function calculateFactorFromIndex(): number {
    if (!selectedIndexId) return 1
    const index = indexes.find(i => i.id === selectedIndexId)
    if (!index) return 1
    return index.value
  }

  async function handleApply() {
    setLoading(true)
    setError(null)

    try {
      const indexName = mode === 'index'
        ? indexes.find(i => i.id === selectedIndexId)?.name
        : `Ajuste manual ${formatPercentage(percentage)}`

      await applyInflation(version.id, budgetId, {
        factor,
        indexName: indexName || 'Ajuste',
        versionName: versionName || `Version ${version.version_number + 1}`,
        isSimulation
      })

      router.refresh()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar ajuste')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajuste por Inflacion</DialogTitle>
          <DialogDescription>
            Crear nueva version con precios ajustados desde v{version.version_number}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Mode selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              onClick={() => setMode('manual')}
              className="flex-1"
            >
              Porcentaje Manual
            </Button>
            <Button
              variant={mode === 'index' ? 'default' : 'outline'}
              onClick={() => setMode('index')}
              className="flex-1"
            >
              Usar Indice
            </Button>
          </div>

          {/* Mode-specific inputs */}
          {mode === 'manual' ? (
            <div>
              <Label>Porcentaje de ajuste (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={percentage}
                onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
                placeholder="10"
              />
              <p className="text-sm text-gray-500 mt-1">
                Factor: x{formatNumber(factor, 4)}
              </p>
            </div>
          ) : (
            <div>
              <Label>Seleccionar indice</Label>
              <Select value={selectedIndexId} onValueChange={setSelectedIndexId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar indice..." />
                </SelectTrigger>
                <SelectContent>
                  {indexes.map((index) => (
                    <SelectItem key={index.id} value={index.id}>
                      {index.name} - Factor: x{formatNumber(index.value, 4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {indexes.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No hay indices cargados. Ve a Inflacion para crear uno.
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Version name */}
          <div>
            <Label>Nombre de la nueva version (opcional)</Label>
            <Input
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder={`Version ${version.version_number + 1}`}
            />
          </div>

          {/* Simulation checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="simulation"
              checked={isSimulation}
              onCheckedChange={(checked) => setIsSimulation(checked as boolean)}
            />
            <Label htmlFor="simulation" className="cursor-pointer">
              Marcar como simulacion (no afecta la version actual)
            </Label>
          </div>

          <Separator />

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Resumen del ajuste:</h4>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-500">Factor de ajuste:</span>{' '}
                <span className="font-medium">x{formatNumber(factor, 4)}</span>
              </p>
              <p>
                <span className="text-gray-500">Equivale a:</span>{' '}
                <span className="font-medium">+{formatPercentage((factor - 1) * 100)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={loading || (mode === 'index' && !selectedIndexId)}>
            {loading ? 'Aplicando...' : 'Aplicar Ajuste'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
