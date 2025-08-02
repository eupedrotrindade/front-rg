import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
      const formattedDate = date.includes("/") ? date.split("/").join("-") : date;

      const { data } = await apiClient.post(`/check/check-in/${formattedDate}`, {
        participantId,
        validatedBy,
        notes,
        performedBy,
      });
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ["event-attendance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-by-event-date", data.eventId, variables.date],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-by-participant", variables.participantId],
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
      const formattedDate = date.includes("/") ? date.split("/").join("-") : date;

      const { data } = await apiClient.put(`/check/check-out/${formattedDate}`, {
        participantId,
        validatedBy,
        notes,
        performedBy,
      });
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ["event-attendance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-by-event-date", data.eventId, variables.date],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-by-participant", variables.participantId],
      });
    },
  });
};

// Hook para buscar status de presença específico
export const useAttendanceStatus = (participantId: string, date: string) => {
  return useQuery({
    queryKey: ["attendance-status", participantId, date],
    queryFn: async () => {
      // Converter data se necessário
      const formattedDate = date.includes("/") ? date.split("/").join("-") : date;

      const { data } = await apiClient.get(`/check/${participantId}/${formattedDate}`);
      return data;
    },
    enabled: !!participantId && !!date,
  });
}; 