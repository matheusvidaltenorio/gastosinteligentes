import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/15 bg-white/60 px-6 py-14 text-center dark:border-white/15 dark:bg-white/5">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-2xl dark:bg-white/10">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-primary dark:text-white">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-primary/60 dark:text-slate-400">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="accent" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
