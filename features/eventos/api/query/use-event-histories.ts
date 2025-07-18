import { useQuery } from "@tanstack/react-query";
import { EventHistory, PaginationParams } from "@/features/eventos/types";
import { getEventHistoryAll } from "../../actions/get-event-history";

export const useEventHistories = (params?: PaginationParams) => {
  return useQuery<EventHistory[]>({
    queryKey: ["event-histories", params],
    queryFn: async () => {
      console.log("🔄 Hook useEventHistories executando...");
      const data = await getEventHistoryAll(params);
      console.log("📦 Dados retornados da action:", data);
      const result = Array.isArray(data) ? data : [];
      console.log("✅ Resultado final do hook:", result);
      return result;
    },
  });
};
