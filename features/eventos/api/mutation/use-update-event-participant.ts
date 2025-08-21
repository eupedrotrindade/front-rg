import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EventParticipantSchema } from "@/features/eventos/schemas";
import { apiClient } from "@/lib/api-client";

export const useUpdateEventParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dados
    }: EventParticipantSchema & { id: string }) => {
      try {
        console.log("🔄 HOOK MUTATION - useUpdateEventParticipant");
        console.log("📨 Dados recebidos no hook:", {
          participantId: id,
          dadosParaAtualizar: dados,
          endpoint: `/event-participants/${id}`
        });

        const { data } = await apiClient.put(
          `/event-participants/${id}`,
          dados
        );

        console.log("✅ HOOK MUTATION - Resposta recebida:", data);
        return data;
      } catch (error) {
        console.error("❌ HOOK MUTATION - Erro na mutation:", error);
        console.error("❌ Detalhes:", {
          participantId: id,
          dadosEnviados: dados,
          erro: error
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log("✅ HOOK MUTATION - onSuccess executado:", {
        data,
        variables
      });
      queryClient.invalidateQueries({ queryKey: ["event-participants"] });
      queryClient.invalidateQueries({
        queryKey: ["event-participants-by-event"],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-participants-grouped"],
      });
    },
    onError: (error, variables) => {
      console.error("❌ HOOK MUTATION - onError executado:", error);
      console.error("❌ Variáveis que causaram erro:", variables);
    },
  });
};
