import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateRadioData, UpdateRadioData } from "../../types";
import { createRadio, updateRadio, deleteRadio } from "../../actions/radio-actions";

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