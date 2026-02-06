import { Skeleton } from "@/components/ui/skeleton";

export default function FilingsLoading() {
  return (
    <div className="container px-4 py-8 md:px-6 space-y-8">
      <div>
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}
