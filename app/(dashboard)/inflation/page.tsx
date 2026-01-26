import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInflationIndexes } from '@/lib/actions/versions'
import { InflationIndexList } from '@/components/version/InflationIndexList'

export default async function InflationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const indexes = await getInflationIndexes()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Indices de Inflacion</h1>
        <p className="text-gray-600">
          Gestiona los indices para actualizar presupuestos
        </p>
      </div>

      <InflationIndexList indexes={indexes} />
    </div>
  )
}
