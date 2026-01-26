'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface LogoutButtonProps {
  variant?: 'default' | 'ghost' | 'outline'
  showIcon?: boolean
  showText?: boolean
}

export function LogoutButton({
  variant = 'ghost',
  showIcon = true,
  showText = true
}: LogoutButtonProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button variant={variant} onClick={handleLogout}>
      {showIcon && <LogOut className="h-4 w-4" />}
      {showText && <span className={showIcon ? 'ml-2' : ''}>Cerrar Sesion</span>}
    </Button>
  )
}
