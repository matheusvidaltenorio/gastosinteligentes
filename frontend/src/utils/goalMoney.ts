import { formatBRL } from "@/utils/format";
import type { FinancialGoal } from "@/types/api";

/** Alinhado ao teto de transações no backend (evita valores absurdos no armazenamento local). */
export const MAX_GOAL_BRL = 9_999_999_999.99;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeInput(raw: string): string {
  return raw.trim().replace(/\s/g, "").replace(",", ".");
}

/**
 * Valor estritamente positivo (ex.: valor a adicionar).
 * Rejeita notação científica e strings claramente inválidas.
 */
export function parsePositiveBRL(input: string): number | null {
  const s = normalizeInput(input);
  if (!s || /[eE]/.test(s)) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > MAX_GOAL_BRL) return null;
  return round2(n);
}

/**
 * Valor >= 0 (ex.: "já juntou" ou progresso atual). Vazio = 0.
 */
export function parseNonNegativeBRL(input: string): number | null {
  const s = normalizeInput(input);
  if (!s) return 0;
  if (/[eE]/.test(s)) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n > MAX_GOAL_BRL) return null;
  return round2(n);
}

/** Valor da meta: > 0 e <= teto. */
export function parseTargetBRL(input: string): number | null {
  const s = normalizeInput(input);
  if (!s || /[eE]/.test(s)) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > MAX_GOAL_BRL) return null;
  return round2(n);
}

export function addBRL(a: number, b: number): number {
  return round2(a + b);
}

/** Corrige metas já salvas com progresso acima da meta ou valores fora do limite. */
export function sanitizeFinancialGoal(g: FinancialGoal): FinancialGoal {
  const tgtRaw = parseFloat(String(g.targetAmount).replace(",", "."));
  const curRaw = parseFloat(String(g.currentAmount).replace(",", "."));
  const targetOk = Number.isFinite(tgtRaw) && tgtRaw > 0;
  if (!targetOk) return g;

  let target = round2(Math.min(tgtRaw, MAX_GOAL_BRL));
  let current = Number.isFinite(curRaw) && curRaw >= 0 ? round2(curRaw) : 0;
  current = Math.min(current, MAX_GOAL_BRL);
  if (current > target) current = target;

  return {
    ...g,
    targetAmount: target.toFixed(2),
    currentAmount: current.toFixed(2),
  };
}

export function maxAddableBRL(current: number, target: number): number {
  return Math.max(0, round2(target - current));
}

export function isGoalComplete(currentAmountStr: string, targetAmountStr: string): boolean {
  const cur = parseNonNegativeBRL(currentAmountStr) ?? 0;
  const tgt = parseTargetBRL(targetAmountStr);
  if (tgt == null) return false;
  return Math.round(cur * 100) >= Math.round(tgt * 100);
}

export function messageExceedsGoal(target: number, current: number): string {
  const room = maxAddableBRL(current, target);
  if (room <= 0) {
    return "Esta meta já foi atingida. Não é possível adicionar mais ao progresso.";
  }
  return `Esse valor ultrapassa a meta de ${formatBRL(target)}. Você pode adicionar no máximo ${formatBRL(room)}.`;
}
