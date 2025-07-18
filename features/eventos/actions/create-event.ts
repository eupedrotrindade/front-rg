import { apiClient } from "@/lib/api-client";
import { CreateEventRequest, Event } from "../types";

export const createEvent = async (
  eventData: CreateEventRequest
): Promise<Event | null> => {
  try {
    const { data } = await apiClient.post<Event>("/events", eventData);
    return data;
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    return null;
  }
};
