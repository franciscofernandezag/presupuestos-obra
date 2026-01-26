import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Crear Cuenta</h1>
        <p className="text-gray-600 mt-2">
          Registra tu empresa para comenzar
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-gray-600">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Iniciar sesion
        </Link>
      </p>
    </div>
  )
}
