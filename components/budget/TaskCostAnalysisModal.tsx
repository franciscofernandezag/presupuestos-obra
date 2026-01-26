'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TaskWithPrice, TaskMaterial } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2 } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'

interface TaskCostAnalysisModalProps {
  task: TaskWithPrice
  versionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MaterialRow {
  id?: string
  name: string
  unit: string
  quantity: number
  unit_price: number
}

export function TaskCostAnalysisModal({
  task,
  versionId,
  open,
  onOpenChange
}: TaskCostAnalysisModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [laborUnitPrice, setLaborUnitPrice] = useState(0)
  const [laborQuantity, setLaborQuantity] = useState(0)
  const [materials, setMaterials] = useState<MaterialRow[]>([])

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, task.id, versionId])

  async function loadData() {
    const supabase = createClient()

    // Get or create task_price
    let taskPriceId = task.task_price?.id

    if (!taskPriceId) {
      // Create task_price if doesn't exist
      const { data: newPrice, error } = await supabase
        .from('task_prices')
        .insert({
          task_id: task.id,
          version_id: versionId,
          labor_unit_price: 0,
          labor_quantity: 0,
          materials_total: 0
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating task_price:', error)
        return
      }
      taskPriceId = newPrice.id
    }

    // Load task_price data
    const { data: price } = await supabase
      .from('task_prices')
      .select('*')
      .eq('id', taskPriceId)
      .single()

    if (price) {
      setLaborUnitPrice(price.labor_unit_price || 0)
      setLaborQuantity(price.labor_quantity || 0)
    }

    // Load materials
    const { data: mats } = await supabase
      .from('task_materials')
      .select('*')
      .eq('task_price_id', taskPriceId)
      .order('order_index')

    if (mats) {
      setMaterials(mats.map(m => ({
        id: m.id,
        name: m.name,
        unit: m.unit || '',
        quantity: m.quantity || 0,
        unit_price: m.unit_price || 0
      })))
    }
  }

  const laborTotal = laborUnitPrice * laborQuantity
  const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unit_price), 0)
  const costPerUnit = laborTotal + materialsTotal
  const totalForQuantity = costPerUnit * task.quantity

  function handleAddMaterial() {
    setMaterials([...materials, {
      name: '',
      unit: 'u',
      quantity: 1,
      unit_price: 0
    }])
  }

  function handleUpdateMaterial(index: number, field: keyof MaterialRow, value: string | number) {
    setMaterials(materials.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    ))
  }

  function handleRemoveMaterial(index: number) {
    setMaterials(materials.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get task_price id
      let taskPriceId = task.task_price?.id

      if (!taskPriceId) {
        const { data } = await supabase
          .from('task_prices')
          .select('id')
          .eq('task_id', task.id)
          .eq('version_id', versionId)
          .single()
        taskPriceId = data?.id
      }

      if (!taskPriceId) {
        throw new Error('No se encontro el precio de la tarea')
      }

      // Update task_price
      await supabase
        .from('task_prices')
        .update({
          labor_unit_price: laborUnitPrice,
          labor_quantity: laborQuantity,
          materials_total: materialsTotal
        })
        .eq('id', taskPriceId)

      // Delete existing materials
      await supabase
        .from('task_materials')
        .delete()
        .eq('task_price_id', taskPriceId)

      // Insert new materials
      if (materials.length > 0) {
        const materialsToInsert = materials
          .filter(m => m.name.trim())
          .map((m, index) => ({
            task_price_id: taskPriceId,
            name: m.name,
            unit: m.unit,
            quantity: m.quantity,
            unit_price: m.unit_price,
            order_index: index
          }))

        if (materialsToInsert.length > 0) {
          await supabase
            .from('task_materials')
            .insert(materialsToInsert)
        }
      }

      router.refresh()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analisis de Costo</DialogTitle>
          <DialogDescription>
            {task.name} | Unidad: {task.unit} | Cantidad: {formatNumber(task.quantity)}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Mano de Obra */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Mano de Obra</h3>
              <span className="text-sm text-gray-500">
                Total: {formatCurrency(laborTotal)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cantidad (HS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={laborQuantity}
                  onChange={(e) => setLaborQuantity(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Precio Unitario</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={laborUnitPrice}
                  onChange={(e) => setLaborUnitPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Subtotal</Label>
                <div className="h-10 flex items-center font-medium">
                  {formatCurrency(laborTotal)}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Materiales */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Materiales</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Total: {formatCurrency(materialsTotal)}
                </span>
                <Button variant="outline" size="sm" onClick={handleAddMaterial}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>

            {materials.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay materiales cargados
              </p>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500">
                  <div className="col-span-4">Material</div>
                  <div className="col-span-2">Unidad</div>
                  <div className="col-span-2">Cantidad</div>
                  <div className="col-span-2">P. Unit.</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Rows */}
                {materials.map((material, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Input
                        value={material.name}
                        onChange={(e) => handleUpdateMaterial(index, 'name', e.target.value)}
                        placeholder="Nombre del material"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={material.unit}
                        onChange={(e) => handleUpdateMaterial(index, 'unit', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={material.quantity}
                        onChange={(e) => handleUpdateMaterial(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={material.unit_price}
                        onChange={(e) => handleUpdateMaterial(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-1 text-sm font-medium">
                      {formatCurrency(material.quantity * material.unit_price)}
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveMaterial(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Resumen */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Costo por {task.unit}:</span>
              <span className="font-medium">{formatCurrency(costPerUnit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Cantidad total:</span>
              <span>{formatNumber(task.quantity)} {task.unit}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total para esta tarea:</span>
              <span className="text-lg">{formatCurrency(totalForQuantity)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
