'use client'

import { useState } from 'react'
import { InflationIndex } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils/format'
import { createInflationIndex, deleteInflationIndex } from '@/lib/actions/versions'

interface InflationIndexListProps {
  indexes: InflationIndex[]
}

export function InflationIndexList({ indexes }: InflationIndexListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    value: 1,
    base_date: new Date().toISOString().split('T')[0],
    source: '',
    notes: ''
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.name === 'value' ? parseFloat(e.target.value) || 0 : e.target.value
    }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await createInflationIndex(formData)
      setCreateOpen(false)
      setFormData({
        name: '',
        date: new Date().toISOString().split('T')[0],
        value: 1,
        base_date: new Date().toISOString().split('T')[0],
        source: '',
        notes: ''
      })
    } catch (err) {
      console.error('Error creating index:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setLoading(true)
    try {
      await deleteInflationIndex(deleteId)
    } catch (err) {
      console.error('Error deleting index:', err)
    } finally {
      setLoading(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Indice
        </Button>
      </div>

      {indexes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">No hay indices</h3>
            <p className="mt-2 text-sm text-gray-500">
              Crea un indice de inflacion para poder ajustar tus presupuestos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {indexes.map((index) => (
            <Card key={index.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {index.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => setDeleteId(index.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Factor:</span>
                    <span className="font-medium">x{formatNumber(index.value, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fecha:</span>
                    <span>{formatDate(index.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Base:</span>
                    <span>{formatDate(index.base_date)}</span>
                  </div>
                  {index.source && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fuente:</span>
                      <span>{index.source}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Indice de Inflacion</DialogTitle>
            <DialogDescription>
              Crea un indice para ajustar presupuestos
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: CAC Enero 2024"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Fecha del indice *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="base_date">Fecha base *</Label>
                <Input
                  id="base_date"
                  name="base_date"
                  type="date"
                  value={formData.base_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="value">Factor de ajuste *</Label>
              <Input
                id="value"
                name="value"
                type="number"
                step="0.0001"
                value={formData.value}
                onChange={handleChange}
                placeholder="1.15"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Ej: 1.15 = aumento del 15%
              </p>
            </div>

            <div>
              <Label htmlFor="source">Fuente</Label>
              <Input
                id="source"
                name="source"
                value={formData.source}
                onChange={handleChange}
                placeholder="Ej: INDEC, CAC"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar indice</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer.
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
    </div>
  )
}
