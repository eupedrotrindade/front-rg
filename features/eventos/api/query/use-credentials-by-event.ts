import { useQuery } from "@tanstack/react-query";
import { Credential } from "@/features/eventos/types";
import { getCredentialByEvent } from "../../actions/get-credential";

export const useCredentialsByEvent = (eventId: string) => {
  return useQuery<Credential[]>({
    queryKey: ["credentials-by-event", eventId],
    queryFn: async () => {
      const data = await getCredentialByEvent(eventId);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!eventId,
  });
}; 