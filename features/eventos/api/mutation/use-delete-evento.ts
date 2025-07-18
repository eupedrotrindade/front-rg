import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEvent } from "../../actions/delete-event";

export const useDeleteEvento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      performedBy,
    }: {
      id: string;
      performedBy: string;
    }) => {
      console.log("🔄 Iniciando exclusão do evento:", { id, performedBy });

      const success = await deleteEvent(id, performedBy);
      if (!success) {
        throw new Error(
          "Falha ao excluir evento. Verifique se o evento existe e tente novamente."
        );
      }

      console.log("✅ Evento excluído com sucesso:", id);
      return id;
    },
    onSuccess: (id) => {
      console.log("🔄 Invalidando queries após exclusão:", id);
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["event-managers"] });
      queryClient.invalidateQueries({ queryKey: ["event-staff"] });
      queryClient.invalidateQueries({ queryKey: ["event-wristbands"] });
      queryClient.invalidateQueries({ queryKey: ["event-participants"] });
    },
    onError: (error) => {
      console.error("❌ Erro na mutation de exclusão:", error);
    },
  });
};
