import { useQuery } from "@tanstack/react-query";
import { Event, PaginationParams } from "@/features/eventos/types";
import { getEvent, getEventAll } from "../../actions/get-event";

export const useEventos = (params?: PaginationParams & { id?: string }) => {
  return useQuery<Event[] | Event | null>({
    queryKey: ["eventos", params],
    queryFn: async () => {
      if (params?.id) {
        // Busca por evento específico
        const data = await getEvent(params.id);
        return data || null;
      }
      // Busca todos os eventos
      const data = await getEventAll(params);
      console.log("HOOK", data);
      return Array.isArray(data) ? data : [];
    },
  });
};
