import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { CreateEmpresaRequest, Empresa } from "@/features/eventos/types";

export const useCreateEmpresa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEmpresaRequest) => {
      const response = await apiClient.post<Empresa>("/empresas", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Empresa criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["all-empresas"] });
    },
    onError: (error: any) => {
      console.error("Erro ao criar empresa:", error);
      toast.error(error.response?.data?.error || "Erro ao criar empresa");
    },
  });
}; 