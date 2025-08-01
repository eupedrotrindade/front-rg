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
      const { data } = await apiClient.put(`/event-participants/${id}`, dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-participants"] });
    },
  });
};
