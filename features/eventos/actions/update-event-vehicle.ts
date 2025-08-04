import { apiClient } from "@/lib/api-client";
import { EventVehicle } from "./create-event-vehicle";

export interface UpdateEventVehicleData {
  empresa?: string;
  modelo?: string;
  placa?: string;
  tipo_de_credencial?: string;
  retirada?: "pendente" | "retirada";
  dia?: string;
}

export const updateEventVehicle = async (
  id: string,
  data: UpdateEventVehicleData
): Promise<EventVehicle> => {
  const response = await apiClient.put(`/event-vehicles/${id}`, data);
  return response.data;
};
