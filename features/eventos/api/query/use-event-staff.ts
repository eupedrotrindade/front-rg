import { useQuery } from "@tanstack/react-query";
import { EventStaff, PaginationParams } from "@/features/eventos/types";
import {
  getEventStaffAll,
  getEventStaffByEvent,
} from "../../actions/get-event-staff";

export const useEventStaff = (params?: PaginationParams) => {
  return useQuery<EventStaff[]>({
    queryKey: ["event-staff", params],
    queryFn: async () => {
      console.log("🔄 Hook useEventStaff executando...");
      const data = await getEventStaffAll(params);
      console.log("📦 Dados retornados da action:", data);
      const result = Array.isArray(data) ? data : [];
      console.log("✅ Resultado final do hook:", result);
      return result;
    },
  });
};

export const useEventStaffByEvent = (eventId: string) => {
  return useQuery<EventStaff[]>({
    queryKey: ["event-staff-by-event", eventId],
    queryFn: async () => {
      console.log(
        "🔄 Hook useEventStaffByEvent executando para evento:",
        eventId
      );
      const data = await getEventStaffByEvent(eventId);
      console.log("📦 Dados retornados da action:", data);
      const result = Array.isArray(data) ? data : [];
      console.log("✅ Resultado final do hook:", result);
      return result;
    },
    enabled: !!eventId, // Só executa se eventId existir
  });
};
