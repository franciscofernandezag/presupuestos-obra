import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user and tenant info
  const { data: profile } = await supabase
    .from('users')
    .select('*, tenants(*)')
    .eq('id', user.id)
    .single()

  const tenant = profile?.tenants as { name: string; settings: { iva_percentage: number } } | null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <p className="text-gray-600">
          Ajusta la configuracion de tu cuenta y empresa
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Tu informacion personal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input value={profile?.name || ''} disabled />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={profile?.email || ''} disabled />
          </div>
          <div>
            <Label>Rol</Label>
            <Input value={profile?.role || ''} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Company */}
      <Card>
        <CardHeader>
          <CardTitle>Empresa</CardTitle>
          <CardDescription>Configuracion de tu organizacion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre de la empresa</Label>
            <Input value={tenant?.name || ''} disabled />
          </div>
          <div>
            <Label>IVA (%)</Label>
            <Input
              type="number"
              value={tenant?.settings?.iva_percentage || 10.5}
              disabled
            />
          </div>
          <p className="text-sm text-gray-500">
            Para modificar la configuracion de la empresa, contacta al administrador.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
