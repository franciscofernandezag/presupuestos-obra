import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileX } from 'lucide-react'

export default function BudgetNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <FileX className="h-16 w-16 text-gray-400" />
      <h2 className="text-xl font-semibold">Presupuesto no encontrado</h2>
      <p className="text-gray-600">
        El presupuesto que buscas no existe o no tienes acceso a el.
      </p>
      <Button asChild>
        <Link href="/budgets">
          Volver a presupuestos
        </Link>
      </Button>
    </div>
  )
}
