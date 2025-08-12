import { useQuery } from "@tanstack/react-query";
import { Event } from "@/features/eventos/types";
import { getEvent } from "../../actions/get-event";

interface UseEventoParams {
  id: string;
}

export const useEvento = ({ id }: UseEventoParams) => {
  return useQuery<Event | null>({
    queryKey: ["evento", id],
    queryFn: async () => {
      const data = await getEvent(id);
      return data || null;
    },
    enabled: !!id, // Só executa a query se o ID estiver presente
  });
};