import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export const useDeleteEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/empresas/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Empresa removida com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["all-empresas"] });
      
      // Invalidar todas as empresas por evento
      queryClient.invalidateQueries({ queryKey: ["empresas-by-event"] });
    },
    onError: (error: any) => {
      console.error("Erro ao remover empresa:", error);
      toast.error(error.response?.data?.error || "Erro ao remover empresa");
    },
  });
}; 