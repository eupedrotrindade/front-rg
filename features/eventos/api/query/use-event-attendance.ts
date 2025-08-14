import { useQuery } from "@tanstack/react-query";
import {
  getEventAttendance,
  getEventAttendanceById,
  getEventAttendanceStats,
  getEventAttendanceByEventAndDate,
  getEventAttendanceByShift,
  getEventAttendanceByParticipant,
  getEventAttendanceByEvent,
} from "../../actions/event-attendance";
import type {
  EventAttendance,
  EventAttendanceListResponse,
  EventAttendanceStats,
} from "../../types";

// Hook para listar todos os checks de presença
export const useEventAttendance = (params?: {
  eventId?: string;
  participantId?: string;
  date?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["event-attendance", params],
    queryFn: () => getEventAttendance(params),
    enabled: !!params?.eventId || !!params?.participantId || !!params?.date,
  });
};

// Hook para buscar check específico
export const useEventAttendanceById = (id: string) => {
  return useQuery({
    queryKey: ["event-attendance", id],
    queryFn: () => getEventAttendanceById(id),
    enabled: !!id,
  });
};

// Hook para buscar estatísticas de presença
export const useEventAttendanceStats = (eventId: string) => {
  return useQuery({
    queryKey: ["event-attendance-stats", eventId],
    queryFn: () => getEventAttendanceStats(eventId),
    enabled: !!eventId,
  });
};

// Hook para buscar checks por evento e data
export const useEventAttendanceByEventAndDate = (
  eventId: string,
  date: string
) => {
  return useQuery({
    queryKey: ["event-attendance-by-event-date", eventId, date],
    queryFn: () => getEventAttendanceByEventAndDate(eventId, date),
    enabled: !!eventId && !!date,
  });
};

// Hook para buscar checks por turno específico (evento, data, stage e período)
export const useEventAttendanceByShift = (
  eventId: string,
  date: string,
  workStage: string,
  workPeriod: string
) => {
  return useQuery({
    queryKey: ["event-attendance-by-shift", eventId, date, workStage, workPeriod],
    queryFn: () => getEventAttendanceByShift(eventId, date, workStage, workPeriod),
    enabled: !!eventId && !!date && !!workStage && !!workPeriod,
  });
};

// Hook para buscar checks de um participante
export const useEventAttendanceByParticipant = (
  participantId: string,
  params?: {
    eventId?: string;
    date?: string;
    page?: number;
    limit?: number;
  }
) => {
  return useQuery({
    queryKey: ["event-attendance-by-participant", participantId, params],
    queryFn: () => getEventAttendanceByParticipant(participantId, params),
    enabled: !!participantId,
  });
};

// Hook para buscar checks de um evento
export const useEventAttendanceByEvent = (
  eventId: string,
  params?: {
    date?: string;
    page?: number;
    limit?: number;
  }
) => {
  return useQuery({
    queryKey: ["event-attendance-by-event", eventId, params],
    queryFn: () => getEventAttendanceByEvent(eventId, params),
    enabled: !!eventId,
  });
};
