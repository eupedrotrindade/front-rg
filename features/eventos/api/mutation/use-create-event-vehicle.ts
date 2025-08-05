import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createEventVehicle,
  CreateEventVehicleData,
} from "../../actions/create-event-vehicle";
import { toast } from "sonner";

export const useCreateEventVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventVehicleData) => createEventVehicle(data),
    onSuccess: (data, variables) => {
      toast.success("Veículo adicionado com sucesso!");
      // Invalidar todas as queries relacionadas a event-vehicles
      queryClient.invalidateQueries({
        queryKey: ["event-vehicles"],
      });
      // Invalidar queries específicas do evento
      queryClient.invalidateQueries({
        queryKey: ["event-vehicles", variables.eventId],
      });
      // Forçar refetch das queries
      queryClient.refetchQueries({
        queryKey: ["event-vehicles", variables.eventId],
      });
    },
    onError: (error: any) => {
      console.error("Erro ao criar veículo:", error);
      const message =
        error?.response?.data?.error || "Erro ao adicionar veículo";
      toast.error(message);
    },
  });
};
