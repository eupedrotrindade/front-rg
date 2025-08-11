/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { FixedSizeList as List } from 'react-window'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'

interface DashboardItem {
  id: string
  name: string
  type: 'credential' | 'company'
  checkedIn: number
  total: number
  percentage: number
  color: string
}

interface VirtualizedDashboardListProps {
  items: DashboardItem[]
  height?: number
  itemHeight?: number
}

const DashboardListItem = ({ index, style, data }: any) => {
  const item: DashboardItem = data.items[index]

  return (
    <div style={style} className="px-4 py-2">
      <div className="bg-white rounded-lg border border-gray-200 p-4 dashboard-item transition-all duration-200">
        <div className="flex items-center justify-between">
          {/* Nome e tipo */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate" title={item.name}>
                {item.name}
              </div>
              <Badge
                variant="secondary"
                className={`text-xs mt-1 badge-animate ${item.type === 'credential'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                  }`}
              >
                {item.type === 'credential' ? 'Credencial' : 'Empresa'}
              </Badge>
            </div>
          </div>

          {/* Progresso */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Números */}
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {item.checkedIn}/{item.total}
              </div>
              <div className="text-sm text-gray-500">
                {item.percentage}% presente
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="w-32">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full progress-bar-animate"
                  style={{
                    backgroundColor: item.color,
                    width: `${item.percentage}%`
                  }}
                />
              </div>
              <div className="text-xs text-center text-gray-500 mt-1">
                {item.total - item.checkedIn} ausentes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VirtualizedDashboardList({
  items,
  height = 600,
  itemHeight = 100
}: VirtualizedDashboardListProps) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      // Ordenar por total (maior primeiro), depois por porcentagem (maior primeiro)
      if (b.total !== a.total) {
        return b.total - a.total
      }
      return b.percentage - a.percentage
    })
  }, [items])

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">📊</div>
          <p className="text-gray-600 text-sm">
            Nenhum dado disponível para o dia selecionado
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      {/* Header da lista */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-100 rounded-t-lg">
        <div className="flex items-center justify-between text-sm font-medium text-gray-700">
          <div className="flex-1">Nome</div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="w-16 text-center">Check-in</div>
            <div className="w-32 text-center">Progresso</div>
          </div>
        </div>
      </div>

      {/* Lista virtualizada */}
      <List
        height={height}
        width="100%"
        itemCount={sortedItems.length}
        itemSize={itemHeight}
        itemData={{ items: sortedItems }}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {DashboardListItem}
      </List>

      {/* Footer com resumo */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-100 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Total de {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
          <div>
            {items.reduce((sum, item) => sum + item.checkedIn, 0)} de {items.reduce((sum, item) => sum + item.total, 0)} pessoas presentes
          </div>
        </div>
      </div>
    </div>
  )
}