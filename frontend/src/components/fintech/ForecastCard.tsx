import { Card } from "@/components/ui/Card";
import type { ForecastResult } from "@/utils/finance";
import { formatBRL } from "@/utils/format";

type Props = {
  forecast: ForecastResult;
};

export function ForecastCard({ forecast }: Props) {
  const { currentSaldo, avgDailyExpense, daysToZero, message } = forecast;

  return (
    <Card
      className="border-t-4 border-t-secondary dark:border-t-slate-500"
      title="Previsão financeira"
      subtitle="Com base no seu histórico recente"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-surface p-4 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/50 dark:text-slate-400">
            Saldo atual
          </p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums ${
              currentSaldo >= 0 ? "text-accent" : "text-danger"
            }`}
          >
            {formatBRL(currentSaldo)}
          </p>
        </div>
        <div className="rounded-xl bg-surface p-4 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/50 dark:text-slate-400">
            Média gasto / dia
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-danger">
            {formatBRL(avgDailyExpense)}
          </p>
          <p className="mt-1 text-xs text-primary/50 dark:text-slate-400">
            Últimos 30 dias
          </p>
        </div>
        <div className="rounded-xl bg-surface p-4 dark:bg-white/5 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/50 dark:text-slate-400">
            Projeção
          </p>
          {daysToZero != null && currentSaldo > 0 && avgDailyExpense > 0 ? (
            <p className="mt-1 text-sm font-semibold leading-relaxed text-primary dark:text-white/90">
              Neste ritmo, seu saldo pode zerar em aproximadamente{" "}
              <span className="text-danger">{daysToZero}</span> dia(s).
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-4 text-sm text-primary/60 dark:text-slate-400">{message}</p>
    </Card>
  );
}
