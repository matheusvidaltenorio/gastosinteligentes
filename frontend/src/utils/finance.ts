import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import type { Transaction } from "@/types/api";

export type AlertTone = "danger" | "warning" | "success" | "neutral";

export type SmartAlert = {
  id: string;
  title: string;
  message: string;
  tone: AlertTone;
};

export type SubscriptionGuess = {
  id: string;
  label: string;
  monthlyEstimate: number;
  occurrences: number;
  lastDate: string;
};

export type ForecastResult = {
  currentSaldo: number;
  avgDailyExpense: number;
  avgDailyNet: number;
  daysToZero: number | null;
  message: string;
};

/** Converte string monetária da API para número com 2 casas (evita lixo de float). */
function parseVal(t: Transaction): number {
  const n = parseFloat(t.valor);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function addMoney(a: number, b: number): number {
  return Math.round((a + b) * 100) / 100;
}

function isExpense(t: Transaction): boolean {
  return t.tipo === "DESPESA";
}

/** Janela do mês atual e do mês anterior com o mesmo “comprimento” (dias desde o dia 1). */
export function alignedMonthWindows(reference = new Date()) {
  const currStart = startOfMonth(reference);
  const currEnd = reference;
  const days = Math.max(0, differenceInCalendarDays(currEnd, currStart));
  const prevMonthRef = subMonths(reference, 1);
  const prevStart = startOfMonth(prevMonthRef);
  const prevEnd = addDays(prevStart, days);
  return {
    current: {
      start: format(currStart, "yyyy-MM-dd"),
      end: format(currEnd, "yyyy-MM-dd"),
    },
    previous: {
      start: format(prevStart, "yyyy-MM-dd"),
      end: format(prevEnd, "yyyy-MM-dd"),
    },
  };
}

/** Soma despesas no intervalo [start, end] inclusive (ISO dates). */
export function sumExpensesInRange(
  txs: Transaction[],
  startIso: string,
  endIso: string
): number {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  let sum = 0;
  for (const t of txs) {
    if (!isExpense(t)) continue;
    const d = parseISO(t.data);
    if (d >= start && d <= end) sum = addMoney(sum, parseVal(t));
  }
  return sum;
}

/** Pontos para gráfico de linha: despesas por dia nos últimos `dayCount` dias. */
export function spendingSeriesLastDays(
  txs: Transaction[],
  dayCount: number,
  reference = new Date()
): { label: string; total: number; iso: string }[] {
  const end = reference;
  const start = subDays(end, dayCount - 1);
  const byDay = new Map<string, number>();
  for (let i = 0; i < dayCount; i++) {
    const d = format(addDays(start, i), "yyyy-MM-dd");
    byDay.set(d, 0);
  }
  for (const t of txs) {
    if (!isExpense(t)) continue;
    const d = t.data;
    if (!byDay.has(d)) continue;
    byDay.set(d, addMoney(byDay.get(d) ?? 0, parseVal(t)));
  }
  return Array.from(byDay.entries()).map(([iso, total]) => ({
    iso,
    label: format(parseISO(iso), "dd/MM"),
    total,
  }));
}

/** Top categorias de despesa no período (por transações). */
export function topExpenseCategories(
  txs: Transaction[],
  startIso: string,
  endIso: string,
  limit: number
): { categoria: string; total: number }[] {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const map = new Map<string, number>();
  for (const t of txs) {
    if (!isExpense(t)) continue;
    const d = parseISO(t.data);
    if (d < start || d > end) continue;
    const c = t.categoria || "Outros";
    map.set(c, addMoney(map.get(c) ?? 0, parseVal(t)));
  }
  return [...map.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Média de gasto por dia (últimos `windowDays` dias, incluindo dias sem gasto). */
export function averageDailyExpense(
  txs: Transaction[],
  windowDays: number,
  reference = new Date()
): number {
  const end = format(reference, "yyyy-MM-dd");
  const start = format(subDays(reference, windowDays - 1), "yyyy-MM-dd");
  const sum = sumExpensesInRange(txs, start, end);
  return windowDays > 0 ? sum / windowDays : 0;
}

/** Saldo líquido médio por dia no período (receitas - despesas) / dias no intervalo. */
export function averageDailyNet(
  txs: Transaction[],
  startIso: string,
  endIso: string
): number {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  let net = 0;
  for (const t of txs) {
    const d = parseISO(t.data);
    if (d < start || d > end) continue;
    const v = parseVal(t);
    net = addMoney(net, t.tipo === "RECEITA" ? v : -v);
  }
  return Math.round((net / days) * 100) / 100;
}

export function buildForecast(
  currentSaldo: number,
  txs: Transaction[],
  windowDays = 30
): ForecastResult {
  const end = new Date();
  const startIso = format(subDays(end, windowDays - 1), "yyyy-MM-dd");
  const endIso = format(end, "yyyy-MM-dd");
  const avgDailyExpense = averageDailyExpense(txs, windowDays, end);
  const avgDailyNet = averageDailyNet(txs, startIso, endIso);

  let daysToZero: number | null = null;
  let message: string;

  if (currentSaldo <= 0) {
    message =
      "Saldo atual não é positivo. Registre receitas ou reduza gastos para voltar ao azul.";
  } else if (avgDailyExpense <= 0) {
    message =
      "Sem padrão de gasto recente. Ao registrar despesas, mostramos uma previsão aqui.";
  } else {
    daysToZero = Math.max(1, Math.floor(currentSaldo / avgDailyExpense));
    if (avgDailyNet >= 0) {
      message = `Média de gasto diário (últimos ${windowDays} dias): seu saldo tende a se manter ou subir com novas receitas.`;
    } else {
      message = `Neste ritmo (~${avgDailyExpense.toFixed(0)} / dia em despesas), seu saldo pode chegar a zero em cerca de ${daysToZero} dia(s).`;
    }
  }

  return {
    currentSaldo,
    avgDailyExpense,
    avgDailyNet,
    daysToZero,
    message,
  };
}

export function buildSmartAlerts(
  txs: Transaction[],
  windows: ReturnType<typeof alignedMonthWindows>
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  const now = new Date();
  const wEnd = format(now, "yyyy-MM-dd");
  const wStart = format(subDays(now, 6), "yyyy-MM-dd");
  const prevWEnd = format(subDays(now, 7), "yyyy-MM-dd");
  const prevWStart = format(subDays(now, 13), "yyyy-MM-dd");

  const weekNow = sumExpensesInRange(txs, wStart, wEnd);
  const weekPrev = sumExpensesInRange(txs, prevWStart, prevWEnd);

  if (weekPrev > 0 && weekNow > weekPrev * 1.3) {
    const pct = Math.round(((weekNow - weekPrev) / weekPrev) * 100);
    alerts.push({
      id: "week-up",
      title: "Gastos da semana",
      message: `Você gastou cerca de ${pct}% a mais esta semana em relação à semana anterior.`,
      tone: "danger",
    });
  } else if (weekPrev > 0 && weekNow < weekPrev * 0.85) {
    alerts.push({
      id: "week-down",
      title: "Bom sinal",
      message: "Gastos desta semana estão abaixo da semana passada. Continue assim.",
      tone: "success",
    });
  }

  const currExp = sumExpensesInRange(
    txs,
    windows.current.start,
    windows.current.end
  );
  const prevExp = sumExpensesInRange(
    txs,
    windows.previous.start,
    windows.previous.end
  );

  if (prevExp > 50 && currExp < prevExp * 0.9) {
    alerts.push({
      id: "month-save",
      title: "Economia no período",
      message:
        "Parabéns! No período equivalente do mês passado você gastou mais — você está no caminho de economizar mais este mês.",
      tone: "success",
    });
  }

  const catCurr = topExpenseCategories(
    txs,
    windows.current.start,
    windows.current.end,
    1
  )[0];
  const catPrev = topExpenseCategories(
    txs,
    windows.previous.start,
    windows.previous.end,
    3
  );
  if (catCurr && catPrev.length) {
    const prevTop = catPrev[0];
    if (catCurr.categoria === prevTop.categoria && catCurr.total > prevTop.total * 1.25) {
      alerts.push({
        id: "cat-spike",
        title: "Categoria em alta",
        message: `A categoria “${catCurr.categoria}” está acima do normal em relação ao mesmo período do mês passado.`,
        tone: "warning",
      });
    }
  }

  return alerts;
}

function normalizeKey(t: Transaction): string {
  const d = (t.descricao || "").trim().toLowerCase();
  if (d.length >= 2) return `d:${d}`;
  return `c:${(t.categoria || "").toLowerCase()}`;
}

/** Heurística: mesma descrição/categoria + mesmo valor em meses diferentes. */
export function detectRecurringSubscriptions(
  txs: Transaction[],
  minOccurrences = 2
): SubscriptionGuess[] {
  const expenses = txs.filter(isExpense);
  const groups = new Map<string, Transaction[]>();
  for (const t of expenses) {
    const key = `${normalizeKey(t)}|${t.valor}`;
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }

  const result: SubscriptionGuess[] = [];
  for (const [gkey, list] of groups) {
    if (list.length < minOccurrences) continue;
    const months = new Set(list.map((t) => t.data.slice(0, 7)));
    if (months.size < 2) continue;
    list.sort((a, b) => a.data.localeCompare(b.data));
    const last = list[list.length - 1];
    const label =
      last.descricao?.trim() ||
      last.categoria ||
      "Recorrente";
    result.push({
      id: gkey,
      label,
      monthlyEstimate: parseVal(last),
      occurrences: list.length,
      lastDate: last.data,
    });
  }

  result.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
  return result;
}