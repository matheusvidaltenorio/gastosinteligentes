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

export type TipoDivisaoEvento = "igual" | "manual" | "proporcional";
export type StatusEvento = "aberto" | "encerrado" | "concluido";
export type StatusPagamento = "pendente" | "pago" | "parcial";

/** Participante de um evento de divisão de gastos. */
export interface EventParticipant {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  valor_devido: string;
  valor_pago?: string;
  status_pagamento?: StatusPagamento;
  peso?: string;
  pago: boolean;
  pix_code?: string | null;
  pix_qr_code_base64?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventResumo {
  valor_total: string;
  total_arrecadado: string;
  total_pendente: string;
  participantes_count: number;
  pagos_count: number;
  parciais_count: number;
  pendentes_count: number;
  percentual_arrecadado: number;
}

/** Evento criado pelo usuário (resposta autenticada). */
export interface SplitEventDetail {
  id: number;
  nome: string;
  descricao: string;
  valor_total: string;
  codigo: string;
  tipo_divisao: TipoDivisaoEvento;
  status: StatusEvento;
  user_id: number;
  created_at: string;
  updated_at?: string | null;
  participants: EventParticipant[];
  resumo: EventResumo;
  link_publico: string;
}

export interface SplitEventListItem {
  id: number;
  nome: string;
  valor_total: string;
  codigo: string;
  tipo_divisao: TipoDivisaoEvento;
  status: StatusEvento;
  created_at: string;
  participantes_count: number;
}

export interface EventPublicParticipant {
  id: string;
  nome: string;
  valor_devido: string;
  valor_pago: string;
  status_pagamento: StatusPagamento;
  pago: boolean;
  pix_code?: string | null;
  pix_qr_code_base64?: string | null;
}

/** Resposta pública (sem login). */
export interface SplitEventPublic {
  nome: string;
  descricao: string;
  codigo: string;
  valor_total: string;
  tipo_divisao: TipoDivisaoEvento;
  status: StatusEvento;
  participants: EventPublicParticipant[];
  link_publico: string;
}

export type ParticipantInput =
  | string
  | {
      nome: string;
      valor_devido?: string;
      peso?: number;
      telefone?: string;
      email?: string;
    };
