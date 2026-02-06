import { Skeleton } from "@/components/ui/skeleton";

export default function ValueChainLoading() {
  return (
    <div className="container px-4 py-8 md:px-6 space-y-8">
      <div>
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      <Skeleton className="h-[400px] w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
