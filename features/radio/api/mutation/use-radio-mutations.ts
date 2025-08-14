import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateRadioData, UpdateRadioData } from "../../types";
import { createRadio, updateRadio, deleteRadio } from "../../actions/radio-actions";
import { apiClient } from "@/lib/api-client";

export const useCreateRadio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (radioData: CreateRadioData) => {
      const result = await createRadio(radioData);
      if (!result) {
        throw new Error("Erro ao criar rádio");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radios"] });
      toast.success("Rádio criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar rádio:", error);
      toast.error("Erro ao criar rádio");
    },
  });
};

export const useCreateMultipleRadios = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      radios: Array<{
        event_id: string;
        radio_code: string;
        status?: string;
        stage?: string;
      }>;
    }) => {
      const response = await apiClient.post("/radios/create", data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["available-radios"] });
      queryClient.invalidateQueries({ queryKey: ["radios"] });
      toast.success(data.message || `${variables.radios.length} rádio(s) criado(s) com sucesso!`);
    },
    onError: (error: any) => {
      console.error("Erro ao criar rádios:", error);
      const errorMessage = error?.response?.data?.error || "Erro ao criar rádios";
      toast.error(errorMessage);
    },
  });
};

export const useUpdateRadio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, radioData }: { id: string; radioData: UpdateRadioData }) => {
      const result = await updateRadio(id, radioData);
      if (!result) {
        throw new Error("Erro ao atualizar rádio");
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["radios"] });
      queryClient.invalidateQueries({ queryKey: ["radio", data.id] });
      toast.success("Rádio atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar rádio:", error);
      toast.error("Erro ao atualizar rádio");
    },
  });
};

export const useDeleteRadio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const success = await deleteRadio(id);
      if (!success) {
        throw new Error("Erro ao deletar rádio");
      }
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radios"] });
      toast.success("Rádio deletado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar rádio:", error);
      toast.error("Erro ao deletar rádio");
    },
  });
}; 