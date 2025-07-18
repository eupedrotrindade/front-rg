import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEventWristband } from "../../actions/delete-event-wristband";
import { toast } from "sonner";

export const useDeleteEventWristband = () => {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { id: string; performedBy: string }>({
    mutationFn: ({ id, performedBy }) => deleteEventWristband(id, performedBy),
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["event-wristbands"] });
        toast.success("Credencial excluída com sucesso!");
      } else {
        toast.error("Erro ao excluir credencial");
      }
    },
    onError: (error) => {
      console.error("Erro na exclusão da credencial:", error);
      toast.error("Erro ao excluir credencial");
    },
  });
};
