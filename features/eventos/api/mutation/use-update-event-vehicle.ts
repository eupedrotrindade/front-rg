/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateEventVehicle,
  UpdateEventVehicleData,
} from "../../actions/update-event-vehicle";
import { toast } from "sonner";

export const useUpdateEventVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventVehicleData }) =>
      updateEventVehicle(id, data),
    onSuccess: (data, variables) => {
      toast.success("Veículo atualizado com sucesso!");
      // Invalidar todas as queries relacionadas a event-vehicles
      queryClient.invalidateQueries({ queryKey: ["event-vehicles"] });
      // Forçar refetch das queries
      queryClient.refetchQueries({
        queryKey: ["event-vehicles"],
      });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar veículo:", error);
      const message =
        error?.response?.data?.error || "Erro ao atualizar veículo";
      toast.error(message);
    },
  });
};
