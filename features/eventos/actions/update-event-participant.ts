import { apiClient } from "@/lib/api-client";
import { EventParticipant } from "../types";

export const updateEventParticipant = async (
  id: string,
  participantData: Partial<EventParticipant>
): Promise<EventParticipant | null> => {
  try {
    console.log("🔄 BACKEND ACTION - updateEventParticipant");
    console.log("📨 Dados recebidos no backend action:", {
      participantId: id,
      dadosParaAtualizar: participantData,
      endpoint: `/event-participants/${id}`
    });

    const { data } = await apiClient.put<EventParticipant>(
      `/event-participants/${id}`,
      participantData
    );

    console.log("✅ BACKEND ACTION - Resposta da API:", data);
    return data;
  } catch (error) {
    console.error("❌ BACKEND ACTION - Erro ao atualizar participante:", error);
    console.error("❌ Detalhes do erro:", {
      participantId: id,
      dadosEnviados: participantData,
      erro: error
    });
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

export const checkInEventParticipantByDate = async (
  id: string,
  date: string,
  checkInData: {
    validatedBy: string;
    notes?: string;
    performedBy: string;
  }
): Promise<{
  id: string;
  participantId: string;
  eventId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  validatedBy: string | null;
  notes: string | null;
  performedBy: string;
  createdAt: string;
  updatedAt: string;
} | null> => {
  try {
    // Converter data para formato dd-mm-yyyy se necessário
    const formattedDate = date.includes("/") ? date.split("/").join("-") : date;

    const { data } = await apiClient.post(`/check/check-in/${formattedDate}`, {
      participantId: id,
      ...checkInData,
    });
    return data;
  } catch (error) {
    console.error("Erro ao fazer check-in por data:", error);
    return null;
  }
};

export const checkOutEventParticipantByDate = async (
  id: string,
  date: string,
  checkOutData: {
    validatedBy: string;
    notes?: string;
    performedBy: string;
  }
): Promise<{
  id: string;
  participantId: string;
  eventId: string;
  date: string;
  checkIn: string | null;
  checkOut: string;
  validatedBy: string | null;
  notes: string | null;
  performedBy: string;
  createdAt: string;
  updatedAt: string;
} | null> => {
  try {
    // Converter data para formato dd-mm-yyyy se necessário
    const formattedDate = date.includes("/") ? date.split("/").join("-") : date;

    const { data } = await apiClient.put(`/check/check-out/${formattedDate}`, {
      participantId: id,
      ...checkOutData,
    });
    return data;
  } catch (error) {
    console.error("Erro ao fazer check-out por data:", error);
    return null;
  }
};

export const getEventParticipantAttendanceByDate = async (
  id: string,
  date: string
): Promise<{
  participantId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
} | null> => {
  try {
    // Converter data para formato dd-mm-yyyy se necessário
    const formattedDate = date.includes("/") ? date.split("/").join("-") : date;

    const { data } = await apiClient.get(`/check/${id}/${formattedDate}`);
    return data;
  } catch (error) {
    console.error("Erro ao obter presença por data:", error);
    return null;
  }
};

// ============================================================================
// FUNÇÕES PARA PERMISSÕES DE OPERADORES POR DIA
// ============================================================================

export const getEventOperatorPermissions = async (
  eventId: string
): Promise<
  {
    operatorId: string;
    operatorName: string;
    allowedDates: string[];
    createdBy?: string;
    createdAt: string;
  }[]
> => {
  try {
    const { data } = await apiClient.get(
      `/event-participants/operator-permissions/${eventId}`
    );
    return data.permissions || [];
  } catch (error) {
    console.error("Erro ao obter permissões de operadores:", error);
    return [];
  }
};

export const getOperatorEventPermissions = async (
  eventId: string,
  operatorId: string
): Promise<{
  operatorId: string;
  eventId: string;
  allowedDates: string[];
  createdBy?: string;
  createdAt: string;
} | null> => {
  try {
    const { data } = await apiClient.get(
      `/event-participants/operator-permissions/${eventId}/${operatorId}`
    );
    return data;
  } catch (error) {
    console.error("Erro ao obter permissões do operador:", error);
    return null;
  }
};

export const setOperatorEventPermissions = async (
  eventId: string,
  operatorId: string,
  allowedDates: string[],
  createdBy?: string
): Promise<{
  operatorId: string;
  eventId: string;
  allowedDates: string[];
  createdBy?: string;
  createdAt: string;
}> => {
  try {
    const { data } = await apiClient.post(
      `/event-participants/operator-permissions/${eventId}/${operatorId}`,
      {
        allowedDates,
        createdBy,
      }
    );
    return data;
  } catch (error) {
    console.error("Erro ao definir permissões do operador:", error);
    throw error;
  }
};

export const removeOperatorEventPermissions = async (
  eventId: string,
  operatorId: string
): Promise<void> => {
  try {
    await apiClient.delete(
      `/event-participants/operator-permissions/${eventId}/${operatorId}`
    );
  } catch (error) {
    console.error("Erro ao remover permissões do operador:", error);
    throw error;
  }
};

export const checkOperatorDatePermission = async (
  eventId: string,
  operatorId: string,
  date: string
): Promise<{
  hasPermission: boolean;
  operatorId: string;
  eventId: string;
  date: string;
}> => {
  try {
    const { data } = await apiClient.get(
      `/event-participants/check-operator-permission/${eventId}/${operatorId}/${date}`
    );
    return data;
  } catch (error) {
    console.error("Erro ao verificar permissão do operador:", error);
    return {
      hasPermission: false,
      operatorId,
      eventId,
      date,
    };
  }
};
