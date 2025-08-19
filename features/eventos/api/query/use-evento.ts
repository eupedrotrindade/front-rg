import { useQuery } from "@tanstack/react-query";
import { Event } from "@/features/eventos/types";
import { getEvent } from "../../actions/get-event";

export const useEvento = (eventId: string) => {
  return useQuery<Event | null>({
    queryKey: ["evento", eventId],
    queryFn: async () => {
      const data = await getEvent(eventId);
      return data || null;
    },
    enabled: !!eventId, // Só executa a query se o ID estiver presente
  });
};
