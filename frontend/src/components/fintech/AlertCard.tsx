import type { SmartAlert } from "@/utils/finance";

const toneStyles: Record<
  SmartAlert["tone"],
  string
> = {
  danger:
    "border-danger/40 bg-danger/10 text-danger dark:border-danger/50 dark:bg-danger/15",
  warning:
    "border-warning/50 bg-warning/10 text-amber-900 dark:border-warning/40 dark:bg-warning/15 dark:text-amber-100",
  success:
    "border-accent/40 bg-accent/10 text-emerald-900 dark:border-accent/35 dark:bg-accent/15 dark:text-emerald-100",
  neutral:
    "border-primary/15 bg-primary/5 text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
};

export function AlertCard({ alert }: { alert: SmartAlert }) {
  return (
    <article
      className={`rounded-2xl border px-4 py-3 shadow-card transition hover:shadow-md ${toneStyles[alert.tone]}`}
      role="status"
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-90">
        {alert.title}
      </p>
      <p className="mt-1 text-sm font-medium leading-snug">{alert.message}</p>
    </article>
  );
}

export function AlertList({ alerts }: { alerts: SmartAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {alerts.map((a) => (
        <AlertCard key={a.id} alert={a} />
      ))}
    </div>
  );
}
