import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EventParticipantSchema } from "@/features/eventos/schemas";
import { apiClient } from "@/lib/api-client";

export const useUpdateEventParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dados
    }: EventParticipantSchema & { id: string }) => {
      try {
        const { data } = await apiClient.put(
          `/event-participants/${id}`,
          dados
        );
        return data;
      } catch (error) {
        console.error("Erro na mutation updateEventParticipant:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-participants"] });
      queryClient.invalidateQueries({
        queryKey: ["event-participants-by-event"],
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar participante:", error);
    },
  });
};
