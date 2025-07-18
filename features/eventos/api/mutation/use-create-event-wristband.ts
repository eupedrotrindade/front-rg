import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { EventWristbandSchema } from "@/features/eventos/schemas";

export const useCreateEventWristband = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (novoWristband: EventWristbandSchema) => {
      const { data } = await apiClient.post("/event-wristbands", novoWristband);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-wristbands"] });
    },
  });
};
