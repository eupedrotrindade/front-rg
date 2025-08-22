"use client"

import React, { Suspense, lazy, ComponentType } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface LazyModalProps {
  isOpen: boolean
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: () => Promise<{ default: ComponentType<any> }>
  componentProps?: Record<string, unknown>
  loadingMessage?: string
}

export function LazyModal({
  isOpen,
  onClose,
  component,
  componentProps = {},
  loadingMessage = "Carregando..."
}: LazyModalProps) {
  // Lazy load apenas quando necessário
  const LazyComponent = React.useMemo(() => lazy(component), [component])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin w-6 h-6 text-purple-600" />
              <span className="text-gray-600">{loadingMessage}</span>
            </div>
          </div>
        }>
          <LazyComponent
            isOpen={isOpen}
            onClose={onClose}
            {...componentProps}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}

// Hook para gerenciar lazy modals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLazyModal<T = Record<string, unknown>>(component: () => Promise<{ default: ComponentType<any> }>) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [props, setProps] = React.useState<T | null>(null)

  const openModal = React.useCallback((modalProps?: T) => {
    if (modalProps) {
      setProps(modalProps)
    }
    setIsOpen(true)
  }, [])

  const closeModal = React.useCallback(() => {
    setIsOpen(false)
    // Delay para evitar flash no fechamento
    setTimeout(() => {
      setProps(null)
    }, 300)
  }, [])

  const ModalComponent = React.useCallback((additionalProps?: Partial<T>) => (
    <LazyModal
      isOpen={isOpen}
      onClose={closeModal}
      component={component}
      componentProps={{ ...props, ...additionalProps }}
    />
  ), [isOpen, closeModal, component, props])

  return {
    isOpen,
    openModal,
    closeModal,
    ModalComponent,
    props
  }
}

// Utility para pre-carregar modals críticos
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function preloadModal(component: () => Promise<{ default: ComponentType<any> }>) {
  // Pre-load no requestIdleCallback para não bloquear UI
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      component().catch(() => {
        // Silently fail preload
      })
    })
  } else {
    // Fallback para browsers que não suportam requestIdleCallback
    setTimeout(() => {
      component().catch(() => {
        // Silently fail preload
      })
    }, 2000)
  }
}