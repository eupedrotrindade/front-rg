import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEventVehicle } from "../../actions/delete-event-vehicle";
import { toast } from "sonner";

export const useDeleteEventVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEventVehicle(id),
    onSuccess: () => {
      toast.success("Veículo removido com sucesso!");
      // Invalidar todas as queries relacionadas a event-vehicles
      queryClient.invalidateQueries({ queryKey: ["event-vehicles"] });
      // Forçar refetch das queries
      queryClient.refetchQueries({
        queryKey: ["event-vehicles"],
      });
    },
    onError: (error: any) => {
      console.error("Erro ao remover veículo:", error);
      const message = error?.response?.data?.error || "Erro ao remover veículo";
      toast.error(message);
    },
  });
};
