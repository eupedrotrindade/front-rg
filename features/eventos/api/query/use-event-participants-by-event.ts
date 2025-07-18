import { useQuery } from "@tanstack/react-query";
import { EventParticipant } from "@/features/eventos/types";
import { getEventParticipantAll } from "../../actions/get-event-participant";

export const useEventParticipantsByEvent = (eventId: string) => {
  return useQuery<EventParticipant[]>({
    queryKey: ["event-participants", { eventId }],
    queryFn: async () => {
      // Buscar todos os participantes primeiro
      const data = await getEventParticipantAll();
      const allParticipants = Array.isArray(data) ? data : [];

      // Filtrar por evento específico
      const filteredParticipants = allParticipants.filter(
        (participant) => participant.eventId === eventId
      );

      console.log(
        `🔍 Participantes encontrados para evento ${eventId}:`,
        filteredParticipants.length
      );
      return filteredParticipants;
    },
    enabled: !!eventId,
  });
};
