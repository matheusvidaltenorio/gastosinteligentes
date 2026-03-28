import { useCallback, useEffect, useState } from "react";
import type { FinancialGoal } from "@/types/api";
import { sanitizeFinancialGoal } from "@/utils/goalMoney";

const STORAGE_KEY = "cgi_financial_goals";

function loadGoals(): FinancialGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const list = parsed.filter(
      (g): g is FinancialGoal =>
        g &&
        typeof g === "object" &&
        typeof (g as FinancialGoal).id === "string" &&
        typeof (g as FinancialGoal).targetAmount === "string"
    );
    const sanitized = list.map(sanitizeFinancialGoal);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      /* ignore */
    }
    return sanitized;
  } catch {
    return [];
  }
}

function saveGoals(goals: FinancialGoal[]) {
  try {
    const cleaned = goals.map(sanitizeFinancialGoal);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    /* ignore */
  }
}

export function useFinancialGoals() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);

  useEffect(() => {
    setGoals(loadGoals());
  }, []);

  const persist = useCallback((next: FinancialGoal[]) => {
    const cleaned = next.map(sanitizeFinancialGoal);
    setGoals(cleaned);
    saveGoals(cleaned);
  }, []);

  const addGoal = useCallback(
    (input: Omit<FinancialGoal, "id" | "createdAt">) => {
      const g: FinancialGoal = sanitizeFinancialGoal({
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
      persist([...goals, g]);
      return g;
    },
    [goals, persist]
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Pick<FinancialGoal, "title" | "targetAmount" | "currentAmount">>) => {
      persist(
        goals.map((g) => (g.id === id ? { ...g, ...patch } : g))
      );
    },
    [goals, persist]
  );

  const removeGoal = useCallback(
    (id: string) => {
      persist(goals.filter((g) => g.id !== id));
    },
    [goals, persist]
  );

  return { goals, addGoal, updateGoal, removeGoal };
}
