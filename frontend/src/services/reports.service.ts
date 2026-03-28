import { api } from "@/services/api";
import type { SpendingByCategoryResponse } from "@/types/api";

export type ReportDateQuery = { start_date?: string; end_date?: string };

export async function fetchSpendingByCategory(
  params?: ReportDateQuery
): Promise<SpendingByCategoryResponse> {
  const { data } = await api.get<SpendingByCategoryResponse>(
    "/reports/spending-by-category",
    { params }
  );
  return data;
}
