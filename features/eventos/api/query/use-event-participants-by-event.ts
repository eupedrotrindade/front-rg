import { useQuery } from "@tanstack/react-query";
import { EventParticipant } from "@/features/eventos/types";
import { getEventParticipantsByEvent } from "../../actions/get-event-participant";

interface UseEventParticipantsByEventParams {
  eventId: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const useEventParticipantsByEvent = ({
  eventId,
  search,
  sortBy = "name",
  sortOrder = "asc",
}: UseEventParticipantsByEventParams) => {
  return useQuery<EventParticipant[]>({
    queryKey: ["event-participants", { eventId, search, sortBy, sortOrder }],
    queryFn: async () => {
      const data = await getEventParticipantsByEvent(
        eventId,
        search,
        sortBy,
        sortOrder
      );
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
