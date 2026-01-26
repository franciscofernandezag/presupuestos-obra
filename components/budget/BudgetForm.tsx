'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBudget } from '@/lib/actions/budgets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function BudgetForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    project_name: '',
    location: '',
    client_name: '',
    notes: ''
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const budget = await createBudget(formData)
      router.push(`/budgets/${budget.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear presupuesto')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Presupuesto *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Ej: Presupuesto Casa Martinez"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project_name">Nombre de la Obra</Label>
        <Input
          id="project_name"
          name="project_name"
          value={formData.project_name}
          onChange={handleChange}
          placeholder="Ej: Vivienda unifamiliar 2 plantas"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_name">Cliente (Comitente)</Label>
        <Input
          id="client_name"
          name="client_name"
          value={formData.client_name}
          onChange={handleChange}
          placeholder="Ej: Juan Martinez"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Ubicacion</Label>
        <Input
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Ej: Calle Principal 123, Ciudad"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Notas adicionales sobre el presupuesto..."
          rows={3}
        />
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Presupuesto'}
        </Button>
      </div>
    </form>
  )
}
