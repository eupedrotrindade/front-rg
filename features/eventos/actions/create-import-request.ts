import { apiClient } from "@/lib/api-client"
import type { CreateImportRequestRequest, ImportRequest } from "../types"

export const createImportRequest = async (data: CreateImportRequestRequest): Promise<ImportRequest> => {
    try {
        const response = await apiClient.post('/import-requests', data)
        return response.data
    } catch (error) {
        console.error('Erro ao criar solicitação de importação:', error)
        throw new Error('Erro ao criar solicitação de importação')
    }
} 