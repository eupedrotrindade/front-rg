import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

export const useEventWristbandModels = () => {
  return useQuery({
    queryKey: ["event-wristband-models"],
    queryFn: async () => {
      const { data } = await apiClient.get("/event-wristband-models");
      return data;
    },
  });
};
