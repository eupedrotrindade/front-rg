import { apiClient } from "@/lib/api-client";
import { EventManager, PaginationParams } from "../types";

export const getEventManager = async (
  id: string
): Promise<EventManager | null> => {
  try {
    const { data } = await apiClient.get<EventManager>(`/event-managers/${id}`);
    return data;
  } catch (error) {
    console.error("Erro ao buscar gerente:", error);
    return null;
  }
};

export const getEventManagerAll = async (
  params?: PaginationParams
): Promise<EventManager[] | null> => {
  try {
    console.log("🔍 Buscando gerentes com params:", params);
    const { data } = await apiClient.get<EventManager[]>("/event-managers", {
      params,
    });
    console.log("📦 Resposta da API (gerentes):", data);
    console.log("📊 Tipo da resposta:", typeof data);
    console.log("📋 É array?", Array.isArray(data));
    if (data && typeof data === "object" && "data" in data) {
      console.log("📦 Dados dentro de data.data:", data.data);
      return Array.isArray(data.data) ? data.data : [];
    }
    return data;
  } catch (error) {
    console.error("❌ Erro ao buscar gerentes:", error);
    return null;
  }
};
