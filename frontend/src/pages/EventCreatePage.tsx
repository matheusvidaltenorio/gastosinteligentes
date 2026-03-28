import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createSplitEvent } from "@/services/events.service";
import { getApiErrorMessage } from "@/services/api";
import { useToast } from "@/hooks/useToast";

export function EventCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [nome, setNome] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [names, setNames] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);

  function addRow() {
    setNames((n) => [...n, ""]);
  }

  function removeRow(i: number) {
    setNames((n) => n.filter((_, j) => j !== i));
  }

  function setNameRow(i: number, v: string) {
    setNames((n) => n.map((x, j) => (j === i ? v : x)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const participantes = names.map((x) => x.trim()).filter(Boolean);
    if (!nome.trim()) {
      showToast("Informe o nome do evento.", "error");
      return;
    }
    if (participantes.length === 0) {
      showToast("Informe ao menos um participante com nome.", "error");
      return;
    }
    setSaving(true);
    try {
      const ev = await createSplitEvent({
        nome: nome.trim(),
        valor_total: valorTotal.replace(",", "."),
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

  return (
    <AppShell title="Novo evento">
      <div className="mx-auto max-w-xl">
        <Card
          title="Criar evento"
          subtitle="O valor total será dividido em partes iguais (ajuste depois na tela do evento, se quiser)."
        >
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Nome do evento"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Churrasco do fim de semana"
              required
            />
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
              <p className="mb-2 text-sm font-medium text-primary/80 dark:text-white/80">
                Participantes (um por linha)
              </p>
              <div className="space-y-2">
                {names.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={row}
                      onChange={(e) => setNameRow(i, e.target.value)}
                      placeholder={`Nome ${i + 1}`}
                      className="min-h-11 w-full flex-1 rounded-xl border border-primary/10 bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
                    />
                    {names.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11 shrink-0 px-3 dark:text-slate-200 dark:ring-white/20"
                        onClick={() => removeRow(i)}
                      >
                        ✕
                      </Button>
                    ) : null}
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
