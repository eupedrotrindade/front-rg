import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateEventStaffRequest, EventStaff } from "@/features/eventos/types";
import { createEventStaff } from "../../actions/create-event-staff";
import { toast } from "sonner";

export const useCreateEventStaff = () => {
  const queryClient = useQueryClient();

  return useMutation<EventStaff | null, Error, CreateEventStaffRequest>({
    mutationFn: createEventStaff,
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["event-staff"] });
        toast.success("Staff criado com sucesso!");
      } else {
        toast.error("Erro ao criar staff");
      }
    },
    onError: (error) => {
      console.error("Erro na criação do staff:", error);
      toast.error("Erro ao criar staff");
    },
  });
};
