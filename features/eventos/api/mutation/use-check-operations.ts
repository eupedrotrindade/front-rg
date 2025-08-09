import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// Tipos para os dados de attendance
export interface AttendanceRecord {
  id: string;
  participantId: string;
  eventId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  validatedBy: string | null;
  notes: string | null;
  performedBy: string;
  createdAt: string;
  updatedAt: string;
  participant?: {
    id: string;
    name: string;
    cpf: string;
    role: string | null;
    company: string;
  };
}

export interface EventAttendanceResponse {
  data: AttendanceRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AttendanceStatus {
  participantId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
}

// Hook para check-in
export const useCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      participantId,
      date,
      validatedBy,
      notes,
      performedBy,
    }: {
      participantId: string;
      date: string;
      validatedBy?: string;
      notes?: string;
      performedBy?: string;
    }) => {
      // Converter data se necessário
      const formattedDate = date.includes("/")
        ? date.split("/").join("-")
        : date;

      const { data } = await apiClient.post(
        `/check/check-in/${formattedDate}`,
        {
          participantId,
          validatedBy,
          notes,
          performedBy,
        }
      );
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas - usar formatação compatível
      const formattedDate = variables.date.includes("/") 
        ? variables.date.split("/").reverse().join("-") 
        : variables.date;

      queryClient.invalidateQueries({
        queryKey: ["event-attendance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-status"],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "event-attendance-by-event-date",
          data.eventId,
          formattedDate,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "event-attendance-by-event-date",
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-by-participant", variables.participantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance-status", variables.participantId],
      });
    },
  });
};

// Hook para check-out
export const useCheckOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      participantId,
      date,
      validatedBy,
      notes,
      performedBy,
    }: {
      participantId: string;
      date: string;
      validatedBy?: string;
      notes?: string;
      performedBy?: string;
    }) => {
      // Converter data se necessário
      const formattedDate = date.includes("/")
        ? date.split("/").join("-")
        : date;

      const { data } = await apiClient.put(
        `/check/check-out/${formattedDate}`,
        {
          participantId,
          validatedBy,
          notes,
          performedBy,
        }
      );
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas - usar formatação compatível
      const formattedDate = variables.date.includes("/") 
        ? variables.date.split("/").reverse().join("-") 
        : variables.date;

      queryClient.invalidateQueries({
        queryKey: ["event-attendance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-status"],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "event-attendance-by-event-date",
          data.eventId,
          formattedDate,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "event-attendance-by-event-date",
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-by-participant", variables.participantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance-status", variables.participantId],
      });
    },
  });
};

// Hook para buscar status de presença específico
export const useAttendanceStatus = (participantId: string, date: string) => {
  return useQuery<AttendanceStatus>({
    queryKey: ["attendance-status", participantId, date],
    queryFn: async () => {
      // Converter data se necessário
      const formattedDate = date.includes("/")
        ? date.split("/").join("-")
        : date;

      const { data } = await apiClient.get(
        `/check/${participantId}/${formattedDate}`
      );
      return data;
    },
    enabled: !!participantId && !!date,
  });
};

// Hook para buscar todos os attendance status de um evento
export const useEventAttendanceStatus = ({
  eventId,
  page = 1,
  limit = 50,
  date,
}: {
  eventId: string;
  page?: number;
  limit?: number;
  date?: string;
}) => {
  return useQuery<EventAttendanceResponse>({
    queryKey: ["event-attendance-status", eventId, page, limit, date],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (date) {
        params.append("date", date);
      }

      const { data } = await apiClient.get(
        `/check/event/${eventId}?${params.toString()}`
      );
      return data;
    },
    enabled: !!eventId,
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Refetch a cada minuto
  });
};

// Hook simplificado para buscar attendance sem paginação (útil para relatórios)
export const useAllEventAttendance = (eventId: string, date?: string) => {
  return useQuery<AttendanceRecord[]>({
    queryKey: ["all-event-attendance", eventId, date],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (date) {
        params.append("date", date);
      }

      const { data } = await apiClient.get(
        `/check/event/${eventId}?${params.toString()}`
      );
      return data.data; // Retorna apenas o array de dados, sem paginação
    },
    enabled: !!eventId,
    staleTime: 60000, // 1 minuto
  });
};
