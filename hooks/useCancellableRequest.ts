"use client"

import { useRef, useCallback, useEffect } from 'react'

export interface CancellableRequest {
  cancel: () => void
  isCancelled: () => boolean
}

export function useCancellableRequest() {
  const abortControllersRef = useRef<Set<AbortController>>(new Set())
  const requestCounterRef = useRef<number>(0)

  // Criar uma nova requisição cancelável
  const createCancellableRequest = useCallback((): [AbortSignal, CancellableRequest] => {
    const controller = new AbortController()
    const requestId = ++requestCounterRef.current
    
    abortControllersRef.current.add(controller)

    const cancellableRequest: CancellableRequest = {
      cancel: () => {
        controller.abort()
        abortControllersRef.current.delete(controller)
      },
      isCancelled: () => controller.signal.aborted
    }

    // Auto-cleanup quando a requisição termina
    const originalSignal = controller.signal
    const cleanup = () => {
      abortControllersRef.current.delete(controller)
    }

    originalSignal.addEventListener('abort', cleanup, { once: true })

    return [originalSignal, cancellableRequest]
  }, [])

  // Cancelar todas as requisições pendentes
  const cancelAllRequests = useCallback(() => {
    abortControllersRef.current.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort()
      }
    })
    abortControllersRef.current.clear()
  }, [])

  // Cancelar requisições por timeout
  const createTimeoutRequest = useCallback((timeoutMs: number): [AbortSignal, CancellableRequest] => {
    const [signal, request] = createCancellableRequest()
    
    const timeoutId = setTimeout(() => {
      if (!signal.aborted) {
        request.cancel()
      }
    }, timeoutMs)

    // Limpar timeout se requisição for cancelada manualmente
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId)
    }, { once: true })

    return [signal, request]
  }, [createCancellableRequest])

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      cancelAllRequests()
    }
  }, [cancelAllRequests])

  return {
    createCancellableRequest,
    createTimeoutRequest,
    cancelAllRequests,
    hasPendingRequests: () => abortControllersRef.current.size > 0
  }
}

// Hook específico para debounce com cancelamento
export function useDebouncedCancellableRequest<T extends any[]>(
  callback: (...args: T) => Promise<any>,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { createCancellableRequest, cancelAllRequests } = useCancellableRequest()

  const debouncedCallback = useCallback((...args: T) => {
    // Cancelar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Cancelar requisições pendentes
    cancelAllRequests()

    return new Promise<any>((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const [signal, request] = createCancellableRequest()
          
          // Adicionar signal à chamada se callback aceitar
          const result = await callback(...args)
          
          if (!request.isCancelled()) {
            resolve(result)
          }
        } catch (error: any) {
          if (error?.name !== 'AbortError') {
            reject(error)
          }
        }
      }, delay)
    })
  }, [callback, delay, createCancellableRequest, cancelAllRequests])

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      cancelAllRequests()
    }
  }, [cancelAllRequests])

  return debouncedCallback
}

// Utility para criar requisições Axios canceláveis
export function createAxiosConfig(signal?: AbortSignal) {
  return {
    signal,
    timeout: 10000, // 10 segundos de timeout padrão
  }
}