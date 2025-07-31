import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface UpdateCoordenadorData {
  id: string;
  firstName: string;
  lastName: string;
  role: "coordenador" | "coordenador_geral";
}

export const useUpdateCoordenador = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateCoordenadorData) => {
      const { id, ...updateData } = data;
      const response = await apiClient.put(`/coordenadores/${id}`, updateData);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Coordenador atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["coordenadores"] });
      queryClient.invalidateQueries({ queryKey: ["all-coordenadores"] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar coordenador:", error);
      toast.error(
        error.response?.data?.error || "Erro ao atualizar coordenador"
      );
    },
  });
};
