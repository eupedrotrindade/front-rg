"use client"

import React, { useMemo, useRef, useState, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface VirtualTableColumn<T> {
  key: keyof T | string
  header: React.ReactNode
  width?: number
  minWidth?: number
  cell: (item: T, index: number) => React.ReactNode
  className?: string
  priority?: number // 1 = alta prioridade (sempre visível), 6 = baixa prioridade
  hiddenOnMobile?: boolean // Ocultar em mobile
}

interface VirtualTableProps<T> {
  data: T[]
  columns: VirtualTableColumn<T>[]
  height: number
  itemHeight?: number
  className?: string
  onRowClick?: (item: T, index: number) => void
  getRowClassName?: (item: T, index: number) => string
  headerClassName?: string
  bodyClassName?: string
}

export default function VirtualTable<T>({
  data,
  columns,
  height,
  itemHeight = 65, // Altura padrão das linhas da tabela
  className,
  onRowClick,
  getRowClassName,
  headerClassName,
  bodyClassName
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detectar se é mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint do Tailwind
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Filtrar colunas baseado na responsividade
  const visibleColumns = useMemo(() => {
    if (!isMobile) {
      return columns
    }

    // No mobile, mostrar apenas colunas com prioridade alta ou que não são hiddenOnMobile
    return columns
      .filter(col => !col.hiddenOnMobile || (col.priority && col.priority <= 2))
      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
  }, [columns, isMobile])

  // Configurar o virtualizador
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Renderizar 5 itens extras para suavizar o scroll
  })

  // Calcular larguras das colunas
  const totalWidth = useMemo(() => {
    return visibleColumns.reduce((sum, col) => sum + (col.width || 150), 0)
  }, [visibleColumns])

  const items = virtualizer.getVirtualItems()

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden bg-white", className)}>
      {/* Header fixo */}
      <Table>
        <TableHeader>
          <TableRow className={cn("bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600", headerClassName)}>
            {visibleColumns.map((column, index) => (
              <TableHead
                key={String(column.key) + index}
                className={cn(
                  "px-3 sm:px-6 py-2 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider",
                  isMobile ? "text-xs" : "text-xs"
                )}
                style={{
                  width: isMobile ? 'auto' : (column.width || 150),
                  minWidth: isMobile ? (column.minWidth || 80) : (column.minWidth || column.width || 150),
                  flex: isMobile ? '1 1 0%' : undefined
                }}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      </Table>

      {/* Corpo virtualizado */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.map((virtualRow) => {
            const item = data[virtualRow.index]
            const rowClassName = getRowClassName ? getRowClassName(item, virtualRow.index) : ""

            return (
              <div
                key={virtualRow.index}
                className={cn(
                  "absolute top-0 left-0 w-full border-b border-gray-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 cursor-pointer transition-all duration-200",
                  rowClassName
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
              >
                <div className={cn(
                  "flex w-full h-full items-center",
                  isMobile ? "gap-1" : "gap-0"
                )}>
                  {visibleColumns.map((column, colIndex) => (
                    <div
                      key={String(column.key) + colIndex}
                      className={cn(
                        "py-2 sm:py-4 flex-shrink-0",
                        isMobile ? "px-2 text-sm" : "px-6"
                      )}
                      style={{
                        width: isMobile ? 'auto' : (column.width || 150),
                        minWidth: isMobile ? (column.minWidth || 80) : (column.minWidth || column.width || 150),
                        flex: isMobile ? '1 1 0%' : undefined
                      }}
                    >
                      {column.cell(item, virtualRow.index)}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Estado vazio */}
      {data.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-6m-6 0h-6" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Nenhum resultado encontrado
            </p>
            <p className="text-sm text-gray-500">
              Tente ajustar os filtros ou adicionar novos dados
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente auxiliar para células de texto simples
export function TextCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("whitespace-nowrap text-sm text-gray-900", className)}>
      {children}
    </div>
  )
}

// Componente auxiliar para badges/tags
export function BadgeCell({ children, variant = "default" }: { 
  children: React.ReactNode; 
  variant?: "default" | "blue" | "purple" | "green" | "red" | "yellow" 
}) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800"
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      variantClasses[variant]
    )}>
      {children}
    </span>
  )
}

// Componente auxiliar para botões de ação
export function ActionCell({ children, onClick }: { 
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex space-x-2" onClick={(e) => {
      e.stopPropagation()
      onClick?.(e)
    }}>
      {children}
    </div>
  )
}