import { useQuery } from "@tanstack/react-query";
import { Event, PaginationParams } from "@/features/eventos/types";
import { getEventAll } from "../../actions/get-event";

export const useEventos = (params?: PaginationParams) => {
  return useQuery<Event[]>({
    queryKey: ["eventos", params],
    queryFn: async () => {
      const data = await getEventAll(params);
      return Array.isArray(data) ? data : [];
    },
  });
};
