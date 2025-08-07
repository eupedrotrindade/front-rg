"use client"

import { useRef, useCallback, useEffect } from 'react'

interface WorkerMessage {
  type: string
  data: any
  id: string
}

interface WorkerResponse {
  type: string
  result?: any
  error?: string
  id: string
}

export function useWebWorker(workerPath: string) {
  const workerRef = useRef<Worker | null>(null)
  const pendingOperations = useRef<Map<string, {
    resolve: (value: any) => void
    reject: (error: Error) => void
    timeout?: NodeJS.Timeout
  }>>(new Map())
  const requestCounter = useRef(0)

  // Inicializar worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      workerRef.current = new Worker(workerPath)
      
      // Listener para mensagens do worker
      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { type, result, error, id } = e.data
        const operation = pendingOperations.current.get(id)
        
        if (operation) {
          pendingOperations.current.delete(id)
          
          // Limpar timeout se existir
          if (operation.timeout) {
            clearTimeout(operation.timeout)
          }
          
          if (error) {
            operation.reject(new Error(error))
          } else {
            operation.resolve(result)
          }
        }
      }

      // Listener para erros do worker
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error)
        // Rejeitar todas as operações pendentes
        pendingOperations.current.forEach(({ reject, timeout }) => {
          if (timeout) clearTimeout(timeout)
          reject(new Error('Worker error'))
        })
        pendingOperations.current.clear()
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      
      // Limpar operações pendentes
      pendingOperations.current.forEach(({ timeout }) => {
        if (timeout) clearTimeout(timeout)
      })
      pendingOperations.current.clear()
    }
  }, [workerPath])

  // Função para executar operação no worker
  const execute = useCallback(<T>(type: string, data: any, timeoutMs = 10000): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not available'))
        return
      }

      const id = `${type}_${++requestCounter.current}_${Date.now()}`
      
      // Timeout para operação
      const timeout = setTimeout(() => {
        pendingOperations.current.delete(id)
        reject(new Error(`Worker operation timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      // Armazenar operação pendente
      pendingOperations.current.set(id, {
        resolve,
        reject,
        timeout
      })

      // Enviar mensagem para worker
      workerRef.current.postMessage({
        type,
        data,
        id
      } as WorkerMessage)
    })
  }, [])

  // Verificar se worker está disponível
  const isAvailable = useCallback(() => {
    return typeof window !== 'undefined' && 'Worker' in window && workerRef.current !== null
  }, [])

  return {
    execute,
    isAvailable,
    pendingCount: () => pendingOperations.current.size
  }
}

// Hook específico para processamento de dados
export function useDataProcessor() {
  const { execute, isAvailable } = useWebWorker('/workers/data-processor.js')

  const processData = useCallback(async (params: {
    data: any[]
    filters: any
    selectedDay: string
    advancedFilters: any
    sorting: any
    columnFilters: any
    credentials: any[]
  }) => {
    if (!isAvailable()) {
      // Fallback para processamento no main thread
      return processDataMainThread(params)
    }

    try {
      return await execute('PROCESS_DATA', params, 5000)
    } catch (error) {
      console.warn('Worker processing failed, falling back to main thread:', error)
      return processDataMainThread(params)
    }
  }, [execute, isAvailable])

  const calculateUniqueValues = useCallback(async (data: any[], credentials: any[]) => {
    if (!isAvailable()) {
      return calculateUniqueValuesMainThread(data, credentials)
    }

    try {
      return await execute('CALCULATE_UNIQUE_VALUES', { data, credentials }, 3000)
    } catch (error) {
      console.warn('Worker unique values calculation failed, falling back to main thread:', error)
      return calculateUniqueValuesMainThread(data, credentials)
    }
  }, [execute, isAvailable])

  const buildSearchIndex = useCallback(async (data: any[], fields: string[]) => {
    if (!isAvailable()) {
      return null // Não fazer indexação no main thread
    }

    try {
      return await execute('BUILD_SEARCH_INDEX', { data, fields }, 10000)
    } catch (error) {
      console.warn('Worker index building failed:', error)
      return null
    }
  }, [execute, isAvailable])

  const indexedSearch = useCallback(async (data: any[], searchIndex: any, term: string) => {
    if (!isAvailable() || !searchIndex) {
      return data.filter(item => 
        item.name?.toLowerCase().includes(term.toLowerCase()) ||
        item.cpf?.includes(term) ||
        item.role?.toLowerCase().includes(term.toLowerCase()) ||
        item.company?.toLowerCase().includes(term.toLowerCase())
      )
    }

    try {
      return await execute('INDEXED_SEARCH', { data, searchIndex, term }, 2000)
    } catch (error) {
      console.warn('Worker search failed, falling back to main thread:', error)
      return data.filter(item => 
        item.name?.toLowerCase().includes(term.toLowerCase()) ||
        item.cpf?.includes(term) ||
        item.role?.toLowerCase().includes(term.toLowerCase()) ||
        item.company?.toLowerCase().includes(term.toLowerCase())
      )
    }
  }, [execute, isAvailable])

  return {
    processData,
    calculateUniqueValues,
    buildSearchIndex,
    indexedSearch,
    isAvailable
  }
}

// Fallback functions para main thread
function processDataMainThread(params: any) {
  // Implementação simplificada para fallback
  console.log('Processing data on main thread (fallback)')
  return params.data
}

function calculateUniqueValuesMainThread(data: any[], credentials: any[]) {
  // Implementação simplificada para fallback
  console.log('Calculating unique values on main thread (fallback)')
  return {
    nome: [...new Set(data.map(c => c.name).filter(Boolean))],
    cpf: [...new Set(data.map(c => c.cpf).filter(Boolean))],
    funcao: [...new Set(data.map(c => c.role).filter(Boolean))],
    empresa: [...new Set(data.map(c => c.company).filter(Boolean))],
    credencial: ['SEM CREDENCIAL']
  }
}