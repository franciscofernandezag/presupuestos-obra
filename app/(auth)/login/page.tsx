import { LoginForm } from '@/components/auth/LoginForm'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Iniciar Sesion</h1>
        <p className="text-gray-600 mt-2">
          Ingresa tus credenciales para acceder
        </p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-gray-600">
        No tienes cuenta?{' '}
        <Link href="/register" className="text-blue-600 hover:underline">
          Registrate
        </Link>
      </p>
    </div>
  )
}
