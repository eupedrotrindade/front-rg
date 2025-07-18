import { useQuery } from "@tanstack/react-query";
import { EventParticipant, PaginationParams } from "@/features/eventos/types";
import { getEventParticipantAll } from "../../actions/get-event-participant";

export const useEventParticipants = (params?: PaginationParams) => {
  return useQuery<EventParticipant[]>({
    queryKey: ["event-participants", params],
    queryFn: async () => {
      console.log("🔄 Hook useEventParticipants executando...");
      const data = await getEventParticipantAll(params);
      console.log("📦 Dados retornados da action:", data);
      const result = Array.isArray(data) ? data : [];
      console.log("✅ Resultado final do hook:", result);
      return result;
    },
  });
};
