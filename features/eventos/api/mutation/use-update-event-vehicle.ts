import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateEventVehicle, UpdateEventVehicleData } from "../../actions/update-event-vehicle";
import { toast } from "sonner";

export const useUpdateEventVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventVehicleData }) =>
      updateEventVehicle(id, data),
    onSuccess: () => {
      toast.success("Veículo atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["event-vehicles"] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar veículo:", error);
      const message = error?.response?.data?.error || "Erro ao atualizar veículo";
      toast.error(message);
    },
  });
}; 