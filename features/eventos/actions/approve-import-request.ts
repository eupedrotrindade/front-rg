import { apiClient } from "@/lib/api-client";
import type { ApproveImportRequestRequest, ImportRequest } from "../types";

export const approveImportRequest = async (
  id: string,
  data: ApproveImportRequestRequest
): Promise<ImportRequest> => {
  try {
    const response = await apiClient.patch(
      `/import-requests/${id}/approve`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Erro ao aprovar solicitação de importação:", error);
    throw new Error("Erro ao aprovar solicitação de importação");
  }
};
