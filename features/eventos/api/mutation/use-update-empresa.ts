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
    onSuccess: () => {
      toast.success("Empresa atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["all-empresas"] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar empresa:", error);
      toast.error(error.response?.data?.error || "Erro ao atualizar empresa");
    },
  });
}; 