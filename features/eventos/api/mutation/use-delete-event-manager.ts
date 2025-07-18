import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEventManager } from "../../actions/delete-event-manager";
import { toast } from "sonner";

export const useDeleteEventManager = () => {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { id: string; performedBy: string }>({
    mutationFn: ({ id, performedBy }) => deleteEventManager(id, performedBy),
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["event-managers"] });
        toast.success("Gerente excluído com sucesso!");
      } else {
        toast.error("Erro ao excluir gerente");
      }
    },
    onError: (error) => {
      console.error("Erro na exclusão do gerente:", error);
      toast.error("Erro ao excluir gerente");
    },
  });
};
