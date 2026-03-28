import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PublicEventShell } from "@/components/layout/PublicEventShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  fetchSplitEventByCode,
  setParticipantPaidPublic,
} from "@/services/events.service";
import { getApiErrorMessage } from "@/services/api";
import type { EventParticipant, SplitEventPublic } from "@/types/api";
import { formatBRL } from "@/utils/format";

export function EventPublicPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [data, setData] = useState<SplitEventPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!codigo) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchSplitEventByCode(codigo);
      setData(d);
    } catch (e) {
      setErr(getApiErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePaid(p: EventParticipant) {
    if (!codigo) return;
    setBusyId(p.id);
    try {
      const updated = await setParticipantPaidPublic(codigo, p.id, !p.pago);
      setData((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map((x) =>
                x.id === updated.id ? updated : x
              ),
            }
          : prev
      );
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <PublicEventShell>
        <Skeleton className="h-40 w-full" />
      </PublicEventShell>
    );
  }

  if (err || !data) {
    return (
      <PublicEventShell title="Evento">
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-danger dark:text-red-300">
          <p className="font-medium">{err ?? "Evento não encontrado."}</p>
          <Link
            to="/events/join"
            className="mt-4 inline-block text-sm font-semibold underline"
          >
            Tentar outro código
          </Link>
        </div>
      </PublicEventShell>
    );
  }

  return (
    <PublicEventShell title={data.nome}>
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
        <p className="text-sm text-primary/60 dark:text-slate-400">
          Valor total do evento
        </p>
        <p className="text-2xl font-bold text-primary dark:text-white">
          {formatBRL(data.valor_total)}
        </p>
        <p className="mt-2 text-xs text-primary/50 dark:text-slate-500">
          Código: <span className="font-mono font-semibold">{data.codigo}</span>
        </p>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary/50 dark:text-slate-400">
        Participantes
      </h2>
      <ul className="space-y-3">
        {data.participants.map((p) => (
          <li
            key={p.id}
            className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              p.pago
                ? "border-accent/40 bg-accent/10 dark:border-accent/30"
                : "border-danger/25 bg-danger/5 dark:border-danger/30 dark:bg-danger/10"
            }`}
          >
            <div>
              <p className="font-semibold text-primary dark:text-white">{p.nome}</p>
              <p className="text-sm text-primary/70 dark:text-slate-300">
                Devido: <strong>{formatBRL(p.valor_devido)}</strong>
              </p>
              <p
                className={`mt-1 text-xs font-bold uppercase ${
                  p.pago ? "text-accent" : "text-danger"
                }`}
              >
                {p.pago ? "Pago" : "Pendente"}
              </p>
            </div>
            <Button
              type="button"
              variant={p.pago ? "outline" : "accent"}
              className="min-h-10 shrink-0 text-sm"
              disabled={busyId === p.id}
              onClick={() => togglePaid(p)}
            >
              {p.pago ? "Marcar como não pago" : "Marcar como pago"}
            </Button>
          </li>
        ))}
      </ul>
    </PublicEventShell>
  );
}
