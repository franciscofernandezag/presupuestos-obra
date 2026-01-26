import { Skeleton } from '@/components/ui/skeleton'

export default function BudgetLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
