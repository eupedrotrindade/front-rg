import { apiClient } from "@/lib/api-client";
import { EventParticipant } from "../types";

export const resetCheckin = async (
  participantId: string,
  performedBy?: string,
  notes?: string
): Promise<EventParticipant | null> => {
  try {
    const { data } = await apiClient.patch<EventParticipant>(
      `/event-participants/${participantId}/reset-checkin`,
      {
        performedBy: performedBy || "system",
        notes: notes || "Check-in resetado"
      }
    );
    return data;
  } catch (error) {
    console.error("Erro ao resetar check-in do participante:", error);
    return null;
  }
};