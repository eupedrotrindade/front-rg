import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateEventRequest, Event } from "@/features/eventos/types";
import { createEvent } from "../../actions/create-event";
import { toast } from "sonner";
import { useClerk } from "@clerk/nextjs";

export const useCreateEvento = () => {
  const queryClient = useQueryClient();
  const { user } = useClerk();

  return useMutation<Event | null, Error, CreateEventRequest>({
    mutationFn: (data) =>
      createEvent({ ...data, performedBy: user?.id || "currentUser" }),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["eventos"] });
        toast.success("Evento criado com sucesso!");
      } else {
        toast.error("Erro ao criar evento");
      }
    },
    onError: (error) => {
      console.error("Erro na criação do evento:", error);
      toast.error("Erro ao criar evento");
    },
  });
};
