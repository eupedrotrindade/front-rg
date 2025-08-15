/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useMemo, useCallback } from "react"
import { FixedSizeList as List } from "react-window"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  Search,
  ArrowUpAZ,
  ArrowDownZA,
  Check,
  X,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ExcelColumnFilterProps {
  /** Valores únicos da coluna para filtrar */
  values: string[]
  /** Valores atualmente selecionados */
  selectedValues: string[]
  /** Callback quando valores são alterados */
  onSelectionChange: (selectedValues: string[]) => void
  /** Callback quando ordenação é aplicada na tabela */
  onSortTable?: (direction: "asc" | "desc") => void
  /** Título da coluna */
  columnTitle: string
  /** Se o filtro está ativo */
  isActive?: boolean
  /** Classe CSS adicional */
  className?: string
}

export default function ExcelColumnFilter({
  values,
  selectedValues,
  onSelectionChange,
  onSortTable,
  columnTitle,
  isActive = false,
  className
}: ExcelColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null)

  // Filtrar e ordenar valores
  const processedValues = useMemo(() => {
    // Remover valores vazios/nulos e fazer deduplicação
    let filtered = Array.from(new Set(
      values.filter(val => val !== null && val !== undefined && val.toString().trim() !== "")
    ))

    // Aplicar filtro de busca
    if (searchTerm.trim()) {
      filtered = filtered.filter(val =>
        val.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Aplicar ordenação
    if (sortOrder) {
      filtered.sort((a, b) => {
        const aStr = a.toString().toLowerCase()
        const bStr = b.toString().toLowerCase()
        if (sortOrder === "asc") {
          return aStr.localeCompare(bStr)
        } else {
          return bStr.localeCompare(aStr)
        }
      })
    }

    return filtered
  }, [values, searchTerm, sortOrder])

  // Verificar se todos estão selecionados
  const allSelected = useMemo(() => {
    if (processedValues.length === 0) return false
    return processedValues.every(val => selectedValues.includes(val))
  }, [processedValues, selectedValues])

  // Verificar se alguns estão selecionados (indeterminado)
  const someSelected = useMemo(() => {
    if (processedValues.length === 0) return false
    return processedValues.some(val => selectedValues.includes(val)) && !allSelected
  }, [processedValues, selectedValues, allSelected])

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      // Adicionar todos os valores filtrados aos selecionados
      const newSelection = [...new Set([...selectedValues, ...processedValues])]
      onSelectionChange(newSelection)
    } else {
      // Remover todos os valores filtrados dos selecionados
      const newSelection = selectedValues.filter(val => !processedValues.includes(val))
      onSelectionChange(newSelection)
    }
  }, [selectedValues, processedValues, onSelectionChange])

  const handleItemToggle = useCallback((value: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedValues, value])
    } else {
      onSelectionChange(selectedValues.filter(val => val !== value))
    }
  }, [selectedValues, onSelectionChange])

  const handleClearAll = useCallback(() => {
    onSelectionChange([])
    setSearchTerm("")
    setSortOrder(null)
  }, [onSelectionChange])

  const handleSort = useCallback((order: "asc" | "desc") => {
    setSortOrder(current => current === order ? null : order)
    // Aplicar ordenação na tabela se callback fornecido
    if (onSortTable) {
      onSortTable(order)
    }
  }, [onSortTable])

  // ⚡ COMPONENTE VIRTUALIZADO - Item da lista
  const VirtualizedFilterItem = useCallback(({ index, style }: { index: number; style: any }) => {
    const value = processedValues[index]
    const isChecked = selectedValues.includes(value)

    return (
      <div style={style}>
        <div
          className="flex items-center space-x-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
          onClick={() => handleItemToggle(value, !isChecked)}
        >
          <Checkbox
            id={`filter-${value}-${index}`}
            checked={isChecked}
            onChange={() => { }} // Controlado pelo onClick do div
          />
          <label
            htmlFor={`filter-${value}-${index}`}
            className="text-sm flex-1 cursor-pointer truncate"
            title={value.toString()}
          >
            {value.toString()}
          </label>
          {isChecked && (
            <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
          )}
        </div>
      </div>
    )
  }, [processedValues, selectedValues, handleItemToggle])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 hover:bg-gray-100 transition-colors",
            isActive && "bg-blue-50 text-blue-700 border-blue-200",
            className
          )}
        >
          <Filter className={cn(
            "h-3 w-3",
            isActive ? "text-blue-600" : "text-gray-400"
          )} />
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-80 p-0 bg-white border border-gray-200 shadow-md text-gray-600"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b bg-gray-50 px-3 py-2">
          <div className="font-medium text-sm text-gray-900">
            Filtrar &quot;{columnTitle}&quot;
          </div>
        </div>

        {/* Controles de Ordenação */}
        <div className="border-b px-3 py-2">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort("asc")}
              className={cn(
                "h-8 px-3 text-xs justify-start",
                sortOrder === "asc" && "bg-blue-50 text-blue-700"
              )}
            >
              <ArrowUpAZ className="h-3 w-3 mr-2" />
              A → Z
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort("desc")}
              className={cn(
                "h-8 px-3 text-xs justify-start",
                sortOrder === "desc" && "bg-blue-50 text-blue-700"
              )}
            >
              <ArrowDownZA className="h-3 w-3 mr-2" />
              Z → A
            </Button>
          </div>
        </div>

        {/* Busca */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar valores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-8 text-sm"
            />
          </div>
        </div>

        {/* Controles Selecionar Todos */}
        <div className="border-b px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                ref={(el) => {
                  if (el && 'indeterminate' in el) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (el as any).indeterminate = someSelected
                  }
                }}
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer"
              >
                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
              </label>
              <span className="text-xs text-gray-500">
                ({processedValues.length})
              </span>
            </div>

            {selectedValues.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Lista de Valores Virtualizados */}
        <div>
          {processedValues.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              {searchTerm ? "Nenhum resultado encontrado" : "Nenhum valor disponível"}
            </div>
          ) : (
            <List
              key={`${processedValues.length}-${searchTerm}-${sortOrder}`}
              height={Math.min(processedValues.length * 36, 240)} // 36px por item, max 240px
              width="100%"
              itemCount={processedValues.length}
              itemSize={36}
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {VirtualizedFilterItem}
            </List>
          )}
        </div>

        {/* Rodapé com informações */}
        {selectedValues.length > 0 && (
          <div className="border-t px-3 py-2 bg-gray-50">
            <div className="text-xs text-gray-600">
              {selectedValues.length} de {values.length} selecionados
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}