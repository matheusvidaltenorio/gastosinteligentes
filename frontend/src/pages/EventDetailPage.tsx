import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  confirmParticipantPayment,
  deleteEventParticipant,
  deleteSplitEvent,
  fetchSplitEvent,
  fetchWhatsAppShareParticipant,
  generateParticipantPix,
  patchParticipant,
  updateSplitEvent,
} from "@/services/events.service";
import { getApiErrorMessage } from "@/services/api";
import type {
  EventParticipant,
  SplitEventDetail,
  StatusPagamento,
} from "@/types/api";
import { formatBRL } from "@/utils/format";
import { useToast } from "@/hooks/useToast";

type PayFilter = "todos" | StatusPagamento;

function shareUrl(ev: SplitEventDetail): string {
  if (ev.link_publico?.startsWith("http")) return ev.link_publico;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${window.location.origin}${base}/evento/${ev.codigo}`;
}

function parseNum(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function statusLabel(s: StatusPagamento | undefined): string {
  if (s === "pago") return "Pago";
  if (s === "parcial") return "Parcial";
  return "Pendente";
}

function statusRowClass(s: StatusPagamento | undefined, pago: boolean): string {
  if (s === "pago" || pago)
    return "border-accent/40 bg-accent/10 dark:border-accent/30";
  if (s === "parcial")
    return "border-amber-400/40 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/30";
  return "border-danger/25 bg-danger/5 dark:border-danger/30 dark:bg-danger/10";
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);
  const { showToast } = useToast();
  const [ev, setEv] = useState<SplitEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState<Record<string, string>>({});
  const [editTelefone, setEditTelefone] = useState<Record<string, string>>({});
  const [confirmValor, setConfirmValor] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<PayFilter>("todos");

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

  const linkShare = useMemo(() => (ev ? shareUrl(ev) : ""), [ev]);

  const filteredParticipants = useMemo(() => {
    if (!ev) return [];
    if (filter === "todos") return ev.participants;
    return ev.participants.filter((p) => (p.status_pagamento ?? "pendente") === filter);
  }, [ev, filter]);

  async function copy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(msg, "success");
    } catch {
      showToast("Não foi possível copiar.", "error");
    }
  }

  function mergeParticipant(updated: EventParticipant) {
    setEv((prev) =>
      prev
        ? {
            ...prev,
            participants: prev.participants.map((x) =>
              x.id === updated.id ? { ...x, ...updated } : x
            ),
          }
        : prev
    );
  }

  async function refreshFull() {
    try {
      const d = await fetchSplitEvent(eventId);
      setEv(d);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }

  async function togglePaid(p: EventParticipant) {
    setBusyId(p.id);
    try {
      const updated = await patchParticipant(eventId, p.id, { pago: !p.pago });
      mergeParticipant(updated);
      await refreshFull();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function saveTelefone(p: EventParticipant) {
    const tel = (editTelefone[p.id] ?? p.telefone ?? "").trim();
    setBusyId(p.id);
    try {
      const updated = await patchParticipant(eventId, p.id, { telefone: tel });
      mergeParticipant(updated);
      setEditTelefone((m) => {
        const n = { ...m };
        delete n[p.id];
        return n;
      });
      await refreshFull();
      showToast("WhatsApp salvo.", "success");
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
      mergeParticipant(updated);
      setEditValor((m) => {
        const n = { ...m };
        delete n[p.id];
        return n;
      });
      await refreshFull();
      showToast("Valor atualizado.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function onGeneratePix(p: EventParticipant) {
    setBusyId(p.id);
    try {
      const updated = await generateParticipantPix(eventId, p.id);
      mergeParticipant(updated);
      await refreshFull();
      showToast("PIX de demonstração gerado (não é cobrança real).", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function onWhatsAppParticipant(p: EventParticipant) {
    const tel = (editTelefone[p.id] ?? p.telefone ?? "").trim();
    const digits = tel.replace(/\D/g, "");
    if (digits.length < 10) {
      showToast(
        "Informe o WhatsApp com DDD (ex.: 5511999998888). Você pode salvar antes ou o envio grava automaticamente.",
        "error"
      );
      return;
    }
    if (!p.pix_code) {
      showToast(
        "Dica: gere o PIX antes — a mensagem inclui o código para a pessoa pagar pelo app do banco.",
        "info"
      );
    }
    setBusyId(p.id);
    try {
      const saved = (p.telefone ?? "").trim();
      if (tel !== saved) {
        await patchParticipant(eventId, p.id, { telefone: tel });
        setEditTelefone((m) => {
          const n = { ...m };
          delete n[p.id];
          return n;
        });
        await refreshFull();
      }
      const { url } = await fetchWhatsAppShareParticipant(eventId, p.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function onConfirmPayment(p: EventParticipant) {
    const due = parseNum(p.valor_devido);
    const paid = parseNum(p.valor_pago ?? "0");
    const remaining = Math.max(0, Math.round((due - paid) * 100) / 100);
    const raw = (confirmValor[p.id] ?? remaining.toFixed(2)).replace(",", ".");
    const v = parseFloat(raw);
    if (!Number.isFinite(v) || v <= 0) {
      showToast("Informe um valor válido.", "error");
      return;
    }
    setBusyId(p.id);
    try {
      const updated = await confirmParticipantPayment(eventId, p.id, {
        valor: v.toFixed(2),
        metodo: "manual",
      });
      mergeParticipant(updated);
      setConfirmValor((m) => {
        const n = { ...m };
        delete n[p.id];
        return n;
      });
      await refreshFull();
      showToast("Pagamento registrado.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemoveParticipant(p: EventParticipant) {
    if (!window.confirm(`Remover ${p.nome} do evento?`)) return;
    setBusyId(p.id);
    try {
      await deleteEventParticipant(eventId, p.id);
      await refreshFull();
      showToast("Participante removido.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function onCloseEvent() {
    if (!ev) return;
    if (!window.confirm("Encerrar este evento? Participantes não poderão marcar pagamento pelo link público."))
      return;
    try {
      const d = await updateSplitEvent(eventId, { status: "encerrado" });
      setEv(d);
      showToast("Evento encerrado.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }

  async function onDeleteEvent() {
    if (!window.confirm("Excluir este evento permanentemente?")) return;
    try {
      await deleteSplitEvent(eventId);
      showToast("Evento excluído.", "success");
      navigate("/events");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
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

  const r = ev.resumo;
  const pct = Math.min(100, Math.max(0, r.percentual_arrecadado));

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

        <Card title="Resumo financeiro">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-primary/50 dark:text-slate-500">
                Total do evento
              </p>
              <p className="text-xl font-bold text-primary dark:text-white">
                {formatBRL(r.valor_total)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-primary/50 dark:text-slate-500">
                Arrecadado / pendente
              </p>
              <p className="text-sm text-primary/80 dark:text-slate-300">
                <span className="font-semibold text-accent">
                  {formatBRL(r.total_arrecadado)}
                </span>
                {" · "}
                <span className="text-danger">{formatBRL(r.total_pendente)}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-primary/55 dark:text-slate-400">
                {r.pagos_count} pago(s) · {r.parciais_count} parcial(is) ·{" "}
                {r.pendentes_count} pendente(s)
              </p>
            </div>
            <div>
              <p className="text-xs text-primary/55 dark:text-slate-400">
                {r.participantes_count} participante(s)
              </p>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-primary/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-primary/50 dark:text-slate-500">
            {pct.toFixed(1)}% do valor total
          </p>
        </Card>

        <Card title="Detalhes e status">
          {ev.descricao ? (
            <p className="text-sm text-primary/75 dark:text-slate-300">{ev.descricao}</p>
          ) : (
            <p className="text-sm text-primary/45 dark:text-slate-500">Sem descrição.</p>
          )}
          <p className="mt-2 text-sm text-primary/60 dark:text-slate-400">
            Divisão: <strong className="text-primary dark:text-white">{ev.tipo_divisao}</strong>
            {" · "}
            Status:{" "}
            <strong className="text-primary dark:text-white">{ev.status}</strong>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ev.status === "aberto" ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-10 text-sm"
                onClick={onCloseEvent}
              >
                Encerrar evento
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-10 border-danger/40 text-sm text-danger hover:bg-danger/10 dark:border-danger/40 dark:text-red-300"
              onClick={onDeleteEvent}
            >
              Excluir evento
            </Button>
          </div>
        </Card>

        <Card title="Compartilhar">
          <p className="text-sm text-primary/60 dark:text-slate-400">
            Código:{" "}
            <span className="font-mono text-base font-bold text-primary dark:text-white">
              {ev.codigo}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/evento/${ev.codigo}`}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:brightness-110"
            >
              Abrir página pública
            </Link>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 text-sm"
              onClick={() => copy(ev.codigo, "Código copiado.")}
            >
              Copiar código
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 text-sm"
              onClick={() => copy(linkShare, "Link copiado.")}
            >
              Copiar link
            </Button>
          </div>
          <p className="mt-3 text-xs text-primary/50 dark:text-slate-500">Link público</p>
          <Link
            to={`/evento/${ev.codigo}`}
            className="mt-1 block break-all text-sm font-medium text-accent underline underline-offset-2 transition hover:opacity-90"
          >
            {linkShare}
          </Link>
        </Card>

        <Card
          title="Participantes"
          subtitle="WhatsApp com valor total do evento + sua parte + PIX (gere o PIX antes). Verde = pago · amarelo = parcial · vermelho = pendente"
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ["todos", "Todos"],
                ["pendente", "Pendentes"],
                ["parcial", "Parciais"],
                ["pago", "Pagos"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === k
                    ? "bg-accent text-primary"
                    : "bg-primary/5 text-primary/70 ring-1 ring-primary/10 dark:bg-white/5 dark:text-slate-300 dark:ring-white/15"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="space-y-4">
            {filteredParticipants.map((p) => (
              <li
                key={p.id}
                className={`rounded-xl border p-4 ${statusRowClass(p.status_pagamento, p.pago)}`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary dark:text-white">{p.nome}</p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <label className="text-xs text-primary/55 dark:text-slate-400">
                          WhatsApp (país + DDD + número)
                        </label>
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="5511999998888"
                          value={editTelefone[p.id] ?? p.telefone ?? ""}
                          onChange={(e) =>
                            setEditTelefone((m) => ({
                              ...m,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="mt-0.5 min-h-9 w-full max-w-xs rounded-lg border border-primary/15 bg-white px-2 py-1 font-mono text-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 text-xs"
                        disabled={busyId === p.id}
                        onClick={() => saveTelefone(p)}
                      >
                        Salvar número
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-primary/55 dark:text-slate-400">
                      Devido: {formatBRL(p.valor_devido)}
                      {p.valor_pago !== undefined ? (
                        <>
                          {" · "}
                          Pago: {formatBRL(p.valor_pago)}
                        </>
                      ) : null}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="text-xs text-primary/55 dark:text-slate-400">
                        Editar devido (R$)
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
                        Salvar
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 text-xs"
                        disabled={busyId === p.id}
                        onClick={() => onGeneratePix(p)}
                      >
                        Gerar PIX (demo)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 text-xs"
                        disabled={!p.pix_code || busyId === p.id}
                        onClick={() =>
                          p.pix_code && copy(p.pix_code, "Código PIX copiado.")
                        }
                      >
                        Copiar PIX
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 text-xs"
                        disabled={busyId === p.id}
                        onClick={() => onWhatsAppParticipant(p)}
                      >
                        WhatsApp (valor + PIX)
                      </Button>
                      {ev.tipo_divisao !== "manual" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-9 text-xs text-danger dark:text-red-300"
                          disabled={busyId === p.id}
                          onClick={() => onRemoveParticipant(p)}
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>
                    {(p.status_pagamento === "pendente" ||
                      p.status_pagamento === "parcial") &&
                    parseNum(p.valor_devido) > parseNum(p.valor_pago ?? "0") ? (
                      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-primary/10 p-2 dark:border-white/10">
                        <div>
                          <label className="text-xs text-primary/55 dark:text-slate-400">
                            Registrar pagamento (R$)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={
                              confirmValor[p.id] ??
                              Math.max(
                                0,
                                parseNum(p.valor_devido) - parseNum(p.valor_pago ?? "0")
                              ).toFixed(2)
                            }
                            onChange={(e) =>
                              setConfirmValor((m) => ({
                                ...m,
                                [p.id]: e.target.value,
                              }))
                            }
                            className="mt-0.5 min-h-9 w-32 rounded-lg border border-primary/15 bg-white px-2 py-1 text-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="accent"
                          className="min-h-9 text-xs"
                          disabled={busyId === p.id}
                          onClick={() => onConfirmPayment(p)}
                        >
                          Confirmar valor
                        </Button>
                      </div>
                    ) : null}
                    <p
                      className={`mt-2 text-xs font-bold uppercase ${
                        p.status_pagamento === "pago" || p.pago
                          ? "text-accent"
                          : p.status_pagamento === "parcial"
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-danger"
                      }`}
                    >
                      {statusLabel(p.status_pagamento)}
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
          {filteredParticipants.length === 0 ? (
            <p className="text-sm text-primary/50 dark:text-slate-500">
              Nenhum participante neste filtro.
            </p>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
