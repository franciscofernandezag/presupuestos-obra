import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Package } from 'lucide-react'

export default async function MaterialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get materials
  const { data: materials } = await supabase
    .from('material_catalog')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalogo de Materiales</h1>
          <p className="text-gray-600">
            Materiales reutilizables en tus presupuestos
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Material
        </Button>
      </div>

      {!materials || materials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">Sin materiales</h3>
            <p className="mt-2 text-sm text-gray-500">
              Los materiales que cargues en los presupuestos apareceran aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) => (
            <Card key={material.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{material.name}</CardTitle>
                <CardDescription>
                  {material.category || 'Sin categoria'} | {material.unit || 'u'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {material.description && (
                  <p className="text-sm text-gray-600">{material.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
