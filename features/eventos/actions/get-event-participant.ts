/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "@/lib/api-client";
import { EventParticipant, PaginationParams } from "../types";

export const getEventParticipant = async (
  id: string
): Promise<EventParticipant | null> => {
  try {
    const { data } = await apiClient.get<EventParticipant>(
      `/event-participants/${id}`
    );
    return data;
  } catch (error) {
    console.error("Erro ao buscar participante:", error);
    return null;
  }
};

export const getEventParticipantAll = async (
  params?: PaginationParams
): Promise<EventParticipant[] | null> => {
  try {
    console.log("🔍 Buscando participantes com params:", params);
    const { data } = await apiClient.get<EventParticipant[]>(
      "/event-participants",
      {
        params,
      }
    );
    console.log("📦 Resposta da API (participantes):", data);
    console.log("📊 Tipo da resposta:", typeof data);
    console.log("📋 É array?", Array.isArray(data));
    if (data && typeof data === "object" && "data" in data) {
      console.log("📦 Dados dentro de data.data:", data.data);
      return Array.isArray(data.data) ? data.data : [];
    }
    return data;
  } catch (error) {
    console.error("❌ Erro ao buscar participantes:", error);
    return null;
  }
};

export const getEventParticipantByCpf = async (
  cpf: string
): Promise<EventParticipant | null> => {
  try {
    const { data } = await apiClient.get<EventParticipant>(
      `/event-participants/cpf/${cpf}`
    );
    return data;
  } catch (error) {
    console.error("Erro ao buscar participante por CPF:", error);
    return null;
  }
};

// Buscar todos os participantes de um evento pelo id do evento

/**
 * Busca todos os participantes de um evento pelo ID do evento.
 * Retorna um array de participantes ou lança erro se não encontrar.
 *
 * @param eventId - O ID do evento (UUID)
 * @returns Promise<EventParticipant[]>
 * @throws {Error} Se não encontrar participantes ou erro interno
 */
export const getEventParticipantsByEvent = async (
  eventId: string
): Promise<EventParticipant[]> => {
  try {
    const { data } = await apiClient.get<EventParticipant[]>(
      `/event-participants/event/${eventId}`
    );
    console.log(data);
    if (!Array.isArray(data) || data.length === 0) {
      // Simula resposta 404 do backend
      const error = new Error(
        "Nenhum participante encontrado para este evento"
      );
      (error as any).status = 404;
      throw error;
    }

    return data;
  } catch (error: any) {
    if (error?.status === 404) {
      // Lida com "não encontrado"
      throw new Error("Nenhum participante encontrado para este evento");
    }
    // Loga erro e lança erro genérico
    console.error("Erro ao buscar participantes por evento:", error);
    throw new Error("Erro interno do servidor");
  }
};
