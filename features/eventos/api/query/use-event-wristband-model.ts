import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

export const useEventWristbandModel = (id: string) => {
  return useQuery({
    queryKey: ["event-wristband-model", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/event-wristband-models/${id}`);
      return data;
    },
    enabled: !!id,
  });
};
