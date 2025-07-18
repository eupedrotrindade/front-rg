import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

export type UpdateEventWristbandModelInput = {
  id: string;
  credentialType: string;
  color: string;
  status: "active" | "inactive";
  eventId: string;
};

export const useUpdateEventWristbandModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateEventWristbandModelInput) => {
      const response = await apiClient.put(
        `/event-wristband-models/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-wristband-models"] });
    },
  });
};
