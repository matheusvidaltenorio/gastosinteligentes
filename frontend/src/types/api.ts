export type TipoTransacao = "RECEITA" | "DESPESA";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
}

export interface User {
  id: number;
  nome: string;
  email: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  tipo: TipoTransacao;
  valor: string;
  categoria: string;
  descricao: string;
  data: string;
}

export interface Balance {
  total_receitas: string;
  total_despesas: string;
  saldo_final: string;
}

export interface InsightsResponse {
  periodo: { inicio: string | null; fim: string | null };
  dia_da_semana_que_mais_gasta: {
    dia_da_semana: string;
    total_gasto: string;
  } | null;
  categoria_com_maior_gasto: {
    categoria: string;
    total_gasto: string;
  } | null;
  media_gastos_por_dia_com_despesa: string;
  totais: {
    total_receitas: string;
    total_despesas: string;
    saldo: string;
  };
  alerta: string | null;
}

export interface SpendingByCategoryItem {
  categoria: string;
  total: string;
}

export interface SpendingByCategoryResponse {
  itens: SpendingByCategoryItem[];
}

export interface ApiErrorBody {
  error?: string;
  detail?: string;
  details?: unknown;
}

/** Meta financeira (persistida no dispositivo; sem endpoint na API). */
export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: string;
  currentAmount: string;
  createdAt: string;
}
