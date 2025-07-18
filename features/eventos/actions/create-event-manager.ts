import { apiClient } from "@/lib/api-client";
import { CreateEventManagerRequest, EventManager } from "../types";

export const createEventManager = async (
  managerData: CreateEventManagerRequest
): Promise<EventManager | null> => {
  try {
    const { data } = await apiClient.post<EventManager>(
      "/event-managers",
      managerData
    );
    return data;
  } catch (error) {
    console.error("Erro ao criar gerente:", error);
    return null;
  }
};
