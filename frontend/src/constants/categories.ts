import type { TipoTransacao } from "@/types/api";

/** Categorias fixas para receitas (dropdown). */
export const CATEGORIAS_RECEITA = [
  "Salário",
  "Freelance / autônomo",
  "Investimentos e dividendos",
  "Vendas",
  "Aluguel recebido",
  "Reembolsos",
  "Bônus e gratificações",
  "Outros (receita)",
] as const;

/** Categorias fixas para despesas (dropdown). */
export const CATEGORIAS_DESPESA = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Assinaturas e serviços",
  "Impostos e taxas",
  "Pets",
  "Presentes e doações",
  "Outros (despesa)",
] as const;

export function categoriasPorTipo(tipo: TipoTransacao): string[] {
  return tipo === "RECEITA"
    ? [...CATEGORIAS_RECEITA]
    : [...CATEGORIAS_DESPESA];
}

/** Todas as categorias (filtros / relatórios). */
export const TODAS_CATEGORIAS: string[] = Array.from(
  new Set<string>([...CATEGORIAS_RECEITA, ...CATEGORIAS_DESPESA])
).sort((a, b) => a.localeCompare(b, "pt-BR"));
