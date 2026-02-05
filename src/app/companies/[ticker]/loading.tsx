import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyDetailLoading() {
  return (
    <div className="container space-y-6 px-4 py-8 md:px-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-64" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-[400px] rounded-lg" />
      <Skeleton className="h-[300px] rounded-lg" />
    </div>
  );
}
