import { apiClient } from "@/lib/api-client"
import type { RejectImportRequestRequest, ImportRequest } from "../types"

export const rejectImportRequest = async (id: string, data: RejectImportRequestRequest): Promise<ImportRequest> => {
    try {
        const response = await apiClient.patch(`/import-requests/${id}/reject`, data)
        return response.data
    } catch (error) {
        console.error('Erro ao rejeitar solicitação de importação:', error)
        throw new Error('Erro ao rejeitar solicitação de importação')
    }
} 