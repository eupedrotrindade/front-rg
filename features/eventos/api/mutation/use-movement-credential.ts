import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMovementCredentials } from "../../actions/movement-credentials";
import { MovementCredential } from "@/app/utils/interfaces/movement-credentials";

export const useMovementCredential = (eventId: string) => {
  return useQuery<MovementCredential[]>({
    queryKey: ["movement-credential-by-event", eventId],
    queryFn: async () => {
      const data = await getMovementCredentials({ eventId: eventId });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!eventId,
  });
};
