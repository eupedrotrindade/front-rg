import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

export type CreateEventWristbandModelInput = {
  credentialType: string;
  color: string;
  status: "active" | "inactive";
  eventId: string;
};

export const useCreateEventWristbandModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEventWristbandModelInput) => {
      const response = await apiClient.post("/event-wristband-models", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-wristband-models"] });
    },
  });
};
