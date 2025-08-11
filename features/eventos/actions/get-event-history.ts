import { apiClient } from '@/lib/api-client'
import { EventHistory, PaginatedResponse } from '../types'

export interface EventHistoryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  entityType?: string
  action?: string
  performedBy?: string
  startDate?: string
  endDate?: string
}

export const getEventHistory = async (
  id: string,
): Promise<EventHistory | null> => {
  try {
    const { data } = await apiClient.get<EventHistory>(`/event-histories/${id}`)
    return data
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return null
  }
}

export const getEventHistories = async (
  params?: EventHistoryParams,
): Promise<PaginatedResponse<EventHistory> | null> => {
  try {
    console.log('🔍 Buscando histórico com params:', params)

    // Filtrar parâmetros undefined ou vazios
    const cleanParams = Object.entries(params || {}).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          acc[key] = value
        }
        return acc
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as Record<string, any>,
    )

    const { data } = await apiClient.get<PaginatedResponse<EventHistory>>(
      '/event-histories',
      { params: cleanParams },
    )

    // console.log("📦 Resposta da API (histórico):", data);
    return data
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error)
    throw error
  }
}

export const getEventHistoryByEntity = async (
  entityId: string,
  params?: Omit<EventHistoryParams, 'entityId'>,
): Promise<PaginatedResponse<EventHistory> | null> => {
  try {
    const cleanParams = Object.entries(params || {}).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          acc[key] = value
        }
        return acc
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as Record<string, any>,
    )

    const { data } = await apiClient.get<PaginatedResponse<EventHistory>>(
      `/event-histories/by-entity/${entityId}`,
      { params: cleanParams },
    )

    return data
  } catch (error) {
    console.error('❌ Erro ao buscar histórico por entidade:', error)
    throw error
  }
}

// Manter compatibilidade com nome antigo
export const getEventHistoryAll = getEventHistories
