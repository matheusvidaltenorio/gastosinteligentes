import { api } from "@/services/api";
import type { Balance } from "@/types/api";

export type BalanceQuery = { start_date?: string; end_date?: string };

export async function fetchBalance(params?: BalanceQuery): Promise<Balance> {
  const { data } = await api.get<Balance>("/balance", { params });
  return data;
}
