import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GoalProgress } from "@/components/fintech/GoalProgress";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { useToast } from "@/hooks/useToast";
import { useNavigate } from "react-router-dom";
import {
  addBRL,
  isGoalComplete,
  MAX_GOAL_BRL,
  messageExceedsGoal,
  parseNonNegativeBRL,
  parsePositiveBRL,
  parseTargetBRL,
} from "@/utils/goalMoney";
import { formatBRL } from "@/utils/format";

export function GoalsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { goals, addGoal, updateGoal, removeGoal } = useFinancialGoals();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [progressEditId, setProgressEditId] = useState<string | null>(null);
  const [progressEditValue, setProgressEditValue] = useState("");
  const progressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (progressEditId) {
      progressInputRef.current?.focus();
      progressInputRef.current?.select();
    }
  }, [progressEditId]);

  function closeProgressEdit() {
    setProgressEditId(null);
    setProgressEditValue("");
  }

  function applyAddToProgress(
    goalId: string,
    currentStored: string,
    targetStored: string
  ) {
    const add = parsePositiveBRL(progressEditValue);
    if (add == null) {
      showToast(
        `Informe um valor válido entre 0,01 e ${formatBRL(MAX_GOAL_BRL)}.`,
        "error"
      );
      return;
    }
    const cur = parseNonNegativeBRL(currentStored) ?? 0;
    const target = parseTargetBRL(targetStored);
    if (target == null) {
      showToast("Meta com valor inválido. Edite ou recrie a meta.", "error");
      return;
    }
    const next = addBRL(cur, add);
    const nextCents = Math.round(next * 100);
    const targetCents = Math.round(target * 100);
    if (nextCents > targetCents) {
      showToast(messageExceedsGoal(target, cur), "error");
      return;
    }
    updateGoal(goalId, { currentAmount: next.toFixed(2) });
    closeProgressEdit();
    showToast("Valor somado ao progresso.", "success");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Informe o objetivo da meta.", "error");
      return;
    }
    const t = parseTargetBRL(target);
    if (t == null) {
      showToast(
        `Informe um valor de meta entre 0,01 e ${formatBRL(MAX_GOAL_BRL)}.`,
        "error"
      );
      return;
    }
    const c = parseNonNegativeBRL(current);
    if (c == null) {
      showToast("“Já juntou” inválido. Use zero ou um valor positivo.", "error");
      return;
    }
    if (c > t) {
      showToast(
        `“Já juntou” não pode ser maior que a meta (${formatBRL(t)}).`,
        "error"
      );
      return;
    }
    addGoal({
      title: title.trim(),
      targetAmount: t.toFixed(2),
      currentAmount: c.toFixed(2),
    });
    showToast("Meta criada.", "success");
    setTitle("");
    setTarget("");
    setCurrent("");
  }

  return (
    <AppShell title="Metas financeiras">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card
          title="Nova meta"
          subtitle="Ex.: juntar R$ 5.000 para viagem — os dados ficam neste dispositivo"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Objetivo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Reserva de emergência"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Valor da meta (R$)"
                type="text"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="5000"
                required
              />
              <Input
                label="Já juntou (R$)"
                type="text"
                inputMode="decimal"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="0"
              />
            </div>
            <Button type="submit" variant="accent" className="min-h-12 w-full sm:w-auto">
              Criar meta
            </Button>
          </form>
        </Card>

        <Card title="Suas metas" subtitle="Acompanhe o progresso">
          {goals.length === 0 ? (
            <EmptyState
              title="Nenhuma meta ainda"
              description="Defina um valor e acompanhe quanto falta para conquistar."
              actionLabel="Ver transações"
              onAction={() => navigate("/transactions")}
              icon="🎯"
            />
          ) : (
            <ul className="space-y-4">
              {goals.map((g) => (
                <li key={g.id} className="space-y-3">
                  <GoalProgress goal={g} />
                  <div className="flex flex-wrap items-stretch gap-2">
                    {progressEditId === g.id ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          ref={progressInputRef}
                          type="text"
                          inputMode="decimal"
                          value={progressEditValue}
                          onChange={(e) => setProgressEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              applyAddToProgress(g.id, g.currentAmount, g.targetAmount);
                            }
                            if (e.key === "Escape") {
                              closeProgressEdit();
                            }
                          }}
                          placeholder="Quanto adicionar (R$)?"
                          aria-label="Valor em reais a somar ao progresso"
                          className="min-h-11 w-full min-w-0 flex-1 rounded-xl border border-primary/10 bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm transition placeholder:text-primary/40 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-white/15 dark:bg-slate-900 dark:text-white dark:placeholder:text-white/40 sm:max-w-xs"
                        />
                        <div className="flex flex-wrap gap-2 sm:shrink-0">
                          <Button
                            variant="accent"
                            className="min-h-11 text-sm sm:w-auto"
                            type="button"
                            onClick={() =>
                              applyAddToProgress(g.id, g.currentAmount, g.targetAmount)
                            }
                          >
                            Adicionar
                          </Button>
                          <Button
                            variant="ghost"
                            className="min-h-11 text-sm dark:text-slate-200 dark:ring-white/20 dark:hover:bg-white/10"
                            type="button"
                            onClick={closeProgressEdit}
                          >
                            Voltar
                          </Button>
                        </div>
                      </div>
                    ) : isGoalComplete(g.currentAmount, g.targetAmount) ? (
                      <p className="flex min-h-11 items-center text-sm text-primary/60 dark:text-slate-400">
                        Meta atingida
                      </p>
                    ) : (
                      <Button
                        variant="outline"
                        className="min-h-11 text-sm"
                        type="button"
                        onClick={() => {
                          setProgressEditId(g.id);
                          setProgressEditValue("");
                        }}
                      >
                        Atualizar progresso
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      className="min-h-11 text-sm"
                      type="button"
                      onClick={() => {
                        if (confirm("Remover esta meta?")) {
                          removeGoal(g.id);
                          showToast("Meta removida.", "success");
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
