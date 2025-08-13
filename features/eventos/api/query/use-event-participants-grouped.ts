import { useQuery } from "@tanstack/react-query";
import { EventParticipant } from "@/features/eventos/types";
import { apiClient } from '@/lib/api-client';

interface UseEventParticipantsGroupedParams {
  eventId: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GroupedParticipant {
  participantHash: string;
  shifts: EventParticipant[];
  participant: EventParticipant; // Dados base do participante
}

export const useEventParticipantsGrouped = ({
  eventId,
  search,
  sortBy = "name",
  sortOrder = "asc",
}: UseEventParticipantsGroupedParams) => {
  return useQuery<GroupedParticipant[]>({
    queryKey: ["event-participants-grouped", { eventId, search, sortBy, sortOrder }],
    queryFn: async () => {
      try {
        const params: Record<string, any> = {};
        if (search) params.search = search;
        if (sortBy) params.sortBy = sortBy;
        if (sortOrder) params.sortOrder = sortOrder;

        const { data } = await apiClient.get<{
          data: GroupedParticipant[];
          total: number;
        }>(`/event-participants/event/${eventId}/grouped`, { params });

        console.log(`🔍 Participantes agrupados encontrados para evento ${eventId}:`, data?.data?.length || 0);

        // Verificar se a resposta tem a estrutura esperada
        if (data && typeof data === 'object' && 'data' in data) {
          return Array.isArray(data.data) ? data.data : [];
        }

        // Fallback para resposta direta (compatibilidade)
        if (Array.isArray(data)) {
          return data as GroupedParticipant[];
        }

        return [];
      } catch (error: any) {
        if (error?.status === 404) {
          console.log("Nenhum participante encontrado para este evento");
          return [];
        }
        console.error('Erro ao buscar participantes agrupados por evento:', error);
        throw new Error('Erro interno do servidor');
      }
    },
    enabled: !!eventId,
  });
};