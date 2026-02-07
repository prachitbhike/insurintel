import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyDetailLoading() {
  return (
    <div className="container px-4 py-5 md:px-6 border-t-2 border-muted space-y-4">
      {/* Header block */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="h-3 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-sm" />
          ))}
        </div>
        <Skeleton className="h-[52px] rounded-sm w-full" />
      </div>

      {/* Story cards */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Skeleton className="h-[240px] rounded-sm" />
        <Skeleton className="h-[240px] rounded-sm" />
      </div>

      {/* Efficiency Score */}
      <Skeleton className="h-[130px] rounded-sm" />

      {/* Signals */}
      <Skeleton className="h-[56px] rounded-sm" />
    </div>
  );
}
