import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { EventParticipantSchema } from "@/features/eventos/schemas";
import { toast } from "sonner";

export const useCreateEventParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novoParticipant: EventParticipantSchema) => {
      console.log("🔄 HOOK CREATE - useCreateEventParticipant");
      console.log("📨 Dados recebidos no hook de criação:", {
        nome: novoParticipant.name,
        cpf: novoParticipant.cpf,
        eventoId: novoParticipant.eventId,
        daysWork: novoParticipant.daysWork,
        shiftId: novoParticipant.shiftId,
        workDate: novoParticipant.workDate,
        workStage: novoParticipant.workStage,
        workPeriod: novoParticipant.workPeriod,
        dadosCompletos: novoParticipant,
      });

      const { data } = await apiClient.post(
        "/event-participants",
        novoParticipant
      );

      console.log("✅ HOOK CREATE - Participante criado com sucesso:", data);
      return data;
    },
    onSuccess: (data, variables) => {
      console.log("✅ HOOK CREATE - onSuccess executado:", {
        participanteCriado: data,
        dadosOriginais: variables,
      });
      queryClient.invalidateQueries({ queryKey: ["event-participants"] });
      queryClient.invalidateQueries({
        queryKey: ["event-participants-by-event"],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-participants-grouped"],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-participants-by-shift"],
      });
      // Note: removendo toast para não fazer spam durante replicação em massa
      // toast.success("Participante criado com sucesso!");
    },
    onError: (error, variables) => {
      console.error("❌ HOOK CREATE - Erro na criação:", error);
      console.error("❌ Dados que causaram erro:", variables);
      // Note: removendo toast para não fazer spam durante replicação em massa
      // toast.error("Erro ao criar participante");
    },
  });
};
