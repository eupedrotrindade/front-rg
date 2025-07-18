import { useQuery } from "@tanstack/react-query";
import { EventWristband, PaginationParams } from "@/features/eventos/types";
import {
  getEventWristbandAll,
  getEventWristbandByEvent,
} from "../../actions/get-event-wristband";

export const useEventWristbands = (params?: PaginationParams) => {
  return useQuery<EventWristband[]>({
    queryKey: ["event-wristbands", params],
    queryFn: async () => {
      console.log("🔄 Hook useEventWristbands executando...");
      const data = await getEventWristbandAll(params);
      console.log("📦 Dados retornados da action:", data);
      const result = Array.isArray(data) ? data : [];
      console.log("✅ Resultado final do hook:", result);
      return result;
    },
  });
};

export const useEventWristbandsByEvent = (eventId: string) => {
  return useQuery<EventWristband[]>({
    queryKey: ["event-wristbands-by-event", eventId],
    queryFn: async () => {
      console.log(
        "🔄 Hook useEventWristbandsByEvent executando para evento:",
        eventId
      );
      const data = await getEventWristbandByEvent(eventId);
      console.log("📦 Dados retornados da action:", data);
      const result = Array.isArray(data) ? data : [];
      console.log("✅ Resultado final do hook:", result);
      return result;
    },
    enabled: !!eventId, // Só executa se eventId existir
  });
};
