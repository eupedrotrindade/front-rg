import { useQuery } from "@tanstack/react-query";
import { Credential } from "@/features/eventos/types";
import { apiClient } from "@/lib/api-client";

interface UseCredentialsByShiftParams {
  eventId: string;
  shiftId?: string;
  workDate?: string;
  workStage?: string;
  workPeriod?: string;
  enabled?: boolean;
}

export const useCredentialsByShift = ({
  eventId,
  shiftId,
  workDate,
  workStage,
  workPeriod,
  enabled = true,
}: UseCredentialsByShiftParams) => {
  return useQuery<Credential[]>({
    queryKey: ["credentials-by-shift", { eventId, shiftId, workDate, workStage, workPeriod }],
    queryFn: async () => {
      // First get all credentials for the event
      const { data: allCredentials } = await apiClient.get<Credential[]>(
        `/credentials/event/${eventId}`
      );
      
      if (!Array.isArray(allCredentials)) return [];
      
      // Filter by shift parameters
      let filteredCredentials = allCredentials;
      
      if (shiftId) {
        filteredCredentials = filteredCredentials.filter(credential => 
          credential.shiftId === shiftId
        );
      }
      
      if (workDate) {
        filteredCredentials = filteredCredentials.filter(credential => 
          credential.workDate === workDate
        );
      }
      
      if (workStage) {
        filteredCredentials = filteredCredentials.filter(credential => 
          credential.workStage === workStage
        );
      }
      
      if (workPeriod) {
        filteredCredentials = filteredCredentials.filter(credential => 
          credential.workPeriod === workPeriod
        );
      }
      
      return filteredCredentials;
    },
    enabled: enabled && !!eventId,
  });
};