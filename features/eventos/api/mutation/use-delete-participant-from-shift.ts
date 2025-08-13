import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from '@/lib/api-client';
import { toast } from "sonner";

interface DeleteParticipantFromShiftParams {
  eventId: string;
  participantHash: string;
  shiftId: string;
  performedBy: string;
}

interface DeleteParticipantFromShiftResponse {
  message: string;
  deleted: boolean;
  remainingShifts: number;
}

const deleteParticipantFromShift = async (
  params: DeleteParticipantFromShiftParams
): Promise<DeleteParticipantFromShiftResponse> => {
  const { data } = await apiClient.delete<DeleteParticipantFromShiftResponse>(
    '/event-participants/shift',
    {
      data: params
    }
  );
  return data;
};

export const useDeleteParticipantFromShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteParticipantFromShift,
    onSuccess: (data, variables) => {
      // Immediately refetch to ensure fresh data
      queryClient.refetchQueries({ 
        queryKey: ["event-participants-by-shift"],
        predicate: (query) => {
          const queryData = query.queryKey[1] as any;
          return queryData?.eventId === variables.eventId && queryData?.shiftId === variables.shiftId;
        }
      });
      // Invalidar queries relacionadas
      // Invalidar todas as queries do tipo event-participants para este evento
      queryClient.invalidateQueries({ 
        queryKey: ["event-participants"],
        predicate: (query) => {
          const queryData = query.queryKey[1] as any;
          return queryData?.eventId === variables.eventId;
        }
      });
      // Invalidar todas as queries do tipo event-participants-grouped para este evento
      queryClient.invalidateQueries({ 
        queryKey: ["event-participants-grouped"],
        predicate: (query) => {
          const queryData = query.queryKey[1] as any;
          return queryData?.eventId === variables.eventId;
        }
      });
      // Invalidar todas as queries do tipo event-participants-by-shift para este evento e turno
      queryClient.invalidateQueries({ 
        queryKey: ["event-participants-by-shift"],
        predicate: (query) => {
          const queryData = query.queryKey[1] as any;
          return queryData?.eventId === variables.eventId && queryData?.shiftId === variables.shiftId;
        }
      });
      
      console.log(`✅ Participante removido do turno: ${data.message}`);
    },
    onError: (error: any) => {
      console.error('❌ Erro ao remover participante do turno:', error);
      toast.error('Erro ao remover participante do turno. Tente novamente.');
    },
  });
};