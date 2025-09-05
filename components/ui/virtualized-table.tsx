import React, { memo, useMemo, useCallback, forwardRef } from 'react'
import { FixedSizeList as List } from 'react-window'
import type { EventParticipant } from '@/features/eventos/types'
import { Button } from '@/components/ui/button'
import { Check, Clock } from 'lucide-react'

interface VirtualizedTableProps {
  data: EventParticipant[]
  height: number
  itemHeight: number
  onParticipantClick: (participant: EventParticipant) => void
  onCheckin: (participant: EventParticipant) => void
  onCheckout: (participant: EventParticipant) => void
  getBotaoAcao: (participant: EventParticipant) => 'checkin' | 'checkout' | null
  formatCPF: (cpf: string) => string
  getCredencial: (participant: EventParticipant) => string
  getCredencialCor: (participant: EventParticipant) => string
  getContrastingTextColor: (color: string) => string
  needsBorder: (color: string) => boolean
  isLoading?: boolean
  isMobileTable?: boolean
}

// Row component otimizado com memo
const ParticipantRowVirtualized = memo<{
  index: number
  style: React.CSSProperties
  data: {
    items: EventParticipant[]
    onParticipantClick: (participant: EventParticipant) => void
    onCheckin: (participant: EventParticipant) => void
    onCheckout: (participant: EventParticipant) => void
    getBotaoAcao: (participant: EventParticipant) => 'checkin' | 'checkout' | null
    formatCPF: (cpf: string) => string
    getCredencial: (participant: EventParticipant) => string
    getCredencialCor: (participant: EventParticipant) => string
    getContrastingTextColor: (color: string) => string
    needsBorder: (color: string) => boolean
    isMobileTable: boolean
  }
}>(({ index, style, data }) => {
  const {
    items,
    onParticipantClick,
    onCheckin,
    onCheckout,
    getBotaoAcao,
    formatCPF,
    getCredencial,
    getCredencialCor,
    getContrastingTextColor,
    needsBorder,
    isMobileTable
  } = data

  const colab = items[index]
  if (!colab) return null

  const botaoTipo = getBotaoAcao(colab)

  return (
    <div
      style={style}
      className="border-b border-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 cursor-pointer transition-all duration-200 bg-white shadow-sm"
      onClick={() => onParticipantClick(colab)}
    >
      <div className="flex items-center h-full">
        {/* Nome - sempre visível */}
        <div
          className={`text-gray-600 ${isMobileTable ? 'px-2 py-1' : 'px-6 py-2'} flex-shrink-0`}
          style={{ width: isMobileTable ? '40%' : '25%' }}
        >
          <div className="text-sm font-semibold text-gray-900 truncate">
            {colab.name}
          </div>
          {/* Informações adicionais em mobile */}
          {isMobileTable && (
            <div className="text-xs text-gray-500 mt-1 truncate">
              {formatCPF(colab.cpf?.trim() || '') || colab.rg || '-'} • {colab.role}
            </div>
          )}
        </div>

        {/* CPF - esconder em mobile */}
        {!isMobileTable && (
          <div
            className="px-6 py-2 whitespace-nowrap text-gray-600 flex-shrink-0"
            style={{ width: '15%' }}
          >
            <p className="text-sm text-gray-900 font-mono truncate">
              {formatCPF(colab.cpf?.trim() || '') || colab.rg || '-'}
            </p>
          </div>
        )}

        {/* Função - esconder em mobile */}
        {!isMobileTable && (
          <div
            className="px-6 py-2 whitespace-nowrap text-gray-600 flex-shrink-0"
            style={{ width: '18%' }}
          >
            <p className="text-sm text-gray-600 truncate">{colab.role}</p>
          </div>
        )}

        {/* Empresa - esconder em mobile */}
        {!isMobileTable && (
          <div
            className="px-6 py-2 whitespace-nowrap text-gray-600 flex-shrink-0"
            style={{ width: '18%' }}
          >
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 max-w-full truncate">
              {colab.company}
            </span>
          </div>
        )}

        {/* Credencial - esconder em mobile */}
        {!isMobileTable && (
          <div
            className="px-6 py-2 whitespace-nowrap text-gray-600 flex-shrink-0"
            style={{ width: '16%' }}
          >
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium max-w-full truncate"
              style={{
                backgroundColor: getCredencialCor(colab),
                color: getContrastingTextColor(getCredencialCor(colab)),
                border: needsBorder(getCredencialCor(colab)) ? '1px solid #d1d5db' : 'none'
              }}
            >
              {getCredencial(colab)}
            </span>
          </div>
        )}

        {/* Ação - sempre visível e sticky à direita */}
        <div
          className={`whitespace-nowrap text-sm font-medium flex-shrink-0 ${isMobileTable ? 'px-2 py-1' : 'px-6 py-2'}`}
          style={{ width: isMobileTable ? '30%' : '8%' }}
        >
          <div
            className="flex justify-center"
            onClick={e => e.stopPropagation()}
          >
            {botaoTipo === 'checkin' && (
              <Button
                onClick={() => onCheckin(colab)}
                size="sm"
                className={`bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 ${isMobileTable ? 'text-xs px-1.5 py-1' : ''}`}
              >
                <Check className={`${isMobileTable ? 'w-3 h-3 mr-0.5' : 'w-4 h-4 mr-1'}`} />
                {isMobileTable ? 'In' : 'Check-in'}
              </Button>
            )}
            {botaoTipo === 'checkout' && (
              <Button
                onClick={() => onCheckout(colab)}
                size="sm"
                className={`bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 ${isMobileTable ? 'text-xs px-1.5 py-1' : ''}`}
              >
                <Clock className={`${isMobileTable ? 'w-3 h-3 mr-0.5' : 'w-4 h-4 mr-1'}`} />
                {isMobileTable ? 'Out' : 'Check-out'}
              </Button>
            )}
            {botaoTipo === null && (
              <p className='text-emerald-700 text-xs font-medium'>CONCLUÍDO</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

ParticipantRowVirtualized.displayName = 'ParticipantRowVirtualized'

const VirtualizedTable = forwardRef<List, VirtualizedTableProps>(({
  data,
  height,
  itemHeight,
  onParticipantClick,
  onCheckin,
  onCheckout,
  getBotaoAcao,
  formatCPF,
  getCredencial,
  getCredencialCor,
  getContrastingTextColor,
  needsBorder,
  isLoading = false,
  isMobileTable = false
}, ref) => {
  // Dados otimizados para a lista virtualizada
  const itemData = useMemo(() => ({
    items: data,
    onParticipantClick,
    onCheckin,
    onCheckout,
    getBotaoAcao,
    formatCPF,
    getCredencial,
    getCredencialCor,
    getContrastingTextColor,
    needsBorder,
    isMobileTable
  }), [
    data,
    onParticipantClick,
    onCheckin,
    onCheckout,
    getBotaoAcao,
    formatCPF,
    getCredencial,
    getCredencialCor,
    getContrastingTextColor,
    needsBorder,
    isMobileTable
  ])

  // Função de renderização da lista
  const Row = useCallback((props: { index: number; style: React.CSSProperties; data: typeof itemData }) => (
    <ParticipantRowVirtualized {...props} />
  ), [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Processando dados...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Nenhum participante encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden border rounded-lg bg-white">
      <List
        ref={ref}
        height={height}
        width="100%"
        itemCount={data.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={10} // Pre-renderizar 10 itens extras para scroll suave
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {Row}
      </List>
    </div>
  )
})

VirtualizedTable.displayName = 'VirtualizedTable'

export default memo(VirtualizedTable)