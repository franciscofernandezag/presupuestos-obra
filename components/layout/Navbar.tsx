import { UserMenu } from './UserMenu'
import { createClient } from '@/lib/supabase/server'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('name, email, role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center md:hidden">
          <h1 className="text-lg font-semibold">Presupuestos</h1>
        </div>
        <div className="flex-1" />
        <UserMenu
          userName={profile?.name || user?.email || 'Usuario'}
          userEmail={user?.email || ''}
        />
      </div>
    </header>
  )
}
