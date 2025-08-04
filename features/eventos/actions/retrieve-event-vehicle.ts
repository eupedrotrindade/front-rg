import { apiClient } from "@/lib/api-client";
import { EventVehicle } from "./create-event-vehicle";

export interface RetrieveEventVehicleData {
  performedBy: string;
}

export const retrieveEventVehicle = async (
  id: string,
  data: RetrieveEventVehicleData
): Promise<EventVehicle> => {
  const response = await apiClient.patch(`/event-vehicles/${id}/retrieve`, data);
  return response.data;
}; 