import { apiClient } from "@/lib/api-client";
import type {
  EventAttendance,
  EventAttendanceListResponse,
  EventAttendanceStats,
} from "../types";

// GET /event-attendance - Listar todos os checks de presença
export const getEventAttendance = async (params?: {
  eventId?: string;
  participantId?: string;
  date?: string;
  workStage?: string;
  workPeriod?: string;
  page?: number;
  limit?: number;
}): Promise<EventAttendanceListResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (params?.eventId) queryParams.append("eventId", params.eventId);
    if (params?.participantId)
      queryParams.append("participantId", params.participantId);
    if (params?.date) queryParams.append("date", params.date);
    if (params?.workStage) queryParams.append("workStage", params.workStage);
    if (params?.workPeriod) queryParams.append("workPeriod", params.workPeriod);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) {
      queryParams.append("limit", params.limit.toString());
    } else {
      // Se não especificado, usar limite alto para buscar todos os registros
      queryParams.append("limit", "10000");
    }

    const { data } = await apiClient.get<EventAttendanceListResponse>(
      `/event-attendance?${queryParams.toString()}`
    );
    return data;
  } catch (error) {
    console.error("Erro ao buscar event_attendance:", error);
    throw error;
  }
};

// GET /event-attendance/:id - Buscar check específico
export const getEventAttendanceById = async (
  id: string
): Promise<EventAttendance> => {
  try {
    const { data } = await apiClient.get<EventAttendance>(
      `/event-attendance/${id}`
    );
    return data;
  } catch (error) {
    console.error("Erro ao buscar check específico:", error);
    throw error;
  }
};

// GET /event-attendance/stats/:eventId - Estatísticas de presença por evento
export const getEventAttendanceStats = async (
  eventId: string
): Promise<EventAttendanceStats> => {
  try {
    const { data } = await apiClient.get<EventAttendanceStats>(
      `/event-attendance/stats/${eventId}`
    );
    return data;
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    throw error;
  }
};

// Função para buscar checks por evento e data
export const getEventAttendanceByEventAndDate = async (
  eventId: string,
  date: string
): Promise<EventAttendance[]> => {
  try {
    const response = await getEventAttendance({
      eventId,
      date,
      // Sem limite para buscar todos os registros
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar checks por evento e data:", error);
    throw error;
  }
};

// Função para buscar checks por turno específico (evento, data, stage e período)
export const getEventAttendanceByShift = async (
  eventId: string,
  date: string,
  workStage: string,
  workPeriod: string
): Promise<EventAttendance[]> => {
  try {
    const response = await getEventAttendance({
      eventId,
      date,
      workStage,
      workPeriod,
      // Sem limite para buscar todos os registros
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar checks por turno:", error);
    throw error;
  }
};

// Função para buscar checks de um participante específico
export const getEventAttendanceByParticipant = async (
  participantId: string,
  params?: {
    eventId?: string;
    date?: string;
    page?: number;
    limit?: number;
  }
): Promise<EventAttendanceListResponse> => {
  try {
    return await getEventAttendance({
      participantId,
      ...params,
    });
  } catch (error) {
    console.error("Erro ao buscar checks do participante:", error);
    throw error;
  }
};

// Função para buscar checks de um evento
export const getEventAttendanceByEvent = async (
  eventId: string,
  params?: {
    date?: string;
    page?: number;
    limit?: number;
  }
): Promise<EventAttendanceListResponse> => {
  try {
    return await getEventAttendance({
      eventId,
      ...params,
    });
  } catch (error) {
    console.error("Erro ao buscar checks do evento:", error);
    throw error;
  }
};

// POST /event-attendance - Criar registro de presença
export const createEventAttendance = async (attendanceData: {
  eventId: string;
  participantId: string;
  date: string;
  performedBy: string;
  notes?: string;
  checkIn?: string | null;
  checkOut?: string | null;
}): Promise<EventAttendance> => {
  try {
    const { data } = await apiClient.post<EventAttendance>(
      "/event-attendance",
      attendanceData
    );
    return data;
  } catch (error) {
    console.error("Erro ao criar event_attendance:", error);
    throw error;
  }
};
