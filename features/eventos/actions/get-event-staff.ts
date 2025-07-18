import { apiClient } from "@/lib/api-client";
import { EventStaff, PaginationParams } from "../types";

export const getEventStaff = async (id: string): Promise<EventStaff | null> => {
  try {
    const { data } = await apiClient.get<EventStaff>(`/event-staff/${id}`);
    return data;
  } catch (error) {
    console.error("Erro ao buscar staff:", error);
    return null;
  }
};

export const getEventStaffAll = async (
  params?: PaginationParams
): Promise<EventStaff[] | null> => {
  try {
    console.log("🔍 Buscando staff com params:", params);
    const { data } = await apiClient.get<EventStaff[]>("/event-staff", {
      params,
    });
    console.log("📦 Resposta da API (staff):", data);
    console.log("📊 Tipo da resposta:", typeof data);
    console.log("📋 É array?", Array.isArray(data));
    if (data && typeof data === "object" && "data" in data) {
      console.log("📦 Dados dentro de data.data:", data.data);
      return Array.isArray(data.data) ? data.data : [];
    }
    return data;
  } catch (error) {
    console.error("❌ Erro ao buscar staff:", error);
    return null;
  }
};

export const getEventStaffByEvent = async (
  eventId: string
): Promise<EventStaff[] | null> => {
  try {
    console.log("🔍 Buscando staff do evento:", eventId);
    const { data } = await apiClient.get<EventStaff[]>(`/event-staff`, {
      params: { eventId },
    });
    console.log("📦 Resposta da API (staff do evento):", data);
    if (data && typeof data === "object" && "data" in data) {
      return Array.isArray(data.data) ? data.data : [];
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("❌ Erro ao buscar staff do evento:", error);
    return null;
  }
};
