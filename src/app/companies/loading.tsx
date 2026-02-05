import { Skeleton } from "@/components/ui/skeleton";

export default function CompaniesLoading() {
  return (
    <div className="container px-4 py-8 md:px-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-2 h-5 w-72" />
      <div className="mt-6 space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-[600px] rounded-md" />
      </div>
    </div>
  );
}
