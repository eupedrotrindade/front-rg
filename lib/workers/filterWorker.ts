// Web Worker para processamento pesado de filtros
import type { EventParticipant } from '@/features/eventos/types'

export interface FilterMessage {
  type: 'FILTER_DATA'
  payload: {
    data: EventParticipant[]
    filters: {
      searchTerm?: string
      empresa?: string
      funcao?: string
      credencial?: string
      columnFilters?: Record<string, string[]>
    }
    selectedDay?: string
    sorting?: {
      campo: string
      direcao: 'asc' | 'desc'
    }
  }
}

export interface FilterResult {
  type: 'FILTER_RESULT'
  payload: {
    filteredData: EventParticipant[]
    total: number
    processingTime: number
  }
}

// Worker logic
self.onmessage = function(e: MessageEvent<FilterMessage>) {
  const { type, payload } = e.data
  
  if (type === 'FILTER_DATA') {
    const startTime = performance.now()
    
    try {
      let filteredData = [...payload.data]
      
      // Filtro por turno
      if (payload.selectedDay && payload.selectedDay !== 'all') {
        filteredData = filteredData.filter(participant => 
          participant.shiftId === payload.selectedDay
        )
      }
      
      // Filtro de busca otimizado
      if (payload.filters.searchTerm?.trim()) {
        const searchTerm = payload.filters.searchTerm.toLowerCase().trim()
        filteredData = filteredData.filter(participant => {
          const name = participant.name?.toLowerCase() || ''
          const cpf = participant.cpf?.replace(/\D/g, '') || ''
          const role = participant.role?.toLowerCase() || ''
          const company = participant.company?.toLowerCase() || ''
          
          return (
            name.includes(searchTerm) ||
            cpf.includes(searchTerm.replace(/\D/g, '')) ||
            role.includes(searchTerm) ||
            company.includes(searchTerm)
          )
        })
      }
      
      // Filtros específicos
      if (payload.filters.empresa) {
        filteredData = filteredData.filter(p => p.company === payload.filters.empresa)
      }
      
      if (payload.filters.funcao) {
        filteredData = filteredData.filter(p => p.role === payload.filters.funcao)
      }
      
      // Filtros de coluna
      if (payload.filters.columnFilters) {
        Object.entries(payload.filters.columnFilters).forEach(([column, values]) => {
          if (values.length > 0) {
            filteredData = filteredData.filter(p => {
              const value = p[column as keyof EventParticipant] as string
              return values.includes(value || '')
            })
          }
        })
      }
      
      // Ordenação otimizada
      if (payload.sorting?.campo) {
        const { campo, direcao } = payload.sorting
        filteredData.sort((a, b) => {
          const aVal = a[campo as keyof EventParticipant] as string || ''
          const bVal = b[campo as keyof EventParticipant] as string || ''
          
          const result = aVal.localeCompare(bVal)
          return direcao === 'asc' ? result : -result
        })
      }
      
      const processingTime = performance.now() - startTime
      
      self.postMessage({
        type: 'FILTER_RESULT',
        payload: {
          filteredData,
          total: filteredData.length,
          processingTime
        }
      })
      
    } catch (error) {
      self.postMessage({
        type: 'FILTER_ERROR',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    }
  }
}