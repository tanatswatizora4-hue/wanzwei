import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="h-7 w-48 max-w-full" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}
