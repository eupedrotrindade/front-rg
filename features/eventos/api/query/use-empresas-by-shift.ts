import { useQuery } from "@tanstack/react-query";
import { Empresa } from "@/features/eventos/types";
import { apiClient } from "@/lib/api-client";

interface UseEmpresasByShiftParams {
  eventId: string;
  shiftId?: string;
  workDate?: string;
  workStage?: string;
  workPeriod?: string;
  enabled?: boolean;
}

export const useEmpresasByShift = ({
  eventId,
  shiftId,
  workDate,
  workStage,
  workPeriod,
  enabled = true,
}: UseEmpresasByShiftParams) => {
  return useQuery<Empresa[]>({
    queryKey: ["empresas-by-shift", { eventId, shiftId, workDate, workStage, workPeriod }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (workDate) params.append("workDate", workDate);
      if (workStage) params.append("workStage", workStage);
      if (workPeriod) params.append("workPeriod", workPeriod);
      if (shiftId) params.append("shiftId", shiftId);

      const { data } = await apiClient.get<{ data: Empresa[] }>(
        `/empresas/event/${eventId}/shifts`,
        { params }
      );
      
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: enabled && !!eventId,
  });
};