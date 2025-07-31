import { apiClient } from "@/lib/api-client";

export const deleteEventVehicle = async (id: string): Promise<void> => {
  await apiClient.delete(`/event-vehicles/${id}`);
}; 