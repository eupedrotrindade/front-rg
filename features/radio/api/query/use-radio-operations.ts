import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { RadioOperation } from "@/app/(workspaces)/eventos/[id]/radios/types";

export interface RadioOperationsResponse {
  data: RadioOperation[];
}

export const useRadioOperations = (assignmentId: string) => {
  return useQuery({
    queryKey: ["radio-operations", assignmentId],
    queryFn: async (): Promise<RadioOperationsResponse> => {
      const response = await apiClient.get(
        `/radios/assignments/${assignmentId}/operations`
      );
      return response.data;
    },
    enabled: !!assignmentId,
  });
};
