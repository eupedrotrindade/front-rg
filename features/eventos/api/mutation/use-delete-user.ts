import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/coordenadores/${id}/delete-user`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Usuário removido do sistema com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["coordenadores"] });
      queryClient.invalidateQueries({ queryKey: ["all-coordenadores"] });
    },
    onError: (error: any) => {
      console.error("Erro ao remover usuário:", error);
      toast.error(error.response?.data?.error || "Erro ao remover usuário do sistema");
    },
  });
};