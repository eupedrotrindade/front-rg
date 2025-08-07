import { useQuery } from "@tanstack/react-query";
import { getMovementCredentials } from "../../actions/movement-credentials";
import { MovementCredential } from "@/app/utils/interfaces/movement-credentials";

export const useMovementCredential = (eventId: string) => {
  return useQuery<MovementCredential[]>({
    queryKey: ["movement-credential-by-event", eventId],
    queryFn: async () => {
      const data = await getMovementCredentials({ eventId: eventId });
      console.log("SUPERRR TESTE", data.data);
      return Array.isArray(data.data) ? data.data : [];
    },
    enabled: !!eventId,
  });
};
