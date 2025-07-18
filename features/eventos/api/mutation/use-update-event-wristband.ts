import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { EventWristbandSchema } from "@/features/eventos/schemas";

export const useUpdateEventWristband = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dados
    }: EventWristbandSchema & { id: string }) => {
      const { data } = await axios.put(`/api/event-wristbands`, {
        id,
        ...dados,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-wristbands"] });
    },
  });
};
