import { Skeleton } from "@/components/ui/skeleton"

export default function InventoryLoading() {
  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Summary Stat Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>

      {/* Forecast Summary Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="rounded-xl border">
          <div className="p-4 border-b"><Skeleton className="h-6 w-full" /></div>
          <div className="p-4 border-b"><Skeleton className="h-6 w-full" /></div>
          <div className="p-4"><Skeleton className="h-6 w-full" /></div>
        </div>
      </div>
    </div>
  )
}
