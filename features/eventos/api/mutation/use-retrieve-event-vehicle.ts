/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  retrieveEventVehicle,
  RetrieveEventVehicleData,
} from "../../actions/retrieve-event-vehicle";
import { toast } from "sonner";

export const useRetrieveEventVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: RetrieveEventVehicleData;
    }) => retrieveEventVehicle(id, data),
    onSuccess: () => {
      toast.success("Veículo retirado com sucesso!");
      // Invalidar todas as queries relacionadas a event-vehicles
      queryClient.invalidateQueries({ queryKey: ["event-vehicles"] });
      // Forçar refetch das queries
      queryClient.refetchQueries({
        queryKey: ["event-vehicles"],
      });
    },
    onError: (error: any) => {
      console.error("Erro ao retirar veículo:", error);
      const message = error?.response?.data?.error || "Erro ao retirar veículo";
      toast.error(message);
    },
  });
};
