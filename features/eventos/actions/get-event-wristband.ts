import { apiClient } from "@/lib/api-client";
import { EventWristband, PaginationParams } from "../types";

export const getEventWristband = async (
  id: string
): Promise<EventWristband | null> => {
  try {
    const { data } = await apiClient.get<EventWristband>(
      `/event-wristbands/${id}`
    );
    return data;
  } catch (error) {
    console.error("Erro ao buscar credencial:", error);
    return null;
  }
};

export const getEventWristbandAll = async (
  params?: PaginationParams
): Promise<EventWristband[] | null> => {
  try {
    console.log("🔍 Buscando credenciais com params:", params);
    const { data } = await apiClient.get<EventWristband[]>(
      "/event-wristbands",
      {
        params,
      }
    );
    console.log("📦 Resposta da API (credenciais):", data);
    console.log("📊 Tipo da resposta:", typeof data);
    console.log("📋 É array?", Array.isArray(data));
    if (data && typeof data === "object" && "data" in data) {
      console.log("📦 Dados dentro de data.data:", data.data);
      return Array.isArray(data.data) ? data.data : [];
    }
    return data;
  } catch (error) {
    console.error("❌ Erro ao buscar credenciais:", error);
    return null;
  }
};

export const getEventWristbandByEvent = async (
  eventId: string
): Promise<EventWristband[] | null> => {
  try {
    console.log("🔍 Buscando credenciais do evento:", eventId);
    const { data } = await apiClient.get<EventWristband[]>(
      `/event-wristbands`,
      {
        params: { eventId },
      }
    );
    console.log("📦 Resposta da API (credenciais do evento):", data);
    if (data && typeof data === "object" && "data" in data) {
      return Array.isArray(data.data) ? data.data : [];
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("❌ Erro ao buscar credenciais do evento:", error);
    return null;
  }
};
