/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React from 'react'
import { FixedSizeList as List } from 'react-window'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import type { EventParticipant } from "@/features/eventos/types"

interface DuplicateItem {
  item: any
  existing: EventParticipant
  row: number
}

interface VirtualizedDuplicatesTableProps {
  duplicates: DuplicateItem[]
  maxDisplayItems?: number
}

// Componente da linha individual otimizado com React.memo
const DuplicateRow = React.memo<{
  index: number
  style: React.CSSProperties
  data: {
    duplicates: DuplicateItem[]
  }
}>(({ index, style, data }) => {
  const duplicate = data.duplicates[index]

  if (!duplicate) {
    return (
      <div
        style={style}
        className="flex items-center border-b border-gray-200"
      >
        <div className="text-gray-500 p-2">Carregando...</div>
      </div>
    )
  }

  return (
    <div
      style={style}
      className="grid grid-cols-3 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150"
    >
      {/* Linha */}
      <div className="border-r border-gray-200 p-3 text-sm font-medium text-gray-900">
        {duplicate.row}
      </div>

      {/* Dados do Excel */}
      <div className="border-r border-gray-200 p-3 text-sm">
        <div className="space-y-1">
          <div><strong>Nome:</strong> <span className="text-gray-700">{duplicate.item.nome || 'N/A'}</span></div>
          <div><strong>CPF:</strong> <span className="text-gray-700 font-mono">{duplicate.item.cpf || 'N/A'}</span></div>
          <div><strong>Empresa:</strong> <span className="text-gray-700">{duplicate.item.empresa || 'N/A'}</span></div>
          <div><strong>Função:</strong> <span className="text-gray-700">{duplicate.item.funcao || 'N/A'}</span></div>
        </div>
      </div>

      {/* Dados Existentes no Sistema */}
      <div className="p-3 text-sm">
        {duplicate.existing && duplicate.existing.id ? (
          <div className="space-y-1">
            <div><strong>ID:</strong> <span className="text-gray-700 font-mono">{duplicate.existing.id}</span></div>
            <div><strong>Nome:</strong> <span className="text-gray-700">{duplicate.existing.name}</span></div>
            <div><strong>CPF:</strong> <span className="text-gray-700 font-mono">{duplicate.existing.cpf}</span></div>
            <div><strong>Empresa:</strong> <span className="text-gray-700">{duplicate.existing.company}</span></div>
            <div><strong>Função:</strong> <span className="text-gray-700">{duplicate.existing.role || 'N/A'}</span></div>
            <div className="text-xs text-blue-600 font-medium mt-1">
              <strong>Turno:</strong> {duplicate.existing.shiftId}
            </div>
            {(!duplicate.item.cpf && !duplicate.item.rg) && (
              <div className="text-xs text-orange-600 mt-1">
                (Detectado por nome + empresa)
              </div>
            )}
          </div>
        ) : (
          <div className="text-yellow-600 text-sm font-medium">
            <div>Duplicado dentro do arquivo</div>
            {(!duplicate.item.cpf && !duplicate.item.rg) && (
              <div className="text-xs text-orange-600 mt-1">
                (Detectado por nome + empresa)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

DuplicateRow.displayName = 'DuplicateRow'

const VirtualizedDuplicatesTable: React.FC<VirtualizedDuplicatesTableProps> = ({
  duplicates,
  maxDisplayItems = duplicates.length // Usar todos os duplicados por padrão
}) => {
  // Limitar o número de itens exibidos para performance (se maxDisplayItems for menor que o total)
  const displayedDuplicates = maxDisplayItems > 0 ? duplicates.slice(0, maxDisplayItems) : duplicates

  // Dados otimizados para o componente virtualizado
  const itemData = React.useMemo(
    () => ({
      duplicates: displayedDuplicates,
    }),
    [displayedDuplicates]
  )

  if (duplicates.length === 0) {
    return null
  }

  // Calcular altura baseada no número de itens, com altura mínima e máxima
  const itemHeight = 120 // Altura estimada de cada linha
  const maxHeight = 600 // Altura máxima do container (aumentada para acomodar mais itens)
  const minHeight = 240 // Altura mínima para pelo menos 2 itens
  const calculatedHeight = Math.min(Math.max(displayedDuplicates.length * itemHeight, minHeight), maxHeight)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          Preview de Duplicados Encontrados
        </CardTitle>
        <p className="text-sm text-gray-600">
          Estes participantes já existem no sistema para este turno
        </p>
        {duplicates.length > 50 && (
          <p className="text-xs text-blue-600 font-medium">
            Exibindo todos os {duplicates.length} duplicados (virtualizado para melhor performance)
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
            <div className="border-r border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Linha
            </div>
            <div className="border-r border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Dados do Excel
            </div>
            <div className="p-3 text-left text-sm font-medium text-gray-700">
              Dados Existentes no Sistema
            </div>
          </div>

          {/* Virtualized Rows */}
          <div className="overflow-hidden">
            <List
              height={calculatedHeight}
              itemCount={displayedDuplicates.length}
              itemSize={itemHeight}
              itemData={itemData}
              width="100%"
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {DuplicateRow}
            </List>
          </div>
        </div>

        {/* Footer com informações adicionais */}
        {duplicates.length > 50 && (
          <div className="mt-3 text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Total: {duplicates.length} duplicados encontrados
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default VirtualizedDuplicatesTable