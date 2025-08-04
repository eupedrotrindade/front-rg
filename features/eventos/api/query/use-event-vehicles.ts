import { useQuery } from "@tanstack/react-query";
import { getEventVehicles } from "../../actions/get-event-vehicles";

export const useEventVehicles = (eventId: string) => {
  return useQuery({
    queryKey: ["event-vehicles", eventId],
    queryFn: async () => {
      console.log("🔄 Hook useEventVehicles executando para evento:", eventId);
      const data = await getEventVehicles(eventId);
      console.log("📦 Dados retornados da action:", data);
      const result = Array.isArray(data) ? data : [];
      console.log("✅ Resultado final do hook:", result);
      return result;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });
};
