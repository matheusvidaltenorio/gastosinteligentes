import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { categoriasPorTipo } from "@/constants/categories";
import * as txApi from "@/services/transactions.service";
import type { TipoTransacao, Transaction } from "@/types/api";
import { getApiErrorMessage } from "@/services/api";
import { todayISO } from "@/utils/format";
import { useToast } from "@/hooks/useToast";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Transaction | null;
};

export function TransactionModal({ open, onClose, onSaved, initial }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<TipoTransacao>("DESPESA");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const opcoesCategoria = useMemo(() => {
    const base = categoriasPorTipo(tipo);
    if (categoria && !base.includes(categoria)) {
      return [categoria, ...base];
    }
    return base;
  }, [tipo, categoria]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (initial) {
      setTipo(initial.tipo);
      setValor(String(initial.valor));
      setCategoria(initial.categoria);
      setDescricao(initial.descricao ?? "");
      setData(initial.data);
    } else {
      setTipo("DESPESA");
      setValor("");
      setCategoria("");
      setDescricao("");
      setData(todayISO());
    }
  }, [open, initial]);

  function onTipoChange(next: TipoTransacao) {
    setTipo(next);
    setCategoria((prev) => {
      const opts = categoriasPorTipo(next);
      return opts.includes(prev) ? prev : "";
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const v = parseFloat(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) e.valor = "Informe um valor maior que zero.";
    if (!categoria.trim()) e.categoria = "Escolha uma categoria na lista.";
    if (!data) e.data = "Escolha uma data na agenda.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        tipo,
        valor: String(parseFloat(valor.replace(",", ".")).toFixed(2)),
        categoria: categoria.trim(),
        descricao: descricao.trim(),
        data,
      };
      if (initial) {
        await txApi.updateTransaction(initial.id, payload);
        showToast("Transação atualizada.", "success");
      } else {
        await txApi.createTransaction(payload);
        showToast("Transação criada.", "success");
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={initial ? "Editar transação" : "Nova transação"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            type="submit"
            form="tx-form"
            loading={loading}
          >
            {initial ? "Salvar" : "Adicionar"}
          </Button>
        </>
      }
    >
      <form id="tx-form" className="space-y-4" onSubmit={handleSubmit}>
        <Select
          label="Tipo"
          value={tipo}
          onChange={(e) => onTipoChange(e.target.value as TipoTransacao)}
        >
          <option value="DESPESA">Despesa</option>
          <option value="RECEITA">Receita</option>
        </Select>
        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          min="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          error={errors.valor}
          placeholder="0,00"
        />
        <Select
          label="Categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          error={errors.categoria}
        >
          <option value="">Selecione uma categoria</option>
          {opcoesCategoria.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <DatePickerField
          id="tx-modal-data"
          label="Data"
          value={data}
          onChange={setData}
          error={errors.data}
        />
        <TextArea
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Opcional"
        />
      </form>
    </Modal>
  );
}
