import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveImportRequest } from "@/features/eventos/actions/approve-import-request";
import type { ApproveImportRequestRequest } from "@/features/eventos/types";
import { toast } from "sonner";

export const useApproveImportRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ApproveImportRequestRequest;
    }) => approveImportRequest(id, data),
    onSuccess: () => {
      toast.success("Solicitação de importação aprovada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["import-requests"] });
    },
    onError: (error) => {
      console.error("Erro ao aprovar solicitação de importação:", error);
      toast.error("Erro ao aprovar solicitação de importação");
    },
  });
};
