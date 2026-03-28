type Props = {
  className?: string;
  rounded?: "lg" | "xl" | "full";
};

const round = { lg: "rounded-lg", xl: "rounded-xl", full: "rounded-full" };

export function Skeleton({ className = "", rounded = "xl" }: Props) {
  return (
    <div
      className={`animate-pulse bg-primary/10 dark:bg-white/10 ${round[rounded]} ${className}`}
      aria-hidden
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fadeIn">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
