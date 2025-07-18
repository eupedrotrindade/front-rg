import { apiClient } from "@/lib/api-client";
import { EventHistory } from "../types";

export const createEventHistory = async (historyData: {
  entityType: string;
  entityId: string;
  action: "created" | "updated" | "deleted";
  performedBy: string;
  description?: string;
}): Promise<EventHistory | null> => {
  try {
    const { data } = await apiClient.post<EventHistory>(
      "/event-histories",
      historyData
    );
    return data;
  } catch (error) {
    console.error("Erro ao criar histórico:", error);
    return null;
  }
};
