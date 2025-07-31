/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface AssignCoordenadorData {
  coordenadorId: string;
  role: "coordenador" | "coordenador_geral";
}

export const useAssignCoordenador = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AssignCoordenadorData) => {
      const response = await apiClient.post("/coordenadores/assign", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Coordenador atribuído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["coordenadores"] });
      queryClient.invalidateQueries({ queryKey: ["all-coordenadores"] });
    },
    onError: (error: any) => {
      console.error("Erro ao atribuir coordenador:", error);
      toast.error(
        error.response?.data?.error || "Erro ao atribuir coordenador"
      );
    },
  });
};
