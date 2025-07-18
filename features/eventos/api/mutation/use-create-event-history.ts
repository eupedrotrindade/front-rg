import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { EventHistorySchema } from "@/features/eventos/schemas";

export const useCreateEventHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (novoHistory: EventHistorySchema) => {
      const { data } = await axios.post("/api/event-histories", novoHistory);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-histories"] });
    },
  });
};
