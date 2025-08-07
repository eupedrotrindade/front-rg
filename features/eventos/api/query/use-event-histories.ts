import { useQuery } from "@tanstack/react-query";
import { EventHistory, PaginatedResponse } from "@/features/eventos/types";
import { getEventHistories, getEventHistoryByEntity, EventHistoryParams } from "../../actions/get-event-history";

export const useEventHistories = (params?: EventHistoryParams) => {
  return useQuery<PaginatedResponse<EventHistory>>({
    queryKey: ["event-histories", params],
    queryFn: async () => {
      console.log("🔄 Hook useEventHistories executando com params:", params);
      const data = await getEventHistories(params);
      console.log("📦 Dados retornados da action:", data);
      
      if (!data) {
        throw new Error("Erro ao carregar histórico de eventos");
      }
      
      console.log("✅ Resultado final do hook:", data);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });
};

export const useEventHistoryByEntity = (
  entityId: string, 
  params?: Omit<EventHistoryParams, 'entityId'>
) => {
  return useQuery<PaginatedResponse<EventHistory>>({
    queryKey: ["event-histories", "by-entity", entityId, params],
    queryFn: async () => {
      console.log("🔄 Hook useEventHistoryByEntity executando para entidade:", entityId, "com params:", params);
      const data = await getEventHistoryByEntity(entityId, params);
      
      if (!data) {
        throw new Error("Erro ao carregar histórico da entidade");
      }
      
      console.log("✅ Resultado final do hook por entidade:", data);
      return data;
    },
    enabled: !!entityId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });
};
