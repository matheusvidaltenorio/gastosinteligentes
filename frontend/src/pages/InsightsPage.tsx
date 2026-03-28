import { useCallback, useEffect, useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { AlertList } from "@/components/fintech/AlertCard";
import { InsightCard } from "@/components/fintech/InsightCard";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchInsights } from "@/services/insights.service";
import { fetchTransactions } from "@/services/transactions.service";
import type { InsightsResponse, Transaction } from "@/types/api";
import { getApiErrorMessage } from "@/services/api";
import { formatBRL } from "@/utils/format";
import { alignedMonthWindows, buildSmartAlerts } from "@/utils/finance";
import { useToast } from "@/hooks/useToast";

export function InsightsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const since = format(subMonths(new Date(), 14), "yyyy-MM-dd");
      const [res, list] = await Promise.all([
        fetchInsights(),
        fetchTransactions({ start_date: since }),
      ]);
      setData(res);
      setTxs(list);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const dia = data?.dia_da_semana_que_mais_gasta;
  const cat = data?.categoria_com_maior_gasto;
  const media = data?.media_gastos_por_dia_com_despesa;

  const smartAlerts = useMemo(() => {
    if (!data) return [];
    const w = alignedMonthWindows();
    const list = buildSmartAlerts(txs, w);
    if (data.alerta) {
      return [
        {
          id: "api",
          title: "Alerta financeiro",
          message: data.alerta,
          tone: "danger" as const,
        },
        ...list,
      ];
    }
    return list;
  }, [data, txs]);

  return (
    <AppShell title="Insights">
      <div className="mx-auto max-w-4xl space-y-6">
        {loading ? (
          <div className="space-y-4 animate-fadeIn">
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {smartAlerts.length > 0 ? (
              <section className="animate-slideUp">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-primary/50 dark:text-slate-400">
                  Alertas inteligentes
                </h2>
                <AlertList alerts={smartAlerts} />
              </section>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <InsightCard
                className="animate-slideUp"
                accent="accent"
                title="Dia da semana"
                subtitle="Onde você mais gasta"
              >
                {dia ? (
                  <p className="text-lg font-semibold leading-relaxed text-primary dark:text-slate-100">
                    Você gasta mais na{" "}
                    <span className="text-accent">{dia.dia_da_semana}</span>
                    <span className="block pt-2 text-sm font-normal text-primary/60 dark:text-slate-400">
                      Total nesse dia:{" "}
                      <strong className="text-primary dark:text-white">
                        {formatBRL(dia.total_gasto)}
                      </strong>
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-primary/60 dark:text-slate-400">
                    Cadastre despesas para identificarmos o padrão semanal.
                  </p>
                )}
              </InsightCard>

              <InsightCard
                className="animate-slideUp"
                accent="primary"
                title="Maior categoria"
                subtitle="Onde o dinheiro mais sai"
              >
                {cat ? (
                  <p className="text-lg font-semibold leading-relaxed text-primary dark:text-slate-100">
                    Maior categoria de gasto:{" "}
                    <span className="text-primary dark:text-white">{cat.categoria}</span>
                    <span className="block pt-2 text-sm font-normal text-primary/60 dark:text-slate-400">
                      Total:{" "}
                      <strong className="text-danger">{formatBRL(cat.total_gasto)}</strong>
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-primary/60 dark:text-slate-400">
                    Sem categorias de despesa ainda.
                  </p>
                )}
              </InsightCard>

              <InsightCard
                className="animate-slideUp md:col-span-2"
                accent="warning"
                title="Média diária"
                subtitle="Entre os dias em que houve despesa"
              >
                <p className="text-3xl font-bold tabular-nums text-primary dark:text-white">
                  {formatBRL(media ?? "0")}
                </p>
                <p className="mt-2 text-sm text-primary/60 dark:text-slate-400">
                  Útil para comparar com sua meta de gasto diário.
                </p>
              </InsightCard>
            </div>

            {data?.totais ? (
              <Card title="Resumo dos totais" subtitle="Mesma base do endpoint /insights">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-surface p-4 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase text-primary/50 dark:text-slate-400">
                      Receitas
                    </p>
                    <p className="mt-1 text-xl font-bold text-accent">
                      {formatBRL(data.totais.total_receitas)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface p-4 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase text-primary/50 dark:text-slate-400">
                      Despesas
                    </p>
                    <p className="mt-1 text-xl font-bold text-danger">
                      {formatBRL(data.totais.total_despesas)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface p-4 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase text-primary/50 dark:text-slate-400">
                      Saldo
                    </p>
                    <p className="mt-1 text-xl font-bold text-primary dark:text-white">
                      {formatBRL(data.totais.saldo)}
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
