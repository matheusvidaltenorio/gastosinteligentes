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

/** Participante de um evento de divisão de gastos. */
export interface EventParticipant {
  id: string;
  nome: string;
  valor_devido: string;
  pago: boolean;
  created_at?: string;
}

/** Evento criado pelo usuário (resposta autenticada). */
export interface SplitEventDetail {
  id: number;
  nome: string;
  valor_total: string;
  codigo: string;
  user_id: number;
  created_at: string;
  participants: EventParticipant[];
}

export interface SplitEventListItem {
  id: number;
  nome: string;
  valor_total: string;
  codigo: string;
  created_at: string;
  participantes_count: number;
}

/** Resposta pública (sem login). */
export interface SplitEventPublic {
  nome: string;
  codigo: string;
  valor_total: string;
  participants: EventParticipant[];
}
