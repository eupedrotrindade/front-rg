/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { EventParticipant } from "@/features/eventos/types";
import { apiClient } from "@/lib/api-client";

interface UseEventParticipantsByShiftParams {
  eventId: string;
  shiftId: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const useEventParticipantsByShift = ({
  eventId,
  shiftId,
  search,
  sortBy = "name",
  sortOrder = "asc",
}: UseEventParticipantsByShiftParams) => {
  return useQuery<EventParticipant[]>({
    queryKey: [
      "event-participants-by-shift",
      { eventId, shiftId, search, sortBy, sortOrder },
    ],
    queryFn: async () => {
      try {
        const params: Record<string, any> = {};
        if (search) params.search = search;
        if (sortBy) params.sortBy = sortBy;
        if (sortOrder) params.sortOrder = sortOrder;

        const { data } = await apiClient.get<{
          data: EventParticipant[];
          total: number;
        }>(
          `/event-participants/event/${eventId}/shift/${encodeURIComponent(
            shiftId
          )}`,
          { params }
        );

        console.log(
          `🔍 Participantes encontrados para evento ${eventId} no turno ${shiftId}:`,
          data?.data?.length || 0
        );

        // Verificar se a resposta tem a estrutura esperada
        if (data && typeof data === "object" && "data" in data) {
          return Array.isArray(data.data) ? data.data : [];
        }

        // Fallback para resposta direta (compatibilidade)
        if (Array.isArray(data)) {
          return data;
        }

        return [];
      } catch (error: any) {
        if (error?.status === 404) {
          console.log(`Nenhum participante encontrado para o turno ${shiftId}`);
          return [];
        }
        console.error("Erro ao buscar participantes por turno:", error);
        throw new Error("Erro interno do servidor");
      }
    },
    enabled: !!eventId && !!shiftId,
  });
};
