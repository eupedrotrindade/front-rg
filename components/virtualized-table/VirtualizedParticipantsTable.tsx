'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EventParticipant } from '@/features/eventos/types'
import { Check, Clock, MoreVertical, RotateCcw, User } from 'lucide-react'
import React, { useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'

interface VirtualizedParticipantsTableProps {
  participants: EventParticipant[]
  selectedParticipants: Set<string>
  currentSelectedDay: string
  hasCheckIn: (participantId: string, date: string) => boolean
  hasCheckOut: (participantId: string, date: string) => boolean
  onToggleParticipant: (participantId: string) => void
  onSelectAll: () => void
  onCheckIn: (participant: EventParticipant) => void
  onCheckOut: (participant: EventParticipant) => void
  onReset: (participant: EventParticipant) => void
  onDelete: (participant: EventParticipant) => void
  onEdit: (participant: EventParticipant) => void
  credentials?: Array<{ id: string; nome: string; cor: string }>
  isLoading?: boolean
  loading?: boolean
}

// Componente da linha individual otimizado com React.memo
// Função para normalizar formato de data (movida para fora do componente)
const normalizeDate = (dateStr: string): string => {
  // Se já está no formato dd/mm/yyyy, retorna como está
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr
  }

  // Se está no formato yyyy-mm-dd, converte para dd/mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  // Se é uma data JavaScript, converte para dd/mm/yyyy
  try {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('pt-BR')
    }
  } catch (error) {
    console.error('Erro ao converter data:', dateStr, error)
  }

  return dateStr
}

// Função para determinar cor do texto baseada na cor de fundo
const getTextColor = (backgroundColor: string): string => {
  // Remove # se existir
  const hex = backgroundColor.replace('#', '')
  
  // Se a cor for muito curta ou inválida, usar preto como padrão
  if (hex.length !== 6) {
    return 'text-black'
  }
  
  // Converter hex para RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Calcular luminância usando a fórmula padrão
  // https://en.wikipedia.org/wiki/Relative_luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Se a luminância for alta (cor clara), usar texto preto
  // Se a luminância for baixa (cor escura), usar texto branco
  return luminance > 0.5 ? 'text-black' : 'text-white'
}

// Função para obter botão de ação (movida para fora do componente)
const getBotaoAcao = (
  participant: EventParticipant,
  currentSelectedDay: string,
  hasCheckIn: (participantId: string, date: string) => boolean,
  hasCheckOut: (participantId: string, date: string) => boolean,
): string | null => {
  // Verificar se o participante trabalha no dia selecionado
  // Primeiro, tentar usar nova estrutura (shiftId)
  if (participant.shiftId) {
    // currentSelectedDay pode ser um shiftId (formato: "2025-08-09-evento-diurno") 
    // ou uma data (formato: "2025-08-09" ou "09/08/2025")
    if (participant.shiftId === currentSelectedDay) {
      // Correspondência exata do shiftId
    } else if (participant.workDate) {
      // Verificar se a data corresponde
      const participantWorkDate = new Date(participant.workDate).toISOString().split('T')[0]
      const normalizedSelectedDay = normalizeDate(currentSelectedDay)
      const selectedDateOnly = normalizedSelectedDay.includes('/')
        ? normalizedSelectedDay.split('/').reverse().join('-')
        : currentSelectedDay.split('-').slice(0, 3).join('-')

      if (participantWorkDate !== selectedDateOnly) {
        return null // Não trabalha nesta data
      }
    } else {
      return null
    }
  }
  // Fallback para estrutura legada (daysWork)
  else if (participant.daysWork && participant.daysWork.length > 0) {
    const normalizedSelectedDay = normalizeDate(currentSelectedDay)
    const hasDay = participant.daysWork.some(workDay => {
      const normalizedWorkDay = normalizeDate(workDay)
      return normalizedWorkDay === normalizedSelectedDay
    })

    if (!hasDay) {
      return null // Não trabalha nesta data
    }
  } else {
    return null // Sem informação de dias de trabalho
  }

  // Verificar status de presença baseado nos dados reais de attendance
  const hasCheckInToday = hasCheckIn(participant.id, currentSelectedDay)
  const hasCheckOutToday = hasCheckOut(participant.id, currentSelectedDay)

  if (!hasCheckInToday) {
    return 'checkin'
  } else if (hasCheckInToday && !hasCheckOutToday) {
    return 'checkout'
  } else if (hasCheckInToday && hasCheckOutToday) {
    return 'reset' // Permitir resetar quando já fez check-in e check-out
  } else {
    return null
  }
}

