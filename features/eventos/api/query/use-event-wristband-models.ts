import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

export const useEventWristbandModels = () => {
  return useQuery({
    queryKey: ["credentials"],
    queryFn: async () => {
      const { data } = await apiClient.get("/credentials");
      return data;
    },
  });
};
