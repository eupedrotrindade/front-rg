import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { EventManagerSchema } from "@/features/eventos/schemas";

export const useUpdateEventManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dados
    }: EventManagerSchema & { id: string }) => {
      const { data } = await axios.put(`/api/event-managers/${id}`, dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-managers"] });
    },
  });
};
