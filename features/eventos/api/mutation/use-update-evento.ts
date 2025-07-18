import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { EventoSchema } from "@/features/eventos/schemas";
import { useClerk } from "@clerk/nextjs";

export const useUpdateEvento = () => {
  const queryClient = useQueryClient();
  const { user } = useClerk();
  return useMutation({
    mutationFn: async ({ id, ...dados }: EventoSchema & { id: string }) => {
      const { data } = await axios.put(`/api/eventos/${id}`, {
        ...dados,
        performedBy: user?.id || "currentUser",
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
    },
  });
};
