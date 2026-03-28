import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, useNavigate } from "react-router-dom";
import { AlertList } from "@/components/fintech/AlertCard";
import { ForecastCard } from "@/components/fintech/ForecastCard";
import { GoalProgress } from "@/components/fintech/GoalProgress";
import { InsightCard } from "@/components/fintech/InsightCard";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { fetchBalance } from "@/services/balance.service";
import { fetchInsights } from "@/services/insights.service";
import { fetchSpendingByCategory } from "@/services/reports.service";
import { fetchTransactions } from "@/services/transactions.service";
import { getApiErrorMessage } from "@/services/api";
import type { Balance, InsightsResponse, SpendingByCategoryItem, Transaction } from "@/types/api";
import { formatBRL, formatDateBR } from "@/utils/format";
import {
  alignedMonthWindows,
  buildForecast,
  buildSmartAlerts,
  detectRecurringSubscriptions,
  spendingSeriesLastDays,
  type SmartAlert,
} from "@/utils/finance";
import { useToast } from "@/hooks/useToast";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { format, subMonths } from "date-fns";

const PIE_COLORS = [
  "#22C55E",
  "#0F172A",
  "#EF4444",
  "#38BDF8",
  "#A855F7",
  "#F97316",
  "#14B8A6",
];

function KpiCard({
  label,
  value,
  valueClass,
  borderClass,
}: {
  label: string;
  value: string;
  valueClass: string;
  borderClass: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-card ring-1 ring-primary/5 transition hover:shadow-md hover:ring-primary/10 dark:bg-slate-900 dark:ring-white/10 ${borderClass}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/50 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { goals } = useFinancialGoals();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [balCurr, setBalCurr] = useState<Balance | null>(null);
  const [balPrev, setBalPrev] = useState<Balance | null>(null);
  const [chartData, setChartData] = useState<
    { name: string; value: number; fill: string }[]
  >([]);
  const [top3, setTop3] = useState<{ categoria: string; total: string }[]>([]);
  const [lineData, setLineData] = useState<{ label: string; total: number }[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [allTx, setAllTx] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);

  const load = useCallback(async () => {
    const w = alignedMonthWindows();
    setLoading(true);
    try {
      const since = format(subMonths(new Date(), 14), "yyyy-MM-dd");
      const [
        b,
        spend,
        txs,
        ins,
        bCurr,
        bPrev,
        spendMonth,
      ] = await Promise.all([
        fetchBalance(),
        fetchSpendingByCategory(),
        fetchTransactions({ start_date: since }),
        fetchInsights(),
        fetchBalance({
          start_date: w.current.start,
          end_date: w.current.end,
        }),
        fetchBalance({
          start_date: w.previous.start,
          end_date: w.previous.end,
        }),
        fetchSpendingByCategory({
          start_date: w.current.start,
          end_date: w.current.end,
        }),
      ]);

      setBalance(b);
      setBalCurr(bCurr);
      setBalPrev(bPrev);
      setInsights(ins);

      const items = spend.itens ?? [];
      setChartData(
        items.map((it: SpendingByCategoryItem, i: number) => ({
          name: it.categoria,
          value: parseFloat(it.total),
          fill: PIE_COLORS[i % PIE_COLORS.length],
        }))
      );

      const monthItems = spendMonth.itens ?? [];
      const sorted = [...monthItems]
        .map((it) => ({
          categoria: it.categoria,
          total: it.total,
          n: parseFloat(it.total) || 0,
        }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 3)
        .map(({ categoria, total }) => ({ categoria, total }));

      setTop3(sorted);

      const series = spendingSeriesLastDays(txs, 30);
      setLineData(series.map(({ label, total }) => ({ label, total })));

      setAllTx(txs);
      const sortedTx = [...txs].sort((a, b) => b.data.localeCompare(a.data));
      setRecent(sortedTx.slice(0, 5));
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const saldo = balance ? parseFloat(balance.saldo_final) : 0;
  const forecast = useMemo(
    () => buildForecast(saldo, allTx, 30),
    [saldo, allTx]
  );

  const smartAlerts = useMemo(() => {
    const w = alignedMonthWindows();
    const list = buildSmartAlerts(allTx, w);
    if (insights?.alerta) {
      const apiAlert: SmartAlert = {
        id: "api-saldo",
        title: "Alerta financeiro",
        message: insights.alerta,
        tone: "danger",
      };
      return [apiAlert, ...list];
    }
    return list;
  }, [allTx, insights?.alerta]);

  const subscriptions = useMemo(
    () => detectRecurringSubscriptions(allTx),
    [allTx]
  );
  const subsTotal = subscriptions.reduce((s, x) => s + x.monthlyEstimate, 0);

  const columns: Column<Transaction>[] = [
    { key: "data", header: "Data", render: (r) => formatDateBR(r.data) },
    {
      key: "tipo",
      header: "Tipo",
      render: (r) => (
        <span
          className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${
            r.tipo === "RECEITA"
              ? "bg-accent/15 text-accent"
              : "bg-danger/10 text-danger"
          }`}
        >
          {r.tipo === "RECEITA" ? "Receita" : "Despesa"}
        </span>
      ),
    },
    { key: "cat", header: "Categoria", render: (r) => r.categoria },
    {
      key: "valor",
      header: "Valor",
      render: (r) => (
        <span
          className={
            r.tipo === "RECEITA" ? "font-semibold text-accent" : "font-semibold text-danger"
          }
        >
          {formatBRL(r.valor)}
        </span>
      ),
    },
  ];

  const despesasCurr = balCurr ? parseFloat(balCurr.total_despesas) : 0;
  const despesasPrev = balPrev ? parseFloat(balPrev.total_despesas) : 0;
  const diffPct =
    despesasPrev > 0
      ? Math.round(((despesasCurr - despesasPrev) / despesasPrev) * 100)
      : null;

  return (
    <AppShell title="Dashboard">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="mx-auto w-full min-w-0 max-w-6xl space-y-8 animate-fadeIn">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Saldo total"
              value={balance ? formatBRL(balance.saldo_final) : "—"}
              valueClass={saldo >= 0 ? "text-accent" : "text-danger"}
              borderClass="border-l-4 border-l-primary dark:border-l-white/40"
            />
            <KpiCard
              label="Receitas"
              value={balance ? formatBRL(balance.total_receitas) : "—"}
              valueClass="text-accent"
              borderClass="border-l-4 border-l-accent"
            />
            <KpiCard
              label="Despesas"
              value={balance ? formatBRL(balance.total_despesas) : "—"}
              valueClass="text-danger"
              borderClass="border-l-4 border-l-danger"
            />
          </div>

          {smartAlerts.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary/50 dark:text-slate-400">
                Alertas inteligentes
              </h2>
              <AlertList alerts={smartAlerts} />
            </section>
          ) : null}

          <ForecastCard forecast={forecast} />

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightCard
              title="Despesas no período"
              subtitle="Mês atual (até hoje) vs mesmo período no mês anterior"
              accent="warning"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface p-4 dark:bg-white/5">
                  <p className="text-xs font-semibold text-primary/50 dark:text-slate-400">
                    Período atual
                  </p>
                  <p className="mt-1 text-xl font-bold text-danger">
                    {formatBRL(balCurr?.total_despesas ?? "0")}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-4 dark:bg-white/5">
                  <p className="text-xs font-semibold text-primary/50 dark:text-slate-400">
                    Mês anterior
                  </p>
                  <p className="mt-1 text-xl font-bold text-primary dark:text-white">
                    {formatBRL(balPrev?.total_despesas ?? "0")}
                  </p>
                </div>
              </div>
              {diffPct != null ? (
                <p
                  className={`mt-3 text-sm font-medium ${
                    diffPct > 0 ? "text-danger" : diffPct < 0 ? "text-accent" : "text-primary/60"
                  }`}
                >
                  {diffPct > 0
                    ? `↑ ${diffPct}% a mais que no período equivalente do mês passado`
                    : diffPct < 0
                      ? `↓ ${Math.abs(diffPct)}% a menos — ótimo controle`
                      : "Mesmo patamar que o mês anterior"}
                </p>
              ) : (
                <p className="mt-3 text-sm text-primary/60 dark:text-slate-400">
                  Cadastre mais histórico para comparar períodos.
                </p>
              )}
            </InsightCard>

            <InsightCard title="Top 3 categorias" subtitle="Maiores gastos no mês atual" accent="danger">
              {top3.length === 0 ? (
                <p className="text-sm text-primary/60 dark:text-slate-400">
                  Sem despesas neste mês ainda.
                </p>
              ) : (
                <ol className="space-y-3">
                  {top3.map((t, i) => (
                    <li
                      key={t.categoria}
                      className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 dark:bg-white/5"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-primary dark:text-white">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/10 text-xs font-bold text-danger">
                          {i + 1}
                        </span>
                        {t.categoria}
                      </span>
                      <span className="font-bold tabular-nums text-danger">
                        {formatBRL(t.total)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </InsightCard>
          </div>

          <Card
            title="Gastos ao longo do tempo"
            subtitle="Despesas por dia — últimos 30 dias"
            action={
              <Link
                to="/transactions"
                className="text-sm font-semibold text-accent transition hover:underline"
              >
                Ver transações
              </Link>
            }
          >
            {lineData.every((d) => d.total === 0) ? (
              <EmptyState
                title="Você ainda não adicionou nenhum gasto"
                description="Quando registrar despesas, o gráfico mostra o ritmo diário."
                actionLabel="Adicionar primeiro gasto"
                onAction={() => navigate("/transactions")}
                icon="📈"
              />
            ) : (
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748B" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#64748B"
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("pt-BR", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(v)
                      }
                    />
                    <Tooltip
                      formatter={(v: number) => [formatBRL(v), "Despesas"]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(15,23,42,0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#EF4444"
                      strokeWidth={2.5}
                      dot={{ fill: "#EF4444", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Gastos por categoria" subtitle="Visão geral (todo o período)">
              {chartData.length === 0 ? (
                <EmptyState
                  title="Sem dados para o gráfico"
                  description="Cadastre despesas para visualizar a distribuição."
                  actionLabel="Ir para transações"
                  onAction={() => navigate("/transactions")}
                  icon="📊"
                />
              ) : (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`c-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatBRL(v)}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid rgba(15,23,42,0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card
              title="Assinaturas & recorrentes"
              subtitle="Detectamos valores repetidos em meses diferentes"
              action={
                <Link
                  to="/transactions"
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  Lançamentos
                </Link>
              }
            >
              {subscriptions.length === 0 ? (
                <EmptyState
                  title="Nenhum padrão recorrente ainda"
                  description="Use a mesma descrição e valor em meses diferentes (ex.: Netflix) para aparecer aqui."
                  actionLabel="Nova transação"
                  onAction={() => navigate("/transactions")}
                  icon="🔄"
                />
              ) : (
                <>
                  <p className="mb-3 text-sm text-primary/60 dark:text-slate-400">
                    Total estimado mensal:{" "}
                    <strong className="text-primary dark:text-white">{formatBRL(subsTotal)}</strong>
                  </p>
                  <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {subscriptions.slice(0, 8).map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-sm dark:bg-white/5"
                      >
                        <span className="truncate font-medium text-primary dark:text-white">
                          {s.label}
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-danger">
                          {formatBRL(s.monthlyEstimate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>

          {goals.length > 0 ? (
            <Card
              title="Metas em andamento"
              subtitle="Resumo rápido"
              action={
                <Link
                  to="/goals"
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  Gerenciar metas
                </Link>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {goals.slice(0, 2).map((g) => (
                  <GoalProgress key={g.id} goal={g} />
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Metas financeiras" subtitle="Defina objetivos e acompanhe o progresso">
              <EmptyState
                title="Nenhuma meta criada"
                description="Junte valores com metas claras — tudo salvo neste dispositivo."
                actionLabel="Criar meta"
                onAction={() => navigate("/goals")}
                icon="🎯"
              />
            </Card>
          )}

          <Card
            title="Movimentação recente"
            subtitle="Últimos lançamentos"
            action={
              <Link
                to="/transactions"
                className="text-sm font-semibold text-accent hover:underline"
              >
                Ver tudo
              </Link>
            }
          >
            {recent.length === 0 ? (
              <EmptyState
                title="Nenhuma transação ainda"
                description="Comece registrando uma receita ou despesa."
                actionLabel="Adicionar primeiro gasto"
                onAction={() => navigate("/transactions")}
                icon="💳"
              />
            ) : (
              <DataTable columns={columns} data={recent} rowKey={(r) => r.id} />
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
