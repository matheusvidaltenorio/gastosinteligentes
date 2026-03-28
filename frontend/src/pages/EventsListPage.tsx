import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchMySplitEvents } from "@/services/events.service";
import { getApiErrorMessage } from "@/services/api";
import type { SplitEventListItem } from "@/types/api";
import { useToast } from "@/hooks/useToast";
import { formatBRL, formatDateBR } from "@/utils/format";

export function EventsListPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<SplitEventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchMySplitEvents());
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell title="Eventos">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-primary/60 dark:text-slate-400">
            Divida gastos com outras pessoas e compartilhe o código do evento.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/events/join"
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ring-primary/15 transition hover:bg-surface dark:text-slate-200 dark:ring-white/20 dark:hover:bg-white/10"
            >
              Entrar com código
            </Link>
            <Link
              to="/events/new"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:brightness-110"
            >
              Criar evento
            </Link>
          </div>
        </div>

        <Card title="Meus eventos" subtitle="Criados por você">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-primary/55 dark:text-slate-400">
              Nenhum evento ainda. Crie um e envie o código aos participantes.
            </p>
          ) : (
            <ul className="divide-y divide-primary/10 dark:divide-white/10">
              {items.map((ev) => (
                <li key={ev.id} className="py-4 first:pt-0">
                  <Link
                    to={`/events/${ev.id}`}
                    className="block rounded-lg transition hover:bg-surface/80 dark:hover:bg-white/5"
                  >
                    <p className="font-semibold text-primary dark:text-white">
                      {ev.nome}
                    </p>
                    <p className="mt-1 text-sm text-primary/60 dark:text-slate-400">
                      {formatBRL(ev.valor_total)} · {ev.participantes_count}{" "}
                      participante(s) · Código{" "}
                      <span className="font-mono font-medium">{ev.codigo}</span>
                    </p>
                    <p className="mt-1 text-xs text-primary/45 dark:text-slate-500">
                      {formatDateBR(ev.created_at?.slice(0, 10) ?? "")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
