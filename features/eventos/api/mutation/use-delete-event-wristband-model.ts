import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

export const useDeleteEventWristbandModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/event-wristband-models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-wristband-models"] });
    },
  });
};
