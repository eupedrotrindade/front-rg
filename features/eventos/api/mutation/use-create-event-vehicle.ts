import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEventVehicle, CreateEventVehicleData } from "../../actions/create-event-vehicle";
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
      queryClient.invalidateQueries({
        queryKey: ["event-vehicles-by-event"],
      });
    },
    onError: (error: any) => {
      console.error("Erro ao criar veículo:", error);
      const message = error?.response?.data?.error || "Erro ao adicionar veículo";
      toast.error(message);
    },
  });
}; 