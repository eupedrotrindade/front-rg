/* eslint-disable @typescript-eslint/no-explicit-any */
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
    onSuccess: (data, variables) => {
      toast.success("Empresa criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["all-empresas"] });

      // Invalidar cache específica para empresas por evento
      if (variables.id_evento) {
        queryClient.invalidateQueries({
          queryKey: ["empresas-by-event", variables.id_evento],
        });
      }
    },
    onError: (error: any) => {
      console.error("Erro ao criar empresa:", error);
      toast.error(error.response?.data?.error || "Erro ao criar empresa");
    },
  });
};
