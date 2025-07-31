import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface CreateCoordenadorData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: "coordenador" | "coordenador_geral";
}

export const useCreateCoordenador = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCoordenadorData) => {
      const response = await apiClient.post("/coordenadores", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Coordenador criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["coordenadores"] });
      queryClient.invalidateQueries({ queryKey: ["all-coordenadores"] });
    },
    onError: (error: any) => {
      console.error("Erro ao criar coordenador:", error);
      toast.error(error.response?.data?.error || "Erro ao criar coordenador");
    },
  });
}; 