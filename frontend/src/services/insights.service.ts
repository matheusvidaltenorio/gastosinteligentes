import { api } from "@/services/api";
import type { InsightsResponse } from "@/types/api";

export type InsightsQuery = { start_date?: string; end_date?: string };

export async function fetchInsights(params?: InsightsQuery): Promise<InsightsResponse> {
  const { data } = await api.get<InsightsResponse>("/insights", { params });
  return data;
}
