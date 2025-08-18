import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createBadgePickup,
  updateBadgePickup,
  deleteBadgePickup,
  processBadgePickup,
  bulkCreateBadgePickups,
  CreateBadgePickupData,
  UpdateBadgePickupData,
  BadgePickupRetrieveData,
  BulkCreateBadgePickupData
} from '../../actions/badge-pickup'

// Hook para criar badge pickup
export const useCreateBadgePickup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBadgePickup,
    onSuccess: (data) => {
      // Invalidar cache da lista de badge pickups para o evento
      queryClient.invalidateQueries({
        queryKey: ['badge-pickups', 'by-event', data.eventId]
      })
      // Invalidar cache das estatísticas
      queryClient.invalidateQueries({
        queryKey: ['badge-pickup-stats', data.eventId]
      })
      toast.success(`Entrada de crachá criada para ${data.nome}`)
    },
    onError: (error: any) => {
      console.error('Erro ao criar entrada de crachá:', error)
      toast.error(error?.response?.data?.error || 'Erro ao criar entrada de crachá')
    }
  })
}

// Hook para atualizar badge pickup
export const useUpdateBadgePickup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBadgePickupData }) =>
      updateBadgePickup(id, data),
    onSuccess: (data) => {
      // Invalidar cache específico do badge pickup
      queryClient.invalidateQueries({
        queryKey: ['badge-pickup', data.id]
      })
      // Invalidar cache da lista para o evento
      queryClient.invalidateQueries({
        queryKey: ['badge-pickups', 'by-event', data.eventId]
      })
      // Invalidar cache das estatísticas
      queryClient.invalidateQueries({
        queryKey: ['badge-pickup-stats', data.eventId]
      })
      toast.success('Entrada de crachá atualizada')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar entrada de crachá:', error)
      toast.error(error?.response?.data?.error || 'Erro ao atualizar entrada de crachá')
    }
  })
}

// Hook para deletar badge pickup
export const useDeleteBadgePickup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, eventId }: { id: string; eventId: string }) => {
      // Passamos eventId junto para usar no onSuccess
      return deleteBadgePickup(id).then(() => ({ id, eventId }))
    },
    onSuccess: ({ eventId }) => {
      // Invalidar cache da lista para o evento
      queryClient.invalidateQueries({
        queryKey: ['badge-pickups', 'by-event', eventId]
      })
      // Invalidar cache das estatísticas
      queryClient.invalidateQueries({
        queryKey: ['badge-pickup-stats', eventId]
      })
      toast.success('Entrada de crachá removida')
    },
    onError: (error: any) => {
      console.error('Erro ao deletar entrada de crachá:', error)
      toast.error(error?.response?.data?.error || 'Erro ao deletar entrada de crachá')
    }
  })
}

// Hook para processar retirada de crachá
export const useProcessBadgePickup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BadgePickupRetrieveData }) =>
      processBadgePickup(id, data),
    onSuccess: (data) => {
      // Invalidar cache específico do badge pickup
      queryClient.invalidateQueries({
        queryKey: ['badge-pickup', data.id]
      })
      // Invalidar cache da lista para o evento
      queryClient.invalidateQueries({
        queryKey: ['badge-pickups', 'by-event', data.eventId]
      })
      // Invalidar cache das estatísticas
      queryClient.invalidateQueries({
        queryKey: ['badge-pickup-stats', data.eventId]
      })

      const description = data.isSelfPickup
        ? `Crachá retirado pela própria pessoa: "${data.nome}"`
        : `Crachá de "${data.nome}" retirado por "${data.pickedUpBy}" ${data.pickerCompany ? `da empresa "${data.pickerCompany}"` : ''}`

      toast.success(description)
    },
    onError: (error: any) => {
      console.error('Erro ao processar retirada de crachá:', error)
      toast.error(error?.response?.data?.error || 'Erro ao processar retirada de crachá')
    }
  })
}

// Hook para importação em lote
export const useBulkCreateBadgePickups = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkCreateBadgePickups,
    onSuccess: (data) => {
      if (data.length > 0) {
        const eventId = data[0].eventId
        // Invalidar cache da lista para o evento
        queryClient.invalidateQueries({
          queryKey: ['badge-pickups', 'by-event', eventId]
        })
        // Invalidar cache das estatísticas
        queryClient.invalidateQueries({
          queryKey: ['badge-pickup-stats', eventId]
        })
        toast.success(`${data.length} entradas de crachá importadas com sucesso`)
      }
    },
    onError: (error: any) => {
      console.error('Erro ao importar badges em lote:', error)
      toast.error(error?.response?.data?.error || 'Erro ao importar badges em lote')
    }
  })
}