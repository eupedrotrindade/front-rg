import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { UpdateEventRequest, Event } from "@/features/eventos/types";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

export const useUpdateEvento = () => {
  const queryClient = useQueryClient();
  const { user } = useClerk();
  
  return useMutation<Event | null, Error, UpdateEventRequest & { id: string }>({
    mutationFn: async ({ id, ...dados }) => {
      const { data } = await apiClient.put(`/events/${id}`, {
        ...dados,
        performedBy: user?.id || "currentUser",
      });
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["eventos"] });
        queryClient.invalidateQueries({ queryKey: ["evento", data.id] });
        toast.success("Evento atualizado com sucesso!");
      } else {
        toast.error("Erro ao atualizar evento");
      }
    },
    onError: (error) => {
      console.error("Erro na atualização do evento:", error);
      toast.error("Erro ao atualizar evento");
    },
  });
};
