import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export const useDeleteEventAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ participantId }: { participantId: string }) => {
      const { data } = await apiClient.delete(
        `/event-attendance/participant/${participantId}`
      );
      return data;
    },
    
    onSuccess: () => {
      // Invalidar queries relacionadas para atualização em tempo real
      queryClient.invalidateQueries({
        queryKey: ["event-participants"]
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance"]
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-by-event-date"]
      });
      queryClient.invalidateQueries({
        queryKey: ["event-attendance-status"]
      });
    },
    
    onError: (error) => {
      console.error("Erro ao resetar check-in:", error);
      toast.error("Erro ao resetar check-in");
    },
  });
};