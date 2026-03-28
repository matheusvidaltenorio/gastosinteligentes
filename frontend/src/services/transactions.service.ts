import { api } from "@/services/api";
import type { TipoTransacao, Transaction } from "@/types/api";

export interface TransactionFilters {
  start_date?: string;
  end_date?: string;
  categoria?: string;
  tipo?: TipoTransacao | "";
}

function buildQuery(f?: TransactionFilters): string {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.start_date) p.set("start_date", f.start_date);
  if (f.end_date) p.set("end_date", f.end_date);
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.tipo) p.set("tipo", f.tipo);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function fetchTransactions(
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const { data } = await api.get<Transaction[]>(
    `/transactions${buildQuery(filters)}`
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchTransaction(id: number): Promise<Transaction> {
  const { data } = await api.get<Transaction>(`/transactions/${id}`);
  return data;
}

export interface CreateTransactionPayload {
  tipo: TipoTransacao;
  valor: string;
  categoria: string;
  descricao: string;
  data: string;
}

export async function createTransaction(
  payload: CreateTransactionPayload
): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/transactions", payload);
  return data;
}

export async function updateTransaction(
  id: number,
  payload: Partial<CreateTransactionPayload>
): Promise<Transaction> {
  const { data } = await api.put<Transaction>(`/transactions/${id}`, payload);
  return data;
}

export async function deleteTransaction(id: number): Promise<void> {
  await api.delete(`/transactions/${id}`);
}
