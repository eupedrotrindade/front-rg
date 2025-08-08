import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { UpdateEmpresaRequest, Empresa } from "@/features/eventos/types";

export const useUpdateEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmpresaRequest }) => {
      const response = await apiClient.put<Empresa>(`/empresas/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success("Empresa atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["all-empresas"] });
      
      // Invalidar cache específica para empresas por evento  
      if (variables.data.id_evento) {
        queryClient.invalidateQueries({ queryKey: ["empresas-by-event", variables.data.id_evento] });
      }
      
      // Invalidar todas as empresas por evento para garantir
      queryClient.invalidateQueries({ queryKey: ["empresas-by-event"] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar empresa:", error);
      toast.error(error.response?.data?.error || "Erro ao atualizar empresa");
    },
  });
}; 