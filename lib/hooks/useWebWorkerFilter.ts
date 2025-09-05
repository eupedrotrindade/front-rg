import { useCallback, useEffect, useRef, useState } from 'react'
import type { EventParticipant } from '@/features/eventos/types'
import type { FilterMessage, FilterResult } from '@/lib/workers/filterWorker'

interface UseWebWorkerFilterProps {
  data: EventParticipant[]
  initialFilters?: {
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

interface WebWorkerFilterResult {
  filteredData: EventParticipant[]
  total: number
  isLoading: boolean
  processingTime?: number
  applyFilter: (filters: { searchTerm?: string; empresa?: string; funcao?: string; credencial?: string; columnFilters?: Record<string, string[]> }) => void
  clearFilters: () => void
}

export function useWebWorkerFilter({
  data,
  initialFilters = {},
  selectedDay,
  sorting
}: UseWebWorkerFilterProps): WebWorkerFilterResult {
  const [filteredData, setFilteredData] = useState<EventParticipant[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [processingTime, setProcessingTime] = useState<number>()
  
  const workerRef = useRef<Worker | undefined>(undefined)
  const filtersRef = useRef(initialFilters)

  // Inicializar Web Worker
  useEffect(() => {
    // Criar worker inline para evitar problemas de path
    const workerCode = `
      self.onmessage = function(e) {
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
                const cpf = participant.cpf?.replace(/\\D/g, '') || ''
                const role = participant.role?.toLowerCase() || ''
                const company = participant.company?.toLowerCase() || ''
                
                return (
                  name.includes(searchTerm) ||
                  cpf.includes(searchTerm.replace(/\\D/g, '')) ||
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
                    const value = p[column] || ''
                    return values.includes(value)
                  })
                }
              })
            }
            
            // Ordenação otimizada
            if (payload.sorting?.campo) {
              const { campo, direcao } = payload.sorting
              filteredData.sort((a, b) => {
                const aVal = a[campo] || ''
                const bVal = b[campo] || ''
                
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
              payload: { error: error.message || 'Unknown error' }
            })
          }
        }
      }
    `
    
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    
    workerRef.current = new Worker(workerUrl)
    
    workerRef.current.onmessage = (e: MessageEvent<FilterResult | { type: 'FILTER_ERROR'; payload: { error: string } }>) => {
      const { type, payload } = e.data
      
      if (type === 'FILTER_RESULT') {
        setFilteredData(payload.filteredData)
        setTotal(payload.total)
        setProcessingTime(payload.processingTime)
        setIsLoading(false)
      } else if (type === 'FILTER_ERROR') {
        console.error('Filter worker error:', payload.error)
        setIsLoading(false)
      }
    }
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
      URL.revokeObjectURL(workerUrl)
    }
  }, [])

  // Aplicar filtros
  const applyFilter = useCallback((filters: { searchTerm?: string; empresa?: string; funcao?: string; credencial?: string; columnFilters?: Record<string, string[]> }) => {
    if (!workerRef.current || !data.length) return
    
    setIsLoading(true)
    filtersRef.current = filters
    
    const message: FilterMessage = {
      type: 'FILTER_DATA',
      payload: {
        data,
        filters,
        selectedDay,
        sorting
      }
    }
    
    workerRef.current.postMessage(message)
  }, [data, selectedDay, sorting])

  // Limpar filtros
  const clearFilters = useCallback(() => {
    const emptyFilters = {
      searchTerm: '',
      empresa: '',
      funcao: '',
      credencial: '',
      columnFilters: {}
    }
    applyFilter(emptyFilters)
  }, [applyFilter])

  // Auto-aplicar filtros quando dados mudarem
  useEffect(() => {
    if (data.length > 0) {
      applyFilter(filtersRef.current)
    }
  }, [data, selectedDay, sorting, applyFilter])

  return {
    filteredData,
    total,
    isLoading,
    processingTime,
    applyFilter,
    clearFilters
  }
}