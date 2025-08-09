import { apiClient } from "@/lib/api-client";
import { EventParticipant } from "../types";

export const updateParticipantCredential = async (
  participantId: string,
  credentialId: string,
  performedBy?: string
): Promise<EventParticipant | null> => {
  try {
    const { data } = await apiClient.patch<EventParticipant>(
      `/event-participants/${participantId}/credential`,
      {
        credential_id: credentialId,
        performedBy: performedBy || "system"
      }
    );
    return data;
  } catch (error) {
    console.error("Erro ao atualizar credencial do participante:", error);
    return null;
  }
};