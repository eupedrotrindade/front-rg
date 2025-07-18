import { apiClient } from "@/lib/api-client";
import { EventHistory } from "../types";

export const updateEventHistory = async (
  id: string,
  historyData: Partial<EventHistory>
): Promise<EventHistory | null> => {
  try {
    const { data } = await apiClient.put<EventHistory>(
      `/event-histories/${id}`,
      historyData
    );
    return data;
  } catch (error) {
    console.error("Erro ao atualizar histórico:", error);
    return null;
  }
};