const ParticipantRow = React.memo<{
  index: number
  style: React.CSSProperties
  data: {
    participants: EventParticipant[]
    selectedParticipants: Set<string>
    currentSelectedDay: string
    hasCheckIn: (participantId: string, date: string) => boolean
    hasCheckOut: (participantId: string, date: string) => boolean
    onToggleParticipant: (participantId: string) => void
    onCheckIn: (participant: EventParticipant) => void
    onCheckOut: (participant: EventParticipant) => void
    onReset: (participant: EventParticipant) => void
    onDelete: (participant: EventParticipant) => void
    onEdit: (participant: EventParticipant) => void
    credentials: Array<{ id: string; nome: string; cor: string }>
    loading: boolean
  }
}>(({ index, style, data }) => {
  const participant = data.participants[index]

  if (!participant) {
    return (
      <div
        style={style}
        className="flex items-center px-6 py-4 border-b border-gray-100"
      >
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  const botaoTipo = getBotaoAcao(
    participant,
    data.currentSelectedDay,
    data.hasCheckIn,
    data.hasCheckOut,
  )

  // Buscar informações da credencial
  const credentialInfo = data.credentials.find(cred => cred.id === participant.credentialId)

  return (
    <div
      style={style}
      className="flex items-center px-6 py-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 transition-all duration-200"
    >
      <div className="grid grid-cols-7 gap-4 w-full items-center">
        {/* Checkbox */}
        <div className="flex items-center justify-center">
          <Checkbox
            checked={data.selectedParticipants.has(participant.id)}
            onCheckedChange={() => data.onToggleParticipant(participant.id)}
          />
        </div>

        {/* Participante */}
        <div className="col-span-1">
          <div className="text-sm font-semibold text-gray-900 uppercase">
            {participant.name}
          </div>
          <div className="text-sm text-gray-600 uppercase">
            {participant.role}
          </div>
        </div>

        {/* Empresa */}
        <div className="col-span-1 hidden md:block">
          <div className="space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 uppercase">
              {participant.company}
            </span>
            {participant.daysWork && participant.daysWork.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {participant.daysWork.slice(0, 2).map((day, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                  >
                    {day}
                  </span>
                ))}
                {participant.daysWork.length > 2 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    +{participant.daysWork.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tipo de Credencial */}
        <div className="col-span-1 hidden lg:block">
          <div className="space-y-1">
            {credentialInfo ? (
              <span 
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${getTextColor(credentialInfo.cor)}`}
                style={{ backgroundColor: credentialInfo.cor }}
              >
                {credentialInfo.nome}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 uppercase">
                Sem Credencial
              </span>
            )}
          </div>
        </div>

        {/* Validado Por */}
        <div className="col-span-1 hidden md:block">
          <div className="space-y-1">
            <p className="text-gray-600 text-sm uppercase">
              {participant.validatedBy || '-'}
            </p>
            <div className="flex gap-1">
              {data.hasCheckIn(participant.id, data.currentSelectedDay) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <Check className="w-3 h-3 mr-1" />
                  Check-in
                </span>
              )}
              {data.hasCheckOut(participant.id, data.currentSelectedDay) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  <Clock className="w-3 h-3 mr-1" />
                  Check-out
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CPF */}
        <div className="col-span-1">
          <p className="text-gray-600 text-sm font-mono uppercase">
            {participant.cpf}
          </p>
        </div>

        {/* Ações */}
        <div className="col-span-1">
          <div className="flex items-center space-x-2">
            {botaoTipo === 'checkin' && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                disabled={data.loading}
                onClick={() => data.onCheckIn(participant)}
              >
                <Check className="w-4 h-4 mr-1" />
                Check-in
              </Button>
            )}
            {botaoTipo === 'checkout' && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                disabled={data.loading}
                onClick={() => data.onCheckOut(participant)}
              >
                <Clock className="w-4 h-4 mr-1" />
                Check-out
              </Button>
            )}
            {botaoTipo === 'reset' && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                disabled={data.loading}
                onClick={() => data.onReset(participant)}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-50"
                >
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white">
                <DropdownMenuItem
                  onClick={() => data.onCheckIn(participant)}
                  className="text-green-600 focus:text-green-700 focus:bg-green-50"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Check-in
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => data.onCheckOut(participant)}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Check-out
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => data.onReset(participant)}
                  className="text-yellow-600 focus:text-yellow-700 focus:bg-yellow-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resetar
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => data.onEdit(participant)}
                  className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                >
                  <User className="w-4 h-4 mr-2" />
                  Editar Staff
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => data.onDelete(participant)}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  <MoreVertical className="w-4 h-4 mr-2" />
                  Excluir Participante
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
})

ParticipantRow.displayName = 'ParticipantRow'

const VirtualizedParticipantsTable: React.FC<
  VirtualizedParticipantsTableProps
> = ({
  participants,
  selectedParticipants,
  currentSelectedDay,
  hasCheckIn,
  hasCheckOut,
  onToggleParticipant,
  onSelectAll,
  onCheckIn,
  onCheckOut,
  onReset,
  onDelete,
  onEdit,
  credentials = [],
  isLoading = false,
  loading = false,
}) => {
    // Dados otimizados para o componente virtualizado
    const itemData = useMemo(
      () => ({
        participants,
        selectedParticipants,
        currentSelectedDay,
        hasCheckIn,
        hasCheckOut,
        onToggleParticipant,
        onCheckIn,
        onCheckOut,
        onReset,
        onDelete,
        onEdit,
        credentials,
        loading,
      }),
      [
        participants,
        selectedParticipants,
        currentSelectedDay,
        hasCheckIn,
        hasCheckOut,
        onToggleParticipant,
        onCheckIn,
        onCheckOut,
        onReset,
        onDelete,
        onEdit,
        credentials,
        loading,
      ],
    )

    if (isLoading) {
      return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-16 text-center text-gray-500">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Carregando...
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (participants.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-16 text-center text-gray-500">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Nenhum participante encontrado para {(() => {
                  // Função para extrair informações do shift ID para display mais amigável
                  const parseShiftForDisplay = (shiftId: string) => {
                    const parts = shiftId.split('-');
                    if (parts.length >= 5) {
                      const year = parts[0];
                      const month = parts[1];
                      const day = parts[2];
                      const stage = parts[3];
                      const period = parts[4] as 'diurno' | 'noturno';

                      const date = new Date(`${year}-${month}-${day}`);
                      const dateFormatted = date.toLocaleDateString('pt-BR');
                      const stageLabel = stage === 'montagem' ? 'Montagem' :
                        stage === 'evento' ? 'Evento' :
                          stage === 'desmontagem' ? 'Desmontagem' : stage;
                      const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno';

                      return `${dateFormatted} (${stageLabel} - ${periodLabel})`;
                    }
                    return shiftId;
                  };

                  return parseShiftForDisplay(currentSelectedDay);
                })()}
              </p>
              <p className="text-sm text-gray-500">
                Adicione participantes com dias de trabalho definidos ou ajuste os
                filtros
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border-b border-gray-200">
          <div className="grid grid-cols-7 gap-4 px-6 py-4 items-center">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={
                  selectedParticipants.size === participants.length &&
                  participants.length > 0
                }
                onCheckedChange={onSelectAll}
              />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider">
              Participante
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider hidden md:block">
              Empresa
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider hidden lg:block">
              Credencial
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider hidden md:block">
              Validado Por
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider">
              CPF
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider">
              Ações
            </div>
          </div>
        </div>

        {/* Virtualized Rows */}
        <div className="overflow-hidden">
          <List
            height={Math.min(participants.length * 80, 600)} // Máximo 600px de altura
            itemCount={participants.length}
            itemSize={80} // Altura de cada linha
            itemData={itemData}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {ParticipantRow}
          </List>
        </div>
      </div>
    )
  }

export default VirtualizedParticipantsTable
