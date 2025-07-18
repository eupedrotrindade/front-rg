import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateEventManagerRequest,
  EventManager,
} from "@/features/eventos/types";
import { createEventManager } from "../../actions/create-event-manager";
import { toast } from "sonner";

export const useCreateEventManager = () => {
  const queryClient = useQueryClient();

  return useMutation<EventManager | null, Error, CreateEventManagerRequest>({
    mutationFn: createEventManager,
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["event-managers"] });
        toast.success("Gerente criado com sucesso!");
      } else {
        toast.error("Erro ao criar gerente");
      }
    },
    onError: (error) => {
      console.error("Erro na criação do gerente:", error);
      toast.error("Erro ao criar gerente");
    },
  });
};
