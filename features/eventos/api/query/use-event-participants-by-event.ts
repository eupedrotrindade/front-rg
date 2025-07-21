import { useQuery } from "@tanstack/react-query";
import { EventParticipant } from "@/features/eventos/types";
import { getEventParticipantsByEvent } from "../../actions/get-event-participant";

export const useEventParticipantsByEvent = (eventId: string) => {
  return useQuery<EventParticipant[]>({
    queryKey: ["event-participants", { eventId }],
    queryFn: async () => {
      const data = await getEventParticipantsByEvent(eventId);
      const participants = Array.isArray(data) ? data : [];
      console.log(
        `🔍 Participantes encontrados para evento ${eventId}:`,
        participants.length
      );
      return participants;
    },
    enabled: !!eventId,
  });
};
