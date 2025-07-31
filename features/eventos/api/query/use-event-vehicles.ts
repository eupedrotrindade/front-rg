import { useQuery } from "@tanstack/react-query";
import { getEventVehicles } from "../../actions/get-event-vehicles";

export const useEventVehicles = (eventId: string) => {
  return useQuery({
    queryKey: ["event-vehicles", eventId],
    queryFn: () => getEventVehicles(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });
};
