import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { EventParticipantSchema } from "@/features/eventos/schemas";
import { toast } from "sonner";

export const useCreateEventParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novoParticipant: EventParticipantSchema) => {
      const { data } = await apiClient.post(
        "/event-participants",
        novoParticipant
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-participants"] });
      toast.success("Participante criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro na criação do participante:", error);
      toast.error("Erro ao criar participante");
    },
  });
};
