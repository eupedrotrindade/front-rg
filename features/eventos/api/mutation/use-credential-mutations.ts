import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Credential, CreateCredentialRequest, UpdateCredentialRequest } from "@/features/eventos/types";
import { toast } from "sonner";

export const useCreateCredential = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentialData: CreateCredentialRequest) => {
      const { data } = await apiClient.post<Credential>(
        "/credentials",
        credentialData
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Credencial criada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro na criação da credencial:", error);
      toast.error("Erro ao criar credencial");
    },
  });
};

export const useUpdateCredential = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCredentialRequest }) => {
      const { data: responseData } = await apiClient.put<Credential>(
        `/credentials/${id}`,
        data
      );
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Credencial atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro na atualização da credencial:", error);
      toast.error("Erro ao atualizar credencial");
    },
  });
};

export const useDeleteCredential = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, performedBy }: { id: string; performedBy: string }) => {
      const { data } = await apiClient.delete("/credentials", {
        data: { id, performedBy },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Credencial deletada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro na exclusão da credencial:", error);
      toast.error("Erro ao deletar credencial");
    },
  });
};

export const useMarkCredentialAsDistributed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, performedBy }: { id: string; performedBy: string }) => {
      const { data } = await apiClient.patch<Credential>(
        `/credentials/${id}/distribute`,
        { performedBy }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Credencial marcada como distribuída!");
    },
    onError: (error) => {
      console.error("Erro ao marcar credencial como distribuída:", error);
      toast.error("Erro ao marcar credencial como distribuída");
    },
  });
};

export const useSetCredentialActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive, performedBy }: { id: string; isActive: boolean; performedBy: string }) => {
      const { data } = await apiClient.patch<Credential>(
        `/credentials/${id}/active`,
        { isActive, performedBy }
      );
      return data;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast.success(`Credencial ${isActive ? "ativada" : "desativada"} com sucesso!`);
    },
    onError: (error) => {
      console.error("Erro ao alterar status da credencial:", error);
      toast.error("Erro ao alterar status da credencial");
    },
  });
}; 