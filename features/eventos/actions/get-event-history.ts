import { apiClient } from "@/lib/api-client";
import { EventHistory, PaginationParams } from "../types";

export const getEventHistory = async (
  id: string
): Promise<EventHistory | null> => {
  try {
    const { data } = await apiClient.get<EventHistory>(
      `/event-histories/${id}`
    );
    return data;
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    return null;
  }
};

export const getEventHistoryAll = async (
  params?: PaginationParams
): Promise<EventHistory[] | null> => {
  try {
    console.log("🔍 Buscando histórico com params:", params);
    const { data } = await apiClient.get<EventHistory[]>("/event-histories", {
      params,
    });
    console.log("📦 Resposta da API (histórico):", data);
    console.log("📊 Tipo da resposta:", typeof data);
    console.log("📋 É array?", Array.isArray(data));
    if (data && typeof data === "object" && "data" in data) {
      console.log("📦 Dados dentro de data.data:", data.data);
      return Array.isArray(data.data) ? data.data : [];
    }
    return data;
  } catch (error) {
    console.error("❌ Erro ao buscar histórico:", error);
    return null;
  }
};
