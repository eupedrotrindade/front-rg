import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export const useVincularEmpresaEvento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ empresaId, eventoId }: { empresaId: string; eventoId: string }) => {
      const response = await apiClient.post("/empresas/event", {
        empresaId,
        eventoId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Empresa vinculada ao evento com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["empresas-by-event"] });
      queryClient.invalidateQueries({ queryKey: ["all-empresas"] });
    },
    onError: (error: any) => {
      console.error("Erro ao vincular empresa ao evento:", error);
      toast.error(error.response?.data?.error || "Erro ao vincular empresa ao evento");
    },
  });
}; 