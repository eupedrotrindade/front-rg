/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "@/lib/api-client";
import { EventVehicle } from "./create-event-vehicle";

export const getEventVehicles = async (
  eventId: string
): Promise<EventVehicle[]> => {
  try {
    console.log("🔄 Buscando veículos para evento:", eventId);
    const response = await apiClient.get(`/event-vehicles?eventId=${eventId}`);
    const vehicles = response.data;
    console.log("📦 Veículos retornados:", vehicles);
    console.log("📋 Estrutura do primeiro veículo:", vehicles?.[0]);

    // Garantir que sempre retorne um array
    const result = Array.isArray(vehicles) ? vehicles : [];

    // Transformar event_id para eventId se necessário
    const transformedVehicles = result.map((vehicle) => ({
      ...vehicle,
      eventId: vehicle.event_id || vehicle.eventId,
    }));

    console.log("✅ Resultado final:", transformedVehicles);
    return transformedVehicles;
  } catch (error) {
    console.error("❌ Erro ao buscar veículos do evento:", error);
    if (error && typeof error === "object" && "response" in error) {
      console.error("❌ Detalhes do erro:", (error as any).response?.data);
    }
    return [];
  }
};
