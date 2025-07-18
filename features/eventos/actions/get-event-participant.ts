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
