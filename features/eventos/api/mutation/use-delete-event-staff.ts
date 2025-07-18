import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEventStaff } from "../../actions/delete-event-staff";
import { toast } from "sonner";

export const useDeleteEventStaff = () => {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { id: string; performedBy: string }>({
    mutationFn: ({ id, performedBy }) => deleteEventStaff(id, performedBy),
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["event-staff"] });
        toast.success("Staff excluído com sucesso!");
      } else {
        toast.error("Erro ao excluir staff");
      }
    },
    onError: (error) => {
      console.error("Erro na exclusão do staff:", error);
      toast.error("Erro ao excluir staff");
    },
  });
};
