import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { EventStaffSchema } from "@/features/eventos/schemas";

export const useUpdateEventStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: EventStaffSchema & { id: string }) => {
      const { data } = await apiClient.put(`/event-staff`, { id, ...dados });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-staff"] });
    },
  });
};
