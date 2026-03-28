import type { FinancialGoal } from "@/types/api";
import { formatBRL } from "@/utils/format";

type Props = {
  goal: FinancialGoal;
  className?: string;
};

export function GoalProgress({ goal, className = "" }: Props) {
  const target = parseFloat(goal.targetAmount) || 0;
  const current = parseFloat(goal.currentAmount) || 0;
  const pct =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const remaining = Math.max(0, Math.round((target - current) * 100) / 100);
  const complete = target > 0 && current >= target;

  return (
    <div
      className={`rounded-2xl border border-primary/10 bg-white p-4 shadow-card dark:border-white/10 dark:bg-slate-900 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-primary dark:text-white">{goal.title}</p>
          <p className="mt-1 text-sm text-primary/60 dark:text-slate-400">
            {formatBRL(current)} de {formatBRL(target)}
          </p>
        </div>
        <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">
          {pct}%
        </span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-primary/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-primary/50 dark:text-slate-400">
        {complete
          ? "Meta atingida — parabéns!"
          : `Faltam ${formatBRL(remaining)} para a meta`}
      </p>
    </div>
  );
}
