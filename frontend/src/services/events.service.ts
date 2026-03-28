import { api } from "@/services/api";
import type {
  EventParticipant,
  SplitEventDetail,
  SplitEventListItem,
  SplitEventPublic,
} from "@/types/api";

export async function createSplitEvent(body: {
  nome: string;
  valor_total: string;
  participantes: string[];
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

export async function patchParticipant(
  eventId: number,
  participantId: string,
  body: { valor_devido?: string; pago?: boolean }
): Promise<EventParticipant> {
  const { data } = await api.patch<EventParticipant>(
    `/events/${eventId}/participants/${participantId}`,
    body
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
