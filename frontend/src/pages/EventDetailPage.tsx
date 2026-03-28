import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  fetchSplitEvent,
  patchParticipant,
} from "@/services/events.service";
import { getApiErrorMessage } from "@/services/api";
import type { EventParticipant, SplitEventDetail } from "@/types/api";
import { formatBRL } from "@/utils/format";
import { useToast } from "@/hooks/useToast";

function publicEventUrl(codigo: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${window.location.origin}${base}/evento/${codigo}`;
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const { showToast } = useToast();
  const [ev, setEv] = useState<SplitEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!Number.isFinite(eventId) || eventId < 1) return;
    setLoading(true);
    setFailed(false);
    try {
      const d = await fetchSplitEvent(eventId);
      setEv(d);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      setEv(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [eventId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const shareLink = useMemo(
    () => (ev ? publicEventUrl(ev.codigo) : ""),
    [ev]
  );

  async function copy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(msg, "success");
    } catch {
      showToast("Não foi possível copiar.", "error");
    }
  }

  async function togglePaid(p: EventParticipant) {
    setBusyId(p.id);
    try {
      const updated = await patchParticipant(eventId, p.id, { pago: !p.pago });
      setEv((prev) =>
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
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function saveValor(p: EventParticipant) {
    const raw = (editValor[p.id] ?? p.valor_devido).replace(",", ".");
    setBusyId(p.id);
    try {
      const updated = await patchParticipant(eventId, p.id, {
        valor_devido: raw,
      });
      setEv((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map((x) =>
                x.id === updated.id ? updated : x
              ),
            }
          : prev
      );
      setEditValor((m) => {
        const n = { ...m };
        delete n[p.id];
        return n;
      });
      showToast("Valor atualizado.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <AppShell title="Evento">
        <Skeleton className="mx-auto h-48 max-w-3xl w-full" />
      </AppShell>
    );
  }

  if (!ev) {
    return (
      <AppShell title="Evento">
        <div className="mx-auto max-w-xl rounded-2xl border border-danger/30 bg-danger/10 p-6 text-danger dark:text-red-300">
          <p className="font-medium">
            {failed ? "Não foi possível carregar este evento." : "Evento inválido."}
          </p>
          <Link
            to="/events"
            className="mt-4 inline-block text-sm font-semibold underline"
          >
            Voltar aos eventos
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={ev.nome}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            to="/events"
            className="text-sm font-medium text-primary/60 underline dark:text-slate-400"
          >
            ← Meus eventos
          </Link>
        </div>

        <Card title="Compartilhar">
          <p className="text-sm text-primary/60 dark:text-slate-400">
            Valor total:{" "}
            <strong className="text-primary dark:text-white">
              {formatBRL(ev.valor_total)}
            </strong>
          </p>
          <p className="mt-3 text-sm text-primary/60 dark:text-slate-400">
            Código:{" "}
            <span className="font-mono text-base font-bold text-primary dark:text-white">
              {ev.codigo}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="accent"
              className="min-h-10 text-sm"
              onClick={() => copy(ev.codigo, "Código copiado.")}
            >
              Copiar código
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 text-sm"
              onClick={() => copy(shareLink, "Link copiado.")}
            >
              Copiar link
            </Button>
          </div>
          <p className="mt-2 break-all text-xs text-primary/45 dark:text-slate-500">
            {shareLink}
          </p>
        </Card>

        <Card title="Participantes" subtitle="Verde = pago · vermelho = pendente">
          <ul className="space-y-4">
            {ev.participants.map((p) => (
              <li
                key={p.id}
                className={`rounded-xl border p-4 ${
                  p.pago
                    ? "border-accent/40 bg-accent/10 dark:border-accent/30"
                    : "border-danger/25 bg-danger/5 dark:border-danger/30 dark:bg-danger/10"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-primary dark:text-white">
                      {p.nome}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="text-xs text-primary/55 dark:text-slate-400">
                        Valor devido (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editValor[p.id] ?? p.valor_devido}
                        onChange={(e) =>
                          setEditValor((m) => ({
                            ...m,
                            [p.id]: e.target.value,
                          }))
                        }
                        className="min-h-9 w-36 rounded-lg border border-primary/15 bg-white px-2 py-1 text-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 text-xs"
                        disabled={busyId === p.id}
                        onClick={() => saveValor(p)}
                      >
                        Salvar valor
                      </Button>
                    </div>
                    <p
                      className={`mt-2 text-xs font-bold uppercase ${
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
                    {p.pago ? "Marcar não pago" : "Marcar pago"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
