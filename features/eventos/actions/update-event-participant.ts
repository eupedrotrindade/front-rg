import { apiClient } from "@/lib/api-client";
import { EventParticipant } from "../types";

export const updateEventParticipant = async (
  id: string,
  participantData: Partial<EventParticipant>
): Promise<EventParticipant | null> => {
  try {
    const { data } = await apiClient.put<EventParticipant>(
      `/event-participants/${id}`,
      participantData
    );
    return data;
  } catch (error) {
    console.error("Erro ao atualizar participante:", error);
    return null;
  }
};

export const checkInEventParticipant = async (
  id: string,
  checkInData: {
    validatedBy: string;
    notes?: string;
    performedBy: string;
  }
): Promise<EventParticipant | null> => {
  try {
    const { data } = await apiClient.patch<EventParticipant>(
      `/event-participants/${id}/check-in`,
      checkInData
    );
    return data;
  } catch (error) {
    console.error("Erro ao fazer check-in:", error);
    return null;
  }
};

export const checkOutEventParticipant = async (
  id: string,
  checkOutData: {
    validatedBy: string;
    notes?: string;
    performedBy: string;
  }
): Promise<EventParticipant | null> => {
  try {
    const { data } = await apiClient.patch<EventParticipant>(
      `/event-participants/${id}/check-out`,
      checkOutData
    );
    return data;
  } catch (error) {
    console.error("Erro ao fazer check-out:", error);
    return null;
  }
};
