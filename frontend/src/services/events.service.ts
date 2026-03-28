import { api } from "@/services/api";
import type {
  EventParticipant,
  ParticipantInput,
  SplitEventDetail,
  SplitEventListItem,
  SplitEventPublic,
  TipoDivisaoEvento,
} from "@/types/api";

export async function createSplitEvent(body: {
  nome: string;
  descricao?: string;
  valor_total: string;
  tipo_divisao: TipoDivisaoEvento;
  participantes: ParticipantInput[];
}): Promise<SplitEventDetail> {
  const { data } = await api.post<SplitEventDetail>("/events", body);
  return data;
}

export async function fetchMySplitEvents(): Promise<SplitEventListItem[]> {
  const { data } = await api.get<SplitEventListItem[]>("/events");
  return Array.isArray(data) ? data : [];
}

export async function fetchSplitEvent(id: number): Promise<SplitEventDetail> {
  const { data } = await api.get<SplitEventDetail>(`/events/${id}`);
  return data;
}

export async function updateSplitEvent(
  id: number,
  body: { nome?: string; descricao?: string; status?: string }
): Promise<SplitEventDetail> {
  const { data } = await api.put<SplitEventDetail>(`/events/${id}`, body);
  return data;
}

export async function deleteSplitEvent(id: number): Promise<void> {
  await api.delete(`/events/${id}`);
}

export async function previewSplit(
  eventId: number,
  body: {
    valor_total: string;
    tipo_divisao: TipoDivisaoEvento;
    participantes: ParticipantInput[];
  }
): Promise<{ nome: string; valor_devido: string; peso?: number }[]> {
  const { data } = await api.post<{ sugestao: { nome: string; valor_devido: string; peso?: number }[] }>(
    `/events/${eventId}/split/calculate`,
    body
  );
  return data.sugestao ?? [];
}

export async function addEventParticipant(
  eventId: number,
  body: {
    nome: string;
    telefone?: string;
    email?: string;
    valor_devido?: string;
    peso?: number;
  }
): Promise<{ participant: EventParticipant; evento: SplitEventDetail }> {
  const { data } = await api.post<{
    participant: EventParticipant;
    evento: SplitEventDetail;
  }>(`/events/${eventId}/participants`, body);
  return data;
}

export async function patchParticipant(
  eventId: number,
  participantId: string,
  body: {
    nome?: string;
    telefone?: string;
    email?: string;
    valor_devido?: string;
    valor_pago?: string;
    pago?: boolean;
    status_pagamento?: string;
    peso?: number;
  }
): Promise<EventParticipant> {
  const { data } = await api.patch<EventParticipant>(
    `/events/${eventId}/participants/${participantId}`,
    body
  );
  return data;
}

export async function deleteEventParticipant(
  eventId: number,
  participantId: string
): Promise<void> {
  await api.delete(`/events/${eventId}/participants/${participantId}`);
}

export async function generateParticipantPix(
  eventId: number,
  participantId: string
): Promise<EventParticipant> {
  const { data } = await api.post<EventParticipant>(
    `/events/${eventId}/participants/${participantId}/pix/generate`
  );
  return data;
}

export async function confirmParticipantPayment(
  eventId: number,
  participantId: string,
  body: {
    valor: string;
    metodo: "pix" | "manual";
    observacao?: string;
    comprovante_url?: string;
  }
): Promise<EventParticipant> {
  const { data } = await api.post<EventParticipant>(
    `/events/${eventId}/participants/${participantId}/payment/confirm`,
    body
  );
  return data;
}

export async function fetchWhatsAppShareEvent(
  eventId: number,
  participantId?: string
): Promise<{ url: string; message: string }> {
  const q = participantId
    ? `?participant_id=${encodeURIComponent(participantId)}`
    : "";
  const { data } = await api.get<{ url: string; message: string }>(
    `/events/${eventId}/share/whatsapp${q}`
  );
  return data;
}

export async function fetchWhatsAppShareParticipant(
  eventId: number,
  participantId: string
): Promise<{ url: string; message: string }> {
  const { data } = await api.get<{ url: string; message: string }>(
    `/events/${eventId}/participants/${participantId}/share/whatsapp`
  );
  return data;
}

/** Público: sem exigir token (funciona também se o usuário estiver logado). */
export async function fetchSplitEventByCode(
  codigo: string
): Promise<SplitEventPublic> {
  const c = codigo.trim().toUpperCase();
  const { data } = await api.get<SplitEventPublic>(`/events/code/${c}`);
  return data;
}

export async function setParticipantPaidPublic(
  codigo: string,
  participantId: string,
  pago: boolean
): Promise<EventParticipant> {
  const c = codigo.trim().toUpperCase();
  const { data } = await api.patch<EventParticipant>(
    `/events/code/${c}/participants/${participantId}/paid`,
    { pago }
  );
  return data;
}
