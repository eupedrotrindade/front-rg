import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createImportRequest } from '@/features/eventos/actions/create-import-request'
import type { CreateImportRequestRequest } from '@/features/eventos/types'
import { toast } from 'sonner'

export const useCreateImportRequest = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateImportRequestRequest) => createImportRequest(data),
        onSuccess: () => {
            toast.success('Solicitação de importação criada com sucesso!')
            queryClient.invalidateQueries({ queryKey: ['import-requests'] })
        },
        onError: (error) => {
            console.error('Erro ao criar solicitação de importação:', error)
            toast.error('Erro ao criar solicitação de importação')
        }
    })
} 