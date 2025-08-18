/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from '@/lib/api-client'

export interface BadgePickup {
  id: string
  eventId: string
  nome: string
  cpf?: string
  empresa?: string
  status: 'pendente' | 'retirada'
  isSelfPickup?: boolean
  pickedUpBy?: string
  pickerCompany?: string
  pickedUpAt?: string
  shiftId?: string
  workDate?: string
  workStage?: 'montagem' | 'evento' | 'desmontagem'
  workPeriod?: 'diurno' | 'noturno' | 'dia_inteiro'
  createdAt?: string
  updatedAt?: string
}

export interface CreateBadgePickupData {
  eventId: string
  nome: string
  cpf?: string
  empresa?: string
  status?: 'pendente' | 'retirada'
  shiftId?: string
  workDate?: string
  workStage?: 'montagem' | 'evento' | 'desmontagem'
  workPeriod?: 'diurno' | 'noturno' | 'dia_inteiro'
}

export interface UpdateBadgePickupData {
  nome?: string
  cpf?: string
  empresa?: string
  status?: 'pendente' | 'retirada'
  shiftId?: string
  workDate?: string
  workStage?: 'montagem' | 'evento' | 'desmontagem'
  workPeriod?: 'diurno' | 'noturno' | 'dia_inteiro'
}

export interface BadgePickupRetrieveData {
  performedBy: string
  isSelfPickup: boolean
  pickerName?: string
  pickerCompany?: string
}

export interface BadgePickupStats {
  total: number
  pendentes: number
  retiradas: number
  selfPickups: number
  thirdPartyPickups: number
  pickupRate: number
}

export interface BulkCreateBadgePickupData {
  eventId: string
  badges: Array<{
    nome: string
    cpf?: string
    empresa?: string
    shiftId?: string
    workDate?: string
    workStage?: 'montagem' | 'evento' | 'desmontagem'
    workPeriod?: 'diurno' | 'noturno' | 'dia_inteiro'
  }>
}

// Listar badge pickups de um evento
export const getBadgePickupsByEvent = async (eventId: string): Promise<BadgePickup[]> => {
  try {
    const { data } = await apiClient.get<BadgePickup[]>('/event-badge-pickups', {
      params: { eventId }
    })
    return data
  } catch (error) {
    console.error('Erro ao buscar retiradas de crachá:', error)
    throw error
  }
}

// Buscar badge pickup por ID
export const getBadgePickupById = async (id: string): Promise<BadgePickup | null> => {
  try {
    const { data } = await apiClient.get<BadgePickup>(`/event-badge-pickups/${id}`)
    return data
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null
    }
    console.error('Erro ao buscar retirada de crachá:', error)
    throw error
  }
}

// Criar nova entrada de badge pickup
export const createBadgePickup = async (badgeData: CreateBadgePickupData): Promise<BadgePickup> => {
  try {
    const { data } = await apiClient.post<BadgePickup>('/event-badge-pickups', badgeData)
    return data
  } catch (error) {
    console.error('Erro ao criar entrada de crachá:', error)
    throw error
  }
}

// Atualizar badge pickup
export const updateBadgePickup = async (id: string, badgeData: UpdateBadgePickupData): Promise<BadgePickup> => {
  try {
    const { data } = await apiClient.put<BadgePickup>(`/event-badge-pickups/${id}`, badgeData)
    return data
  } catch (error) {
    console.error('Erro ao atualizar entrada de crachá:', error)
    throw error
  }
}

// Deletar badge pickup
export const deleteBadgePickup = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/event-badge-pickups/${id}`)
  } catch (error) {
    console.error('Erro ao deletar entrada de crachá:', error)
    throw error
  }
}

// Processar retirada de crachá
export const processBadgePickup = async (id: string, retrieveData: BadgePickupRetrieveData): Promise<BadgePickup> => {
  try {
    const { data } = await apiClient.patch<BadgePickup>(`/event-badge-pickups/${id}/pickup`, retrieveData)
    return data
  } catch (error) {
    console.error('Erro ao processar retirada de crachá:', error)
    throw error
  }
}

// Importar badges em lote
export const bulkCreateBadgePickups = async (bulkData: BulkCreateBadgePickupData): Promise<BadgePickup[]> => {
  try {
    const { data } = await apiClient.post<BadgePickup[]>('/event-badge-pickups/bulk', bulkData)
    return data
  } catch (error) {
    console.error('Erro ao importar badges em lote:', error)
    throw error
  }
}

// Obter estatísticas de badge pickup
export const getBadgePickupStats = async (eventId: string): Promise<BadgePickupStats> => {
  try {
    const { data } = await apiClient.get<BadgePickupStats>(`/event-badge-pickups/stats/${eventId}`)
    return data
  } catch (error) {
    console.error('Erro ao buscar estatísticas de crachá:', error)
    throw error
  }
}