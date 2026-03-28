import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createSplitEvent } from "@/services/events.service";
import { getApiErrorMessage } from "@/services/api";
import { useToast } from "@/hooks/useToast";
import type { TipoDivisaoEvento } from "@/types/api";
import { formatBRL } from "@/utils/format";

type Row = { nome: string; telefone: string; valor: string; peso: string };

function parseMoney(raw: string): number {
  const s = raw.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

const emptyRow = (): Row => ({
  nome: "",
  telefone: "",
  valor: "",
  peso: "1",
});

export function EventCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [tipoDivisao, setTipoDivisao] = useState<TipoDivisaoEvento>("igual");
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()]);
  const [saving, setSaving] = useState(false);

  const manualSumHint = useMemo(() => {
    if (tipoDivisao !== "manual") return null;
    const total = parseMoney(valorTotal);
    if (!Number.isFinite(total) || total <= 0) return null;
    let sum = 0;
    for (const r of rows) {
      const v = parseMoney(r.valor);
      if (Number.isFinite(v)) sum += v;
    }
    const diff = Math.round((total - sum) * 100) / 100;
    if (Math.abs(diff) < 0.005) return { ok: true as const, diff: 0 };
    if (diff > 0)
      return {
        ok: false as const,
        msg: `Ainda faltam ${formatBRL(diff.toFixed(2))} para distribuir.`,
      };
    return {
      ok: false as const,
      msg: `A divisão excedeu o valor do evento em ${formatBRL(Math.abs(diff).toFixed(2))}.`,
    };
  }, [tipoDivisao, valorTotal, rows]);

  function addRow() {
    setRows((r) => [...r, emptyRow()]);
  }

  function removeRow(i: number) {
    setRows((r) => (r.length <= 1 ? r : r.filter((_, j) => j !== i)));
  }

  function setRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const vt = parseMoney(valorTotal);
    if (!nome.trim()) {
      showToast("Informe o nome do evento.", "error");
      return;
    }
    if (!Number.isFinite(vt) || vt <= 0) {
      showToast("Informe um valor total válido.", "error");
      return;
    }
    const filled = rows
      .map((r) => ({
        nome: r.nome.trim(),
        telefone: r.telefone.trim(),
        valor: r.valor.trim(),
        peso: r.peso.trim(),
      }))
      .filter((r) => r.nome);
    if (filled.length === 0) {
      showToast("Informe ao menos um participante com nome.", "error");
      return;
    }

    let participantes: Parameters<typeof createSplitEvent>[0]["participantes"];

    if (tipoDivisao === "igual") {
      participantes = filled.map((r) => ({
        nome: r.nome,
        telefone: r.telefone,
      }));
    } else if (tipoDivisao === "manual") {
      const decs: { nome: string; valor_devido: string; telefone: string }[] = [];
      for (const r of filled) {
        const v = parseMoney(r.valor);
        if (!Number.isFinite(v) || v <= 0) {
          showToast(`Valor inválido para ${r.nome}.`, "error");
          return;
        }
        decs.push({
          nome: r.nome,
          valor_devido: v.toFixed(2),
          telefone: r.telefone,
        });
      }
      const sum = decs.reduce((a, x) => a + parseFloat(x.valor_devido), 0);
      if (Math.abs(sum - vt) > 0.02) {
        showToast(
          manualSumHint?.msg ??
            "A soma dos valores deve ser igual ao total do evento.",
          "error"
        );
        return;
      }
      participantes = decs;
    } else {
      participantes = filled.map((r) => {
        const w = parseInt(r.peso, 10);
        return {
          nome: r.nome,
          telefone: r.telefone,
          peso: Number.isFinite(w) && w >= 1 ? w : 1,
        };
      });
    }

    setSaving(true);
    try {
      const ev = await createSplitEvent({
        nome: nome.trim(),
        descricao: descricao.trim(),
        valor_total: vt.toFixed(2),
        tipo_divisao: tipoDivisao,
        participantes,
      });
      showToast("Evento criado.", "success");
      navigate(`/events/${ev.id}`);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  const subtitle =
    tipoDivisao === "igual"
      ? "Divide o total em partes iguais entre os participantes."
      : tipoDivisao === "manual"
        ? "Você define quanto cada pessoa paga. A soma deve fechar com o total."
        : "Informe um peso por pessoa (ex.: 2 paga o dobro de 1).";

  return (
    <AppShell title="Novo evento">
      <div className="mx-auto max-w-xl">
        <Card title="Criar evento" subtitle={subtitle}>
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Nome do evento"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Churrasco do fim de semana"
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary/80 dark:text-white/80">
                Descrição (opcional)
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                placeholder="Detalhes do evento para quem acessar o link público"
                className="w-full rounded-xl border border-primary/10 bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <Input
              label="Valor total (R$)"
              type="text"
              inputMode="decimal"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="300,00"
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary/80 dark:text-white/80">
                Tipo de divisão
              </label>
              <select
                value={tipoDivisao}
                onChange={(e) =>
                  setTipoDivisao(e.target.value as TipoDivisaoEvento)
                }
                className="min-h-11 w-full rounded-xl border border-primary/10 bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
              >
                <option value="igual">Igual entre todos</option>
                <option value="manual">Manual (valor por pessoa)</option>
                <option value="proporcional">Proporcional (por peso)</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-primary/80 dark:text-white/80">
                Participantes
              </p>
              <p className="mb-3 text-xs text-primary/55 dark:text-slate-400">
                Em cada pessoa, use o campo <strong>WhatsApp</strong> com DDD e país (ex.:{" "}
                <span className="font-mono">5511999998888</span>) para abrir a conversa direto
                com ela e enviar valor + PIX pela mensagem.
              </p>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-3 rounded-xl border border-primary/10 p-3 dark:border-white/10"
                  >
                    <div className="min-w-0 space-y-2">
                      <div>
                        <label className="text-xs text-primary/55 dark:text-slate-400">
                          Nome
                        </label>
                        <input
                          type="text"
                          value={row.nome}
                          onChange={(e) => setRow(i, { nome: e.target.value })}
                          placeholder={`Pessoa ${i + 1}`}
                          className="mt-0.5 min-h-10 w-full rounded-lg border border-primary/15 bg-white px-2.5 py-2 text-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-primary/55 dark:text-slate-400">
                          WhatsApp (opcional)
                        </label>
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={row.telefone}
                          onChange={(e) => setRow(i, { telefone: e.target.value })}
                          placeholder="5511999998888"
                          className="mt-0.5 min-h-10 w-full rounded-lg border border-primary/15 bg-white px-2.5 py-2 text-sm font-mono dark:border-white/15 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                    {tipoDivisao === "manual" ? (
                      <div className="w-full min-w-[8rem] sm:w-32">
                        <label className="text-xs text-primary/55 dark:text-slate-400">
                          Valor (R$)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.valor}
                          onChange={(e) => setRow(i, { valor: e.target.value })}
                          placeholder="0,00"
                          className="mt-0.5 min-h-10 w-full rounded-lg border border-primary/15 bg-white px-2.5 py-2 text-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    ) : null}
                    {tipoDivisao === "proporcional" ? (
                      <div className="w-full min-w-[5rem] sm:w-24">
                        <label className="text-xs text-primary/55 dark:text-slate-400">
                          Peso
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={row.peso}
                          onChange={(e) => setRow(i, { peso: e.target.value })}
                          className="mt-0.5 min-h-10 w-full rounded-lg border border-primary/15 bg-white px-2.5 py-2 text-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    ) : null}
                    {rows.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-10 shrink-0 px-3 dark:text-slate-200 dark:ring-white/20"
                        onClick={() => removeRow(i)}
                      >
                        ✕
                      </Button>
                    ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-10 text-sm"
                onClick={addRow}
              >
                + Adicionar participante
              </Button>
              {manualSumHint && !manualSumHint.ok ? (
                <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                  {manualSumHint.msg}
                </p>
              ) : null}
              {manualSumHint?.ok ? (
                <p className="mt-2 text-sm text-accent dark:text-emerald-300">
                  Divisão manual fecha com o total.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="submit"
                variant="accent"
                className="min-h-11"
                loading={saving}
              >
                Criar evento
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => navigate("/events")}
              >
                Voltar
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
