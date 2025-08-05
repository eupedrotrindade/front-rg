import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rejectImportRequest } from '@/features/eventos/actions/reject-import-request'
import type { RejectImportRequestRequest } from '@/features/eventos/types'
import { toast } from 'sonner'

export const useRejectImportRequest = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: RejectImportRequestRequest }) => 
            rejectImportRequest(id, data),
        onSuccess: () => {
            toast.success('Solicitação de importação rejeitada')
            queryClient.invalidateQueries({ queryKey: ['import-requests'] })
        },
        onError: (error) => {
            console.error('Erro ao rejeitar solicitação de importação:', error)
            toast.error('Erro ao rejeitar solicitação de importação')
        }
    })
} 