import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileText, TrendingUp, Upload, Download } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Presupuestos de Obra</h1>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Iniciar Sesion</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Registrarse</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Gestiona tus presupuestos de obra de manera agil
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Importa computos desde Excel, asigna precios, versiona con inflacion y exporta presupuestos profesionales.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Comenzar Gratis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Ya tengo cuenta</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Importar Computo</h3>
            <p className="text-gray-600 text-sm">
              Importa computos desde Excel con rubros y tareas automaticamente.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Analisis de Costos</h3>
            <p className="text-gray-600 text-sm">
              Carga mano de obra y materiales para cada tarea del presupuesto.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold mb-2">Ajuste por Inflacion</h3>
            <p className="text-gray-600 text-sm">
              Actualiza precios con indices de inflacion y guarda versiones.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Download className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Exportar a Excel</h3>
            <p className="text-gray-600 text-sm">
              Genera presupuestos profesionales en Excel con IVA y totales.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          Sistema de Gestion de Presupuestos de Obra
        </div>
      </footer>
    </div>
  )
}
