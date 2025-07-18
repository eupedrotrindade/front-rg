import { useQuery } from "@tanstack/react-query";
import { EventManager, PaginationParams } from "@/features/eventos/types";
import { getEventManagerAll } from "../../actions/get-event-manager";

export const useEventManagers = (params?: PaginationParams) => {
  return useQuery<EventManager[]>({
    queryKey: ["event-managers", params],
    queryFn: async () => {
      console.log("🔄 Hook useEventManagers executando...");
      const data = await getEventManagerAll(params);
      console.log("📦 Dados retornados da action:", data);
      const result = Array.isArray(data) ? data : [];
      console.log("✅ Resultado final do hook:", result);
      return result;
    },
  });
};
