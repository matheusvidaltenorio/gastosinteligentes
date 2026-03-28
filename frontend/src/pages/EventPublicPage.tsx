import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PublicEventShell } from "@/components/layout/PublicEventShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  fetchSplitEventByCode,
  setParticipantPaidPublic,
} from "@/services/events.service";
import { getApiErrorMessage } from "@/services/api";
import type { EventPublicParticipant, SplitEventPublic } from "@/types/api";
import { formatBRL } from "@/utils/format";
import { useToast } from "@/hooks/useToast";

function waUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function statusClass(s: EventPublicParticipant): string {
  if (s.status_pagamento === "pago" || s.pago)
    return "border-accent/40 bg-accent/10 dark:border-accent/30";
  if (s.status_pagamento === "parcial")
    return "border-amber-400/40 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/30";
  return "border-danger/25 bg-danger/5 dark:border-danger/30 dark:bg-danger/10";
}

export function EventPublicPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [searchParams] = useSearchParams();
  const focusParticipantId = searchParams.get("p")?.trim() || null;
  const { showToast } = useToast();
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

  useEffect(() => {
    if (!data?.participants?.length || !focusParticipantId) return;
    const found = data.participants.some((x) => x.id === focusParticipantId);
    if (!found) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`participante-${focusParticipantId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add(
        "ring-2",
        "ring-accent",
        "ring-offset-2",
        "dark:ring-offset-slate-900"
      );
    }, 350);
    return () => window.clearTimeout(t);
  }, [data, focusParticipantId]);

  const shareMsg = useMemo(() => {
    if (!data) return "";
    return (
      `Confira o evento *${data.nome}*.\n` +
      `Código: ${data.codigo}\n` +
      `Link: ${data.link_publico || window.location.href}`
    );
  }, [data]);

  async function copyPix(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      showToast("Código PIX copiado.", "success");
    } catch {
      showToast("Não foi possível copiar.", "error");
    }
  }

  async function togglePaid(p: EventPublicParticipant) {
    if (!codigo || data?.status !== "aberto") return;
    setBusyId(p.id);
    try {
      const updated = await setParticipantPaidPublic(codigo, p.id, !p.pago);
      setData((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map((x) =>
                x.id === updated.id
                  ? {
                      ...x,
                      pago: updated.pago,
                      status_pagamento:
                        (updated.status_pagamento as EventPublicParticipant["status_pagamento"]) ??
                        x.status_pagamento,
                      valor_pago: updated.valor_pago ?? x.valor_pago,
                    }
                  : x
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

  const canEdit = data.status === "aberto";

  return (
    <PublicEventShell title={data.nome}>
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
        {data.descricao ? (
          <p className="text-sm text-primary/75 dark:text-slate-300">{data.descricao}</p>
        ) : null}
        <p className="mt-2 text-sm text-primary/60 dark:text-slate-400">
          Valor total do evento
        </p>
        <p className="text-2xl font-bold text-primary dark:text-white">
          {formatBRL(data.valor_total)}
        </p>
        <p className="mt-2 text-xs text-primary/50 dark:text-slate-500">
          Código: <span className="font-mono font-semibold">{data.codigo}</span>
          {" · "}
          Divisão: {data.tipo_divisao}
        </p>
        {!canEdit ? (
          <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
            Este evento foi encerrado; o link público é só para consulta.
          </p>
        ) : null}
        <div className="mt-4">
          <a
            href={waUrl(shareMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            Compartilhar no WhatsApp
          </a>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary/50 dark:text-slate-400">
        Participantes
      </h2>
      <ul className="space-y-3">
        {data.participants.map((p) => (
          <li
            key={p.id}
            id={`participante-${p.id}`}
            className={`flex flex-col gap-3 rounded-xl border p-4 transition-shadow sm:flex-row sm:items-start sm:justify-between ${statusClass(p)}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-primary dark:text-white">{p.nome}</p>
              <p className="text-sm text-primary/70 dark:text-slate-300">
                Devido: <strong>{formatBRL(p.valor_devido)}</strong>
                {" · "}
                Pago: <strong>{formatBRL(p.valor_pago)}</strong>
              </p>
              <p
                className={`mt-1 text-xs font-bold uppercase ${
                  p.status_pagamento === "pago" || p.pago
                    ? "text-accent"
                    : p.status_pagamento === "parcial"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-danger"
                }`}
              >
                {p.status_pagamento === "pago" || p.pago
                  ? "Pago"
                  : p.status_pagamento === "parcial"
                    ? "Parcial"
                    : "Pendente"}
              </p>
              {p.pix_qr_code_base64 ? (
                <div className="mt-3">
                  <p className="text-xs font-medium text-primary/60 dark:text-slate-400">
                    QR Code (demonstração — não é PIX real)
                  </p>
                  <img
                    src={`data:image/png;base64,${p.pix_qr_code_base64}`}
                    alt="QR PIX"
                    className="mt-2 max-h-44 rounded-lg border border-primary/10 bg-white p-2 dark:border-white/10"
                  />
                </div>
              ) : null}
              {p.pix_code ? (
                <div className="mt-2">
                  <p className="text-xs font-medium text-primary/70 dark:text-slate-300">
                    Código PIX (copia e cola no banco)
                  </p>
                  <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-primary/10 bg-primary/[0.03] p-2 font-mono text-[11px] leading-relaxed text-primary/90 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                    {p.pix_code}
                  </pre>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 min-h-9 text-xs"
                    onClick={() => copyPix(p.pix_code!)}
                  >
                    Copiar código PIX completo
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-primary/45 dark:text-slate-500">
                  O organizador pode gerar um PIX de demonstração na área logada.
                </p>
              )}
            </div>
            <Button
              type="button"
              variant={p.pago ? "outline" : "accent"}
              className="min-h-10 shrink-0 text-sm"
              disabled={busyId === p.id || !canEdit}
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
