import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEventParticipant } from "../../actions/delete-event-participant";
import { toast } from "sonner";

export const useDeleteEventParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { id: string; performedBy: string }>({
    mutationFn: ({ id, performedBy }) =>
      deleteEventParticipant(id, performedBy),
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["event-participants"] });
        toast.success("Participante excluído com sucesso!");
      } else {
        toast.error("Erro ao excluir participante");
      }
    },
    onError: (error) => {
      console.error("Erro na exclusão do participante:", error);
      toast.error("Erro ao excluir participante");
    },
  });
};
