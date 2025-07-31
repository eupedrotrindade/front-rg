import { apiClient } from "@/lib/api-client";
import { EventVehicle } from "./create-event-vehicle";

export interface UpdateEventVehicleData {
  empresa?: string;
  placa?: string;
  modelo?: string;
  status?: boolean;
  credencial?: string;
}

export const updateEventVehicle = async (
  id: string,
  data: UpdateEventVehicleData
): Promise<EventVehicle> => {
  const response = await apiClient.put(`/event-vehicles/${id}`, data);
  return response.data;
}; 