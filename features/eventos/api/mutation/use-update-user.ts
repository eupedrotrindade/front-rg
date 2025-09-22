import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UpdateUserData {
  userId: string;
  firstName?: string;
  lastName?: string;
  metadata?: {
    role?: 'admin' | 'coordenador-geral';
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
      // Por enquanto, apenas simular sucesso
      // A implementação completa requer mudanças no backend
      toast.info('Funcionalidade de edição será implementada em breve');

      return {
        success: true,
        message: 'Edição de usuários em desenvolvimento'
      };
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas a usuários
      queryClient.invalidateQueries({ queryKey: ["coordenadores"] });
      queryClient.invalidateQueries({ queryKey: ["all-coordenadores"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar usuário:", error);
      throw error;
    },
  });
};