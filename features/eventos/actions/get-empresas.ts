import { apiClient } from '@/lib/api-client'
import { Empresa, PaginationParams } from '../types'

export const getEmpresa = async (id: string): Promise<Empresa | null> => {
  try {
    const { data } = await apiClient.get<Empresa>(`/empresas/${id}`)
    return data
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
    return null
  }
}

export const getEmpresas = async (
  params?: PaginationParams,
): Promise<Empresa[] | null> => {
  try {
    console.log('🔍 Buscando empresas com params:', params)
    const { data } = await apiClient.get<{
      data: Empresa[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pagination: any
    }>('/empresas', {
      params,
    })
    // console.log("📦 Resposta da API (empresas):", data);

    if (data && typeof data === 'object' && 'data' in data) {
      console.log('📦 Dados dentro de data.data:', data.data)
      return Array.isArray(data.data) ? data.data : []
    }
    return data
  } catch (error) {
    console.error('❌ Erro ao buscar empresas:', error)
    return null
  }
}

export const getAllEmpresas = async (): Promise<Empresa[] | null> => {
  try {
    console.log('🔍 Buscando todas as empresas disponíveis')
    const { data } = await apiClient.get<{ data: Empresa[] }>('/empresas/all')
    // console.log("📦 Resposta da API (todas empresas):", data);
    return data?.data || []
  } catch (error) {
    console.error('❌ Erro ao buscar todas as empresas:', error)
    return null
  }
}

export const getEmpresasByEvent = async (
  eventId: string,
): Promise<Empresa[] | null> => {
  try {
    console.log('🔍 Buscando empresas do evento:', eventId)
    const { data } = await apiClient.get<{ data: Empresa[] }>(
      `/empresas/event/${eventId}`,
    )
    // console.log("📦 Resposta da API (empresas do evento):", data);
    return data?.data || []
  } catch (error) {
    console.error('❌ Erro ao buscar empresas do evento:', error)
    return null
  }
}
