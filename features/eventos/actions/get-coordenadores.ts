import { apiClient } from '@/lib/api-client'
import { Coordenador, PaginationParams } from '../types'

export const getCoordenador = async (
  id: string,
): Promise<Coordenador | null> => {
  try {
    const { data } = await apiClient.get<Coordenador>(`/coordenadores/${id}`)
    return data
  } catch (error) {
    console.error('Erro ao buscar coordenador:', error)
    return null
  }
}

export const getCoordenadores = async (
  eventId: string,
  params?: PaginationParams,
): Promise<Coordenador[] | null> => {
  try {
    console.log('🔍 Buscando coordenadores com params:', {
      eventId,
      ...params,
    })
    const { data } = await apiClient.get<{
      data: Coordenador[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pagination: any
    }>('/coordenadores', {
      params: { eventId, ...params },
    })
    // console.log("📦 Resposta da API (coordenadores):", data);
    console.log('📊 Tipo da resposta:', typeof data)
    console.log('📋 É array?', Array.isArray(data))
    if (data && typeof data === 'object' && 'data' in data) {
      console.log('📦 Dados dentro de data.data:', data.data)
      return Array.isArray(data.data) ? data.data : []
    }
    return data
  } catch (error) {
    console.error('❌ Erro ao buscar coordenadores:', error)
    return null
  }
}

export const getAllCoordenadores = async (): Promise<Coordenador[] | null> => {
  try {
    console.log('🔍 Buscando todos os coordenadores disponíveis')
    const { data } = await apiClient.get<{ data: Coordenador[] }>(
      '/coordenadores/all',
    )
    // console.log("📦 Resposta da API (todos coordenadores):", data);
    return data?.data || []
  } catch (error) {
    console.error('❌ Erro ao buscar todos os coordenadores:', error)
    return null
  }
}
