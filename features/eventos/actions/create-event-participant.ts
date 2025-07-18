import { apiClient } from "@/lib/api-client";
import { CreateEventParticipantRequest, EventParticipant } from "../types";

export const createEventParticipant = async (
  participantData: CreateEventParticipantRequest
): Promise<EventParticipant | null> => {
  try {
    const { data } = await apiClient.post<EventParticipant>(
      "/event-participants",
      participantData
    );
    return data;
  } catch (error) {
    console.error("Erro ao criar participante:", error);
    return null;
  }
};
