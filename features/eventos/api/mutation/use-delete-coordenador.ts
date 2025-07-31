import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export const useDeleteCoordenador = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/coordenadores/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Coordenador removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["coordenadores"] });
      queryClient.invalidateQueries({ queryKey: ["all-coordenadores"] });
    },
    onError: (error: any) => {
      console.error("Erro ao remover coordenador:", error);
      toast.error(error.response?.data?.error || "Erro ao remover coordenador");
    },
  });
};
