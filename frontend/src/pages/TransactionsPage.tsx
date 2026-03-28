import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfMonth, startOfYear, subDays } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { TODAS_CATEGORIAS } from "@/constants/categories";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { getApiErrorMessage } from "@/services/api";
import * as txApi from "@/services/transactions.service";
import type { TipoTransacao, Transaction } from "@/types/api";
import { formatBRL, formatDateBR } from "@/utils/format";
import { useToast } from "@/hooks/useToast";

type FilterState = {
  tipo: "" | TipoTransacao;
  categoria: string;
  start_date: string;
  end_date: string;
};

const emptyFilters: FilterState = {
  tipo: "",
  categoria: "",
  start_date: "",
  end_date: "",
};

type PeriodPreset = "all" | "7d" | "month" | "year";

function applyPreset(preset: PeriodPreset): Pick<FilterState, "start_date" | "end_date"> {
  const end = format(new Date(), "yyyy-MM-dd");
  if (preset === "all") return { start_date: "", end_date: "" };
  if (preset === "7d") {
    return { start_date: format(subDays(new Date(), 6), "yyyy-MM-dd"), end_date: end };
  }
  if (preset === "month") {
    return { start_date: format(startOfMonth(new Date()), "yyyy-MM-dd"), end_date: end };
  }
  return { start_date: format(startOfYear(new Date()), "yyyy-MM-dd"), end_date: end };
}

export function TransactionsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [applied, setApplied] = useState<FilterState>(emptyFilters);
  const [draft, setDraft] = useState<FilterState>(emptyFilters);
  const [search, setSearch] = useState("");
  const [activePreset, setActivePreset] = useState<PeriodPreset | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await txApi.fetchTransactions({
        tipo: applied.tipo || undefined,
        categoria: applied.categoria.trim() || undefined,
        start_date: applied.start_date || undefined,
        end_date: applied.end_date || undefined,
      });
      setRows(data);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [applied, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.descricao || "").toLowerCase().includes(q));
  }, [rows, search]);

  async function handleDelete(id: number) {
    if (!confirm("Excluir esta transação?")) return;
    try {
      await txApi.deleteTransaction(id);
      showToast("Excluída com sucesso.", "success");
      load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: Transaction) {
    setEditing(row);
    setModalOpen(true);
  }

  function applyDraft() {
    setApplied({ ...draft });
    setActivePreset(null);
  }

  function usePreset(preset: PeriodPreset) {
    const dates = applyPreset(preset);
    const next = { ...draft, ...dates };
    setDraft(next);
    setApplied({ ...next });
    setActivePreset(preset);
  }

  const columns: Column<Transaction>[] = [
    {
      key: "data",
      header: "Data",
      className: "whitespace-nowrap",
      render: (r) => formatDateBR(r.data),
    },
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
    { key: "categoria", header: "Categoria", render: (r) => r.categoria },
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
    {
      key: "desc",
      header: "Descrição",
      render: (r) => (
        <span className="line-clamp-2 max-w-[200px] text-primary/70 dark:text-white/60">
          {r.descricao || "—"}
        </span>
      ),
    },
    {
      key: "ac",
      header: "",
      className: "w-[1%] whitespace-nowrap",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => openEdit(r)}>
            Editar
          </Button>
          <Button
            variant="danger"
            className="!px-2 !py-1 text-xs"
            onClick={() => handleDelete(r.id)}
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  const presetBtn =
    "min-h-11 rounded-xl px-3 text-sm font-semibold ring-1 transition active:scale-[0.98]";
  const presetActive =
    "bg-primary text-white ring-primary dark:bg-white dark:text-slate-900 dark:ring-white";
  const presetIdle =
    "bg-white text-primary ring-primary/15 hover:bg-surface dark:bg-white/10 dark:text-white dark:ring-white/15";

  return (
    <AppShell title="Transações">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card
          title="Filtros avançados"
          subtitle="Período rápido, tipo, categoria e busca na descrição"
          action={
            <Button variant="accent" className="min-h-11 w-full sm:w-auto" onClick={openCreate}>
              + Nova transação
            </Button>
          }
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary/50 dark:text-slate-400">
            Período
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${presetBtn} ${activePreset === "all" ? presetActive : presetIdle}`}
              onClick={() => usePreset("all")}
            >
              Tudo
            </button>
            <button
              type="button"
              className={`${presetBtn} ${activePreset === "7d" ? presetActive : presetIdle}`}
              onClick={() => usePreset("7d")}
            >
              Últimos 7 dias
            </button>
            <button
              type="button"
              className={`${presetBtn} ${activePreset === "month" ? presetActive : presetIdle}`}
              onClick={() => usePreset("month")}
            >
              Mês atual
            </button>
            <button
              type="button"
              className={`${presetBtn} ${activePreset === "year" ? presetActive : presetIdle}`}
              onClick={() => usePreset("year")}
            >
              Ano atual
            </button>
          </div>

          <div className="mb-4">
            <Input
              label="Buscar na descrição"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex.: mercado, aluguel…"
            />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="min-w-[140px] flex-1">
              <Select
                label="Tipo"
                value={draft.tipo}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, tipo: e.target.value as FilterState["tipo"] }))
                }
              >
                <option value="">Todos</option>
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </Select>
            </div>
            <div className="min-w-[200px] flex-1">
              <Select
                label="Categoria"
                value={draft.categoria}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, categoria: e.target.value }))
                }
              >
                <option value="">Todas</option>
                {TODAS_CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[180px] flex-1">
              <DatePickerField
                id="filtro-data-ini"
                label="Data inicial"
                value={draft.start_date}
                onChange={(iso) => {
                  setDraft((d) => ({ ...d, start_date: iso }));
                  setActivePreset(null);
                }}
                placeholder="Agenda"
                hideHint
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <DatePickerField
                id="filtro-data-fim"
                label="Data final"
                value={draft.end_date}
                onChange={(iso) => {
                  setDraft((d) => ({ ...d, end_date: iso }));
                  setActivePreset(null);
                }}
                placeholder="Agenda"
                hideHint
              />
            </div>
            <Button variant="primary" className="min-h-11" onClick={applyDraft} disabled={loading}>
              Aplicar filtros
            </Button>
          </div>
        </Card>

        <Card
          title="Extrato"
          subtitle={`${filteredRows.length} lançamento(s) exibidos${search.trim() ? " (filtrado na busca)" : ""}`}
        >
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" rounded="lg" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredRows}
              rowKey={(r) => r.id}
              empty={
                <EmptyState
                  title={
                    search.trim()
                      ? "Nenhum resultado na busca"
                      : "Você ainda não adicionou nenhum gasto"
                  }
                  description={
                    search.trim()
                      ? "Tente outro termo ou limpe a busca."
                      : "Ajuste os filtros ou cadastre sua primeira transação."
                  }
                  actionLabel={search.trim() ? undefined : "Adicionar primeiro gasto"}
                  onAction={search.trim() ? undefined : openCreate}
                  icon={search.trim() ? "🔎" : "📋"}
                />
              }
            />
          )}
        </Card>
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={load}
        initial={editing}
      />
    </AppShell>
  );
}
