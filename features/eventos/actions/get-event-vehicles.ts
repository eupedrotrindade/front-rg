import { apiClient } from "@/lib/api-client";
import { EventVehicle } from "./create-event-vehicle";

export const getEventVehicles = async (eventId: string): Promise<EventVehicle[]> => {
  try {
    const response = await apiClient.get(`/event-vehicles?eventId=${eventId}`);
    const vehicles = response.data;
    // Garantir que sempre retorne um array
    return Array.isArray(vehicles) ? vehicles : [];
  } catch (error) {
    console.error("❌ Erro ao buscar veículos do evento:", error);
    return [];
  }
}; 