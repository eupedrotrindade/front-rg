import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { EventParticipantSchema } from "@/features/eventos/schemas";

export const useUpdateEventParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dados
    }: EventParticipantSchema & { id: string }) => {
      const { data } = await axios.put(`/api/event-participants/${id}`, dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-participants"] });
    },
  });
};
