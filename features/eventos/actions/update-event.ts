import { apiClient } from "@/lib/api-client";
import { UpdateEventRequest, Event } from "../types";

export const updateEvent = async (
  id: string,
  eventData: UpdateEventRequest
): Promise<Event | null> => {
  try {
    const { data } = await apiClient.put<Event>(`/events/${id}`, eventData);
    return data;
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    return null;
  }
};
