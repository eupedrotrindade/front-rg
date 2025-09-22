/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface UpdateUserData {
  userId: string;
  firstName?: string;
  lastName?: string;
  role?: "admin" | "coordenador" | "coordenador_geral";
  metadata?: {
    role?: "admin" | "coordenador-geral";
    eventos?: Array<{
      id: string;
      nome_evento: string;
      role: string;
    }>;
  };
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserData) => {
      const { userId, metadata, ...updateData } = data;

      // Determinar o role correto para o backend
      let backendRole: "admin" | "coordenador" | "coordenador_geral" = "coordenador";

      if (metadata?.role === "admin") {
        backendRole = "admin";
      } else if (metadata?.role === "coordenador-geral") {
        backendRole = "coordenador_geral";
      } else {
        backendRole = "coordenador";
      }

      // Preparar payload
      const payload: any = {
        ...updateData,
        role: backendRole,
      };

      // Adicionar eventId obrigatório para todos os casos
      if (backendRole === "coordenador" && metadata?.eventos && metadata.eventos.length > 0) {
        payload.eventId = metadata.eventos[0].id;
      } else {
        // Para admin, coordenador_geral ou coordenadores sem eventos específicos
        payload.eventId = "general";
      }

      const response = await apiClient.put(`/coordenadores/${userId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      // Invalidar todas as queries relacionadas a usuários
      queryClient.invalidateQueries({ queryKey: ["coordenadores"] });
      queryClient.invalidateQueries({ queryKey: ["all-coordenadores"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar usuário:", error);
      toast.error(error.response?.data?.error || "Erro ao atualizar usuário");
    },
  });
};
