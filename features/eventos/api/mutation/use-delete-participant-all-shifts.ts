import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from '@/lib/api-client';
import { toast } from "sonner";

interface DeleteParticipantAllShiftsParams {
  eventId: string;
  participantHash: string;
  performedBy: string;
}

interface DeleteParticipantAllShiftsResponse {
  message: string;
  deleted: boolean;
  deletedCount: number;
}

const deleteParticipantAllShifts = async (
  params: DeleteParticipantAllShiftsParams
): Promise<DeleteParticipantAllShiftsResponse> => {
  const { data } = await apiClient.delete<DeleteParticipantAllShiftsResponse>(
    '/event-participants/all-shifts',
    {
      data: params
    }
  );
  return data;
};

export const useDeleteParticipantAllShifts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteParticipantAllShifts,
    onSuccess: (data, variables) => {
      // Immediately refetch to ensure fresh data
      queryClient.refetchQueries({ 
        queryKey: ["event-participants-by-shift"],
        predicate: (query) => {
          const queryData = query.queryKey[1] as any;
          return queryData?.eventId === variables.eventId;
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
      // Invalidar todas as queries do tipo event-participants-by-shift para este evento
      queryClient.invalidateQueries({ 
        queryKey: ["event-participants-by-shift"],
        predicate: (query) => {
          const queryData = query.queryKey[1] as any;
          return queryData?.eventId === variables.eventId;
        }
      });
      
      console.log(`✅ Participante removido de todos os turnos: ${data.message}`);
    },
    onError: (error: any) => {
      console.error('❌ Erro ao remover participante de todos os turnos:', error);
      toast.error('Erro ao remover participante de todos os turnos. Tente novamente.');
    },
  });
};