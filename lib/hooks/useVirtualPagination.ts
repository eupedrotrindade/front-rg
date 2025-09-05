import { useState, useCallback, useMemo, useEffect } from 'react'

interface VirtualPaginationConfig {
  totalItems: number
  itemsPerPage: number
  bufferPages?: number
  preloadPages?: number
}

interface VirtualPage<T> {
  pageNumber: number
  data: T[]
  isLoaded: boolean
  isLoading: boolean
  lastAccessed: number
}

interface VirtualPaginationResult<T> {
  currentPage: number
  totalPages: number
  visibleData: T[]
  isLoading: boolean
  loadProgress: number
  goToPage: (page: number) => void
  goToNext: () => void
  goToPrevious: () => void
  preloadPage: (page: number, data: T[]) => void
  getPageData: (page: number) => T[] | null
  getLoadedPages: () => number[]
  clearCache: () => void
}

export function useVirtualPagination<T>({
  totalItems,
  itemsPerPage,
  bufferPages = 2,
  preloadPages = 1
}: VirtualPaginationConfig): VirtualPaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1)
  const [pages, setPages] = useState<Map<number, VirtualPage<T>>>(new Map())
  const [isLoading, setIsLoading] = useState(false)

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // Calcular páginas que devem estar em cache
  const getRequiredPages = useCallback((page: number): number[] => {
    const required: number[] = []
    
    // Página atual
    required.push(page)
    
    // Buffer ao redor da página atual
    for (let i = 1; i <= bufferPages; i++) {
      if (page - i > 0) required.push(page - i)
      if (page + i <= totalPages) required.push(page + i)
    }
    
    // Páginas de preload
    for (let i = 1; i <= preloadPages; i++) {
      if (page + bufferPages + i <= totalPages) {
        required.push(page + bufferPages + i)
      }
    }
    
    return [...new Set(required)].sort((a, b) => a - b)
  }, [bufferPages, preloadPages, totalPages])

  // Limpar páginas antigas para economizar memória
  const cleanupOldPages = useCallback(() => {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutos
    const requiredPages = new Set(getRequiredPages(currentPage))

    setPages(prev => {
      const newPages = new Map(prev)
      
      for (const [pageNum, page] of newPages.entries()) {
        const isOld = now - page.lastAccessed > maxAge
        const isNotRequired = !requiredPages.has(pageNum)
        
        if (isOld && isNotRequired) {
          newPages.delete(pageNum)
        }
      }
      
      return newPages
    })
  }, [currentPage, getRequiredPages])

  // Precarregar página com dados
  const preloadPage = useCallback((pageNumber: number, data: T[]) => {
    if (pageNumber < 1 || pageNumber > totalPages) return

    setPages(prev => {
      const newPages = new Map(prev)
      newPages.set(pageNumber, {
        pageNumber,
        data,
        isLoaded: true,
        isLoading: false,
        lastAccessed: Date.now()
      })
      return newPages
    })
  }, [totalPages])

  // Obter dados de uma página
  const getPageData = useCallback((pageNumber: number): T[] | null => {
    const page = pages.get(pageNumber)
    if (!page || !page.isLoaded) return null

    // Atualizar último acesso
    setPages(prev => {
      const newPages = new Map(prev)
      const updatedPage = newPages.get(pageNumber)
      if (updatedPage) {
        updatedPage.lastAccessed = Date.now()
      }
      return newPages
    })

    return page.data
  }, [pages])

  // Navegar para página específica
  const goToPage = useCallback((page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    setCurrentPage(page)
  }, [currentPage, totalPages])

  const goToNext = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])

  const goToPrevious = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  // Limpar cache
  const clearCache = useCallback(() => {
    setPages(new Map())
  }, [])

  // Obter páginas carregadas
  const getLoadedPages = useCallback((): number[] => {
    return Array.from(pages.keys()).filter(pageNum => 
      pages.get(pageNum)?.isLoaded
    ).sort((a, b) => a - b)
  }, [pages])

  // Dados visíveis da página atual
  const visibleData = useMemo((): T[] => {
    return getPageData(currentPage) || []
  }, [currentPage, getPageData])

  // Calcular progresso de carregamento
  const loadProgress = useMemo((): number => {
    const requiredPages = getRequiredPages(currentPage)
    const loadedCount = requiredPages.filter(pageNum => 
      pages.get(pageNum)?.isLoaded
    ).length
    
    return requiredPages.length > 0 ? (loadedCount / requiredPages.length) * 100 : 0
  }, [currentPage, pages, getRequiredPages])

  // Verificar se está carregando
  const isCurrentlyLoading = useMemo((): boolean => {
    const requiredPages = getRequiredPages(currentPage)
    return requiredPages.some(pageNum => 
      pages.get(pageNum)?.isLoading || !pages.get(pageNum)?.isLoaded
    )
  }, [currentPage, pages, getRequiredPages])

  // Cleanup periódico
  useEffect(() => {
    const interval = setInterval(cleanupOldPages, 60000) // 1 minuto
    return () => clearInterval(interval)
  }, [cleanupOldPages])

  return {
    currentPage,
    totalPages,
    visibleData,
    isLoading: isCurrentlyLoading,
    loadProgress: Math.round(loadProgress),
    goToPage,
    goToNext,
    goToPrevious,
    preloadPage,
    getPageData,
    getLoadedPages,
    clearCache
  }
}