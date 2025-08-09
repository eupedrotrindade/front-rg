import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetCheckin } from "../../actions/reset-checkin";
import { toast } from "sonner";

export const useResetCheckin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      participantId, 
      performedBy, 
      notes 
    }: { 
      participantId: string; 
      performedBy?: string; 
      notes?: string; 
    }) => resetCheckin(participantId, performedBy, notes),
    
    onSuccess: (data) => {
      if (data) {
        toast.success("Check-in resetado com sucesso!");
        // Invalidar queries relacionadas
        queryClient.invalidateQueries({
          queryKey: ["event-participants"]
        });
        queryClient.invalidateQueries({
          queryKey: ["event-attendance"]
        });
      } else {
        toast.error("Erro ao resetar check-in");
      }
    },
    
    onError: (error) => {
      console.error("Erro ao resetar check-in:", error);
      toast.error("Erro ao resetar check-in");
    },
  });
};