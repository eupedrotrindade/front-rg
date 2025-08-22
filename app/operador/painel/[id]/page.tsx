/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

'use client'

import type React from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createEventParticipant } from '@/features/eventos/actions/create-event-participant'
import { updateEventParticipant } from '@/features/eventos/actions/update-event-participant'
import {
  useCheckIn,
  useCheckOut,
} from '@/features/eventos/api/mutation/use-check-operations'
import { useEventAttendanceByEventAndDate } from '@/features/eventos/api/query/use-event-attendance'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import type { EventParticipant } from '@/features/eventos/types'
import apiClient from '@/lib/api-client'
import { formatEventDate } from '@/lib/utils'

import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Filter,
  Loader2,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Upload,
  User,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FixedSizeList as List } from 'react-window'


import ExcelColumnFilter from '@/components/ui/excel-column-filter'
import { preloadModal, useLazyModal } from '@/components/ui/lazy-modal'

import { changeCredentialCode, getMovementCredentialByParticipant } from '@/features/eventos/actions/movement-credentials'
import { updateParticipantCredential } from '@/features/eventos/actions/update-participant-credential'
import { useCredentialsByEvent } from '@/features/eventos/api/query/use-credentials-by-event'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import {
  useCancellableRequest,
  useDebouncedCancellableRequest,
} from '@/hooks/useCancellableRequest'
import { useIndexedSearch } from '@/hooks/useOptimizedSearch'
import ModalAdicionarStaff from '@/components/operador/modalAdicionarStaff'

export default function Painel() {
  // TODOS OS useState PRIMEIRO
  const [filtro, setFiltro] = useState({
    nome: '',
    cpf: '',
    pulseira: '',
    empresa: '',
    funcao: '',
    credencial: '',
  })

  const [selectedParticipant, setSelectedParticipant] =
    useState<EventParticipant | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [nomeEvento, setNomeEvento] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isRealtimeSyncing, setIsRealtimeSyncing] = useState(false)

  // Estados para popups de check-in/check-out
  const [popupCheckin, setPopupCheckin] = useState(false)
  const [popupCheckout, setPopupCheckout] = useState(false)
  const [codigoPulseira, setCodigoPulseira] = useState('')
  const [participantAction, setParticipantAction] =
    useState<EventParticipant | null>(null)
  const [novaPulseira, setNovaPulseira] = useState('')

  // Estados para adicionar novo staff
  const [popupNovoStaff, setPopupNovoStaff] = useState(false)
  const [novoStaff, setNovoStaff] = useState({
    name: '',
    cpf: '',
    funcao: '',
    empresa: '',
    tipo_credencial: '',
    cadastrado_por: '',
    daysWork: [] as string[],
  })

  // Estados para troca de pulseira
  const [popupTrocaPulseira, setPopupTrocaPulseira] = useState(false)
  const [selectedParticipantForPulseira, setSelectedParticipantForPulseira] =
    useState<EventParticipant | null>(null)
  const [newCredentialType, setNewCredentialType] = useState('')

  const [operadorLogado, setOperadorLogado] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [operadorInfo, setOperadorInfo] = useState<{
    nome: string
    cpf: string
    id?: string
    acoes?: any[]
    id_events?: string
  } | null>(null)

  // Estados para selects pesquisáveis
  const [empresaSelectOpen, setEmpresaSelectOpen] = useState(false)
  const [funcaoSelectOpen, setFuncaoSelectOpen] = useState(false)
  const [credencialSelectOpen, setCredencialSelectOpen] = useState(false)

  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Estados para importação e duplicados
  const [duplicadosDialogOpen, setDuplicadosDialogOpen] = useState(false)
  const [duplicadosEncontrados, setDuplicadosEncontrados] = useState<
    EventParticipant[]
  >([])
  const [registrosUnicos, setRegistrosUnicos] = useState<EventParticipant[]>([])
  const [importDialogLoading, setImportDialogLoading] = useState(false)
  const [resumoDialogOpen, setResumoDialogOpen] = useState(false)
  const [resumoImportacao, setResumoImportacao] = useState<{
    importados: EventParticipant[]
    barrados: EventParticipant[]
    falhados?: { item: EventParticipant; motivo: string }[]
  }>({ importados: [], barrados: [], falhados: [] })

  const [ordenacao, setOrdenacao] = useState<{
    campo: string
    direcao: 'asc' | 'desc'
  }>({ campo: 'name', direcao: 'asc' })
  const [preLoading, setPreLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Estado para tabs de dias do evento
  const [selectedDay, setSelectedDay] = useState<string>('')

  // Estados para carrossel dos dias
  const [scrollPosition, setScrollPosition] = useState(0)
  const [showLeftArrow, setShowLeftArrow] = useState(true)
  const [showRightArrow, setShowRightArrow] = useState(true)

  // Estados para otimização (paginação removida - usando virtualização completa)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [virtualizedData, setVirtualizedData] = useState<EventParticipant[]>([])
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(
    null,
  )

  // Estados para cache otimizado (simplificado)
  const [isDataStale, setIsDataStale] = useState(false)

  // Estados para virtualização e performance
  const [isVirtualMode, setIsVirtualMode] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isMobileTable, setIsMobileTable] = useState(false)


  // Estados para filtros estilo Excel das colunas
  const [columnFilters, setColumnFilters] = useState<{
    nome: string[]
    cpf: string[]
    funcao: string[]
    empresa: string[]
    credencial: string[]
  }>({
    nome: [],
    cpf: [],
    funcao: [],
    empresa: [],
    credencial: [],
  })

  // Estados para check-in/check-out por data
  const [selectedDateForAction, setSelectedDateForAction] = useState<string>('')
  const [attendanceStatus, setAttendanceStatus] = useState<{
    participantId: string
    date: string
    checkIn: string | null
    checkOut: string | null
    status: string
  } | null>(null)

  // Estado para armazenar status de presença de todos os participantes
  const [participantsAttendanceStatus, setParticipantsAttendanceStatus] =
    useState<
      Map<
        string,
        {
          checkIn: string | null
          checkOut: string | null
          status: string
        }
      >
    >(new Map())

  // Estado para controlar se os dados de attendance foram carregados completamente
  const [attendanceDataLoaded, setAttendanceDataLoaded] =
    useState<boolean>(false)

  // Estado para controlar o loading durante carregamento de attendance
  const [isLoadingAttendance, setIsLoadingAttendance] = useState<boolean>(false)


  // Estados para permissões de operadores
  const [operatorPermissions, setOperatorPermissions] = useState<{
    operatorId: string
    eventId: string
    allowedDates: string[]
    createdBy?: string
    createdAt: string
  } | null>(null)
  const [availableDatesForOperator, setAvailableDatesForOperator] = useState<
    string[]
  >([])
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedOperatorForPermissions, setSelectedOperatorForPermissions] =
    useState<{
      id: string
      nome: string
    } | null>(null)

  // Estado para código da pulseira do participante selecionado
  const [selectedParticipantWristband, setSelectedParticipantWristband] = useState<string | null>(null)

  // Estados para edição inline de pulseira
  const [editingWristbandId, setEditingWristbandId] = useState<string | null>(null)
  const [newWristbandCode, setNewWristbandCode] = useState('')
  const [participantWristbands, setParticipantWristbands] = useState<Map<string, string>>(new Map())

  // TODOS OS useRef DEPOIS DOS useState
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // TODOS OS HOOKS DE NAVEGAÇÃO E DADOS
  const params = useParams()
  const router = useRouter()
  const eventId = params?.id as string
  const { data: evento, isLoading: eventosLoading } = useEventos({
    id: eventId,
  })
  const {
    data: participantsData = [],
    isLoading: participantsLoading,
    isError: participantsError,
    error: participantsErrorObj,
    refetch: refetchParticipants,
  } = useEventParticipantsByEvent({ eventId })
  const { data: credential = [] } = useCredentialsByEvent(eventId)
  // Hooks para operações de check-in/check-out
  const checkInMutation = useCheckIn()
  const checkOutMutation = useCheckOut()

  // Função para converter data para formato da API (dd-mm-yyyy) - copiada do events panel
  const formatDateForAPI = useCallback((dateStr: string): string => {
    console.log('🔧 formatDateForAPI chamada com:', dateStr);

    // Se já está no formato dd-mm-yyyy, retorna como está
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      console.log('✅ Já está no formato correto DD-MM-YYYY:', dateStr);
      return dateStr
    }

    // Se é um shift ID (formato: YYYY-MM-DD-stage-period), extrair a data
    if (/^\d{4}-\d{2}-\d{2}-.+-.+$/.test(dateStr)) {
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        const result = `${day}-${month}-${year}`;
        console.log('✅ Shift ID convertido de', dateStr, 'para', result);
        return result;
      }
    }

    // Se está no formato dd/mm/yyyy, converte para dd-mm-yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/')
      const result = `${day}-${month}-${year}`;
      console.log('✅ DD/MM/YYYY convertido de', dateStr, 'para', result);
      return result
    }

    // Se está no formato yyyy-mm-dd, converte para dd-mm-yyyy
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-')
      const result = `${day}-${month}-${year}`;
      console.log('✅ YYYY-MM-DD convertido de', dateStr, 'para', result);
      return result
    }

    // Se é uma data JavaScript, converte para dd-mm-yyyy
    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear().toString()
        const result = `${day}-${month}-${year}`;
        console.log('✅ Data JavaScript convertida de', dateStr, 'para', result);
        return result
      }
    } catch (error) {
      console.error('❌ Erro ao converter data para API:', dateStr, error)
    }

    console.log('⚠️ formatDateForAPI retornando valor original:', dateStr);
    return dateStr
  }, [])

  // Hook para buscar status de presença por evento e data
  const { data: attendanceData, refetch: refetchAttendance } =
    useEventAttendanceByEventAndDate(
      params?.id as string,
      formatDateForAPI(selectedDay),
    )

  // Hooks de otimização de performance
  const { createCancellableRequest, cancelAllRequests } =
    useCancellableRequest()


  // Hook de busca otimizada com índices APENAS para datasets muito grandes (>1000)
  const [searchResult, performOptimizedSearchFn, clearSearch] =
    useIndexedSearch({
      data: participantsData,
      searchFields: ['name', 'cpf', 'role', 'company'],
      enableIndexing: participantsData.length > 1000, // Aumentado threshold
      debounceMs: 0, // Sem debounce no hook (controlamos na função)
      minSearchLength: 2,
    })

  // Versão debounced da função de carregamento de presença
  const debouncedLoadAttendanceStatus = useDebouncedCancellableRequest(
    async (participants: EventParticipant[], date: string) => {
      return carregarStatusPresencaTodos(participants, date)
    },
    500,
  )

  // TODOS OS useMemo DEPOIS DOS HOOKS DE DADOS

  // Função simples para hash sem useCallback desnecessário
  const generateFilterHash = (filtro: any, selectedDay: string) => {
    return JSON.stringify({ filtro, selectedDay })
  }

  // Função de debounce otimizada
  const debouncedSearch = (searchTerm: string) => {
    if (searchDebounce) {
      clearTimeout(searchDebounce)
    }

    const timeout = setTimeout(() => {
      // Virtualização não precisa de reset de página
    }, 50) // Muito reduzido para fluidez

    setSearchDebounce(timeout)
  }

  // Handler de busca simplificado sem useCallback
  const handleOptimizedSearch = (term: string) => {
    setSearchTerm(term)
    setIsSearching(true)

    // Para datasets grandes, usar busca indexada
    if (participantsData.length > 500) {
      performOptimizedSearchFn(term)
    } else {
      debouncedSearch(term)
    }

    // Virtualização não precisa de reset de página
  }

  // Funções de utilidade removidas - usando virtualização completa

  // Função removida - paginação não é mais necessária com virtualização

  const isDateWithinEventPeriods = useCallback(
    (dateStr: string): boolean => {
      if (!evento || Array.isArray(evento)) return false

      let inputDate: Date
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/')
        inputDate = new Date(
          Number.parseInt(year),
          Number.parseInt(month) - 1,
          Number.parseInt(day),
        )
      } else {
        inputDate = new Date(dateStr)
      }

      if (isNaN(inputDate.getTime())) return false

      // Usar os arrays montagem, evento, desmontagem
      const allEventDates = [
        ...(evento.montagem || []).map(item => new Date(item.date)),
        ...(evento.evento || []).map(item => new Date(item.date)),
        ...(evento.desmontagem || []).map(item => new Date(item.date))
      ]

      return allEventDates.some(eventDate => {
        eventDate.setHours(0, 0, 0, 0)
        inputDate.setHours(0, 0, 0, 0)
        return inputDate.getTime() === eventDate.getTime()
      })
    },
    [evento],
  )

  const validateAndProcessDaysWork = useCallback(
    (inputValue: string): string[] => {
      const days = inputValue
        .split(',')
        .map(day => day.trim())
        .filter(day => day)
      const validDays: string[] = []
      const invalidDays: string[] = []

      days.forEach(day => {
        if (isDateWithinEventPeriods(day)) {
          let formattedDate: string
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(day)) {
            formattedDate = day
          } else {
            const date = new Date(day)
            if (!isNaN(date.getTime())) {
              formattedDate = date.toLocaleDateString('pt-BR')
            } else {
              formattedDate = day
            }
          }
          validDays.push(formattedDate)
        } else {
          invalidDays.push(day)
        }
      })

      if (invalidDays.length > 0) {
        const permittedInfo = getPermittedDatesInfo()
        toast.error(
          `Datas inválidas removidas: ${invalidDays.join(
            ', ',
          )}. Períodos disponíveis: ${permittedInfo}`,
        )
      }

      return validDays
    },
    [isDateWithinEventPeriods],
  )

  const getPermittedDatesInfo = useCallback((): string => {
    if (!evento || Array.isArray(evento)) return 'Carregando...'

    const periods = []

    // Processar montagem
    if (evento.montagem && evento.montagem.length > 0) {
      const dates = evento.montagem.map(item => new Date(item.date).toLocaleDateString('pt-BR'))
      const uniqueDates = [...new Set(dates)].sort()
      if (uniqueDates.length === 1) {
        periods.push(`Montagem: ${uniqueDates[0]}`)
      } else {
        periods.push(`Montagem: ${uniqueDates[0]} - ${uniqueDates[uniqueDates.length - 1]}`)
      }
    }

    // Processar evento
    if (evento.evento && evento.evento.length > 0) {
      const dates = evento.evento.map(item => new Date(item.date).toLocaleDateString('pt-BR'))
      const uniqueDates = [...new Set(dates)].sort()
      const hasSetup = evento.montagem && evento.montagem.length > 0
      const hasFinalization = evento.desmontagem && evento.desmontagem.length > 0
      const eventLabel = !hasSetup && !hasFinalization ? 'Dia do Evento' : 'Evento'

      if (uniqueDates.length === 1) {
        periods.push(`${eventLabel}: ${uniqueDates[0]}`)
      } else {
        periods.push(`${eventLabel}: ${uniqueDates[0]} - ${uniqueDates[uniqueDates.length - 1]}`)
      }
    }

    // Processar desmontagem
    if (evento.desmontagem && evento.desmontagem.length > 0) {
      const dates = evento.desmontagem.map(item => new Date(item.date).toLocaleDateString('pt-BR'))
      const uniqueDates = [...new Set(dates)].sort()
      if (uniqueDates.length === 1) {
        periods.push(`Desmontagem: ${uniqueDates[0]}`)
      } else {
        periods.push(`Desmontagem: ${uniqueDates[0]} - ${uniqueDates[uniqueDates.length - 1]}`)
      }
    }

    if (periods.length === 0) {
      return 'Nenhum período definido'
    }

    return periods.join(' | ')
  }, [evento])

  // Função para normalizar formato de data - baseada no eventos/[id]/page.tsx
  const normalizeDate = useCallback((dateStr: string): string => {
    // Se já está no formato dd/mm/yyyy, retorna como está
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr
    }

    // Se é um shift ID (formato: YYYY-MM-DD-stage-period), extrair a data
    if (/^\d{4}-\d{2}-\d{2}-.+-.+$/.test(dateStr)) {
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${day}/${month}/${year}`;
      }
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
        return formatEventDate(dateStr)
      }
    } catch (error) {
      console.error('Erro ao converter data:', dateStr, error)
    }

    return dateStr
  }, [])

  // Função para extrair informações do shift ID - baseada no eventos/[id]/page.tsx
  const parseShiftId = useCallback((shiftId: string) => {
    // Formato esperado: YYYY-MM-DD-stage-period
    const parts = shiftId.split('-');
    if (parts.length >= 5) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      const stage = parts[3];
      const period = parts[4] as 'diurno' | 'noturno' | 'dia_inteiro';

      return {
        dateISO: `${year}-${month}-${day}`,
        dateFormatted: formatEventDate(`${year}-${month}-${day}T00:00:00`),
        stage,
        period
      };
    }

    // Fallback para formato simples (apenas data)
    try {
      const dateFormatted = formatEventDate(shiftId.includes('T') ? shiftId : shiftId + 'T00:00:00');
      return {
        dateISO: shiftId,
        dateFormatted,
        stage: 'unknown',
        period: 'diurno' as const
      };
    } catch (error) {
      // Se não conseguir fazer parse da data, retornar valor padrão
      return {
        dateISO: shiftId,
        dateFormatted: shiftId,
        stage: 'unknown',
        period: 'diurno' as const
      };
    }
  }, []);

  const getEventDays = useCallback((): Array<{
    id: string
    label: string
    date: string
    type: string
    period?: 'diurno' | 'noturno' | 'dia_inteiro'
  }> => {
    if (!evento || Array.isArray(evento)) return []

    const days: Array<{
      id: string
      label: string
      date: string
      type: string
      period?: 'diurno' | 'noturno' | 'dia_inteiro'
    }> = []

    // Usar os arrays montagem, evento, desmontagem do JSON

    // Processar montagem
    if (evento.montagem && Array.isArray(evento.montagem)) {
      console.log('🔧 Processando montagem:', evento.montagem)
      evento.montagem.forEach((item: { date: string; period: 'diurno' | 'noturno' | 'dia_inteiro' }) => {
        // Usar a data ISO diretamente sem conversões desnecessárias
        const isoDate = item.date // YYYY-MM-DD
        const date = new Date(item.date + 'T12:00:00') // Forçar meio-dia para evitar timezone
        const dateStr = date.toLocaleDateString('pt-BR')

        const dayId = `${isoDate}-montagem-${item.period}`
        console.log('✅ Adicionando montagem:', { dayId, dateStr, item })

        days.push({
          id: dayId,
          label: `${dateStr} (MONTAGEM - ${item.period === 'dia_inteiro' ? 'DIA INTEIRO' : item.period.toUpperCase()})`,
          date: dateStr,
          type: 'setup',
          period: item.period,
        })
      })
    }

    // Processar evento
    if (evento.evento && Array.isArray(evento.evento)) {
      console.log('🔧 Processando evento:', evento.evento)
      const hasSetup = evento.montagem && evento.montagem.length > 0
      const hasFinalization = evento.desmontagem && evento.desmontagem.length > 0
      const isOnlyEventDay = !hasSetup && !hasFinalization
      const eventLabel = isOnlyEventDay ? 'DIA DO EVENTO' : 'EVENTO'

      evento.evento.forEach((item: { date: string; period: 'diurno' | 'noturno' | 'dia_inteiro' }) => {
        // Usar a data ISO diretamente sem conversões desnecessárias
        const isoDate = item.date // YYYY-MM-DD
        const date = new Date(item.date + 'T12:00:00') // Forçar meio-dia para evitar timezone
        const dateStr = date.toLocaleDateString('pt-BR')

        const dayId = `${isoDate}-evento-${item.period}`
        console.log('✅ Adicionando evento:', { dayId, dateStr, item })

        days.push({
          id: dayId,
          label: `${dateStr} (${eventLabel} - ${item.period === 'dia_inteiro' ? 'DIA INTEIRO' : item.period.toUpperCase()})`,
          date: dateStr,
          type: 'preparation',
          period: item.period,
        })
      })
    }

    // Processar desmontagem
    if (evento.desmontagem && Array.isArray(evento.desmontagem)) {
      console.log('🔧 Processando desmontagem:', evento.desmontagem)
      evento.desmontagem.forEach((item: { date: string; period: 'diurno' | 'noturno' | 'dia_inteiro' }) => {
        // Usar a data ISO diretamente sem conversões desnecessárias
        const isoDate = item.date // YYYY-MM-DD
        const date = new Date(item.date + 'T12:00:00') // Forçar meio-dia para evitar timezone
        const dateStr = date.toLocaleDateString('pt-BR')

        const dayId = `${isoDate}-desmontagem-${item.period}`
        console.log('✅ Adicionando desmontagem:', { dayId, dateStr, item })

        days.push({
          id: dayId,
          label: `${dateStr} (DESMONTAGEM - ${item.period === 'dia_inteiro' ? 'DIA INTEIRO' : item.period.toUpperCase()})`,
          date: dateStr,
          type: 'finalization',
          period: item.period,
        })
      })
    }

    // Ordenar por data e período
    const sortedDays = days.sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'))
      const dateB = new Date(b.date.split('/').reverse().join('-'))

      if (dateA.getTime() === dateB.getTime()) {
        // Se mesma data, ordenar por período (diurno, noturno, dia_inteiro)
        const periodOrder = { diurno: 0, noturno: 1, dia_inteiro: 2 };
        const aPeriodOrder = periodOrder[a.period as keyof typeof periodOrder] ?? 999;
        const bPeriodOrder = periodOrder[b.period as keyof typeof periodOrder] ?? 999;
        return aPeriodOrder - bPeriodOrder;
      }

      return dateA.getTime() - dateB.getTime()
    })

    console.log('🎯 Dias gerados pelo getEventDays:', sortedDays)
    return sortedDays
  }, [evento])

  const getColaboradoresPorDia = useCallback(
    (dia: string): EventParticipant[] => {
      if (dia === 'all' || !dia) {
        return participantsData || [] // Fallback seguro
      }

      console.log('🔧 getColaboradoresPorDia chamada com dia:', dia)
      console.log('🔍 Participantes disponíveis:', participantsData?.length || 0)

      // Usar apenas shiftId para filtrar participantes
      const filtered = (participantsData || []).filter((colab: EventParticipant) => {
        console.log('🔍 Analisando participante:', colab.name, {
          shiftId: colab.shiftId
        })

        // Verificar se tem shiftId
        if (!colab.shiftId) {
          console.log('❌ Participante sem shiftId:', colab.name)
          return false
        }

        // Verificação por shiftId exato
        if (colab.shiftId === dia) {
          console.log('✅ Match por shiftId:', colab.name, colab.shiftId)
          return true
        }

        console.log('❌ Participante não trabalha neste turno:', colab.name)
        return false
      })

      console.log(`🎯 Filtrados ${filtered.length} participantes para o turno:`, dia)
      return filtered
    },
    [participantsData],
  )

  // Função para contar participantes por turno - baseada no eventos/[id]/page.tsx
  const getParticipantsCountByShift = useCallback(
    (shiftId: string): number => {
      return getColaboradoresPorDia(shiftId).length
    },
    [getColaboradoresPorDia],
  )

  // Função para obter ícone do período - baseada no eventos/[id]/page.tsx
  const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
    if (period === 'diurno') {
      return <Sun className="h-3 w-3 text-yellow-500" />
    } else if (period === 'noturno') {
      return <Moon className="h-3 w-3 text-blue-500" />
    } else if (period === 'dia_inteiro') {
      return <Clock className="h-3 w-3 text-purple-500" />
    }
    return null
  }, [])

  // Função simples sem useCallback
  const scrollToLeft = () => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current
      const scrollAmount = container.clientWidth * 0.8
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  // Função simples sem useCallback
  const scrollToRight = () => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current
      const scrollAmount = container.clientWidth * 0.8
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const getTabColor = useCallback((type: string, isActive: boolean) => {
    if (isActive) {
      switch (type) {
        case 'setup':
          return 'border-yellow-500 text-yellow-600 bg-yellow-50'
        case 'preparation':
          return 'border-blue-500 text-blue-600 bg-blue-50'
        case 'finalization':
          return 'border-purple-500 text-purple-600 bg-purple-50'
        default:
          return 'border-purple-500 text-purple-600 bg-purple-50'
      }
    } else {
      switch (type) {
        case 'setup':
          return 'hover:text-yellow-700 hover:border-yellow-300'
        case 'preparation':
          return 'hover:text-blue-700 hover:border-blue-300'
        case 'finalization':
          return 'hover:text-purple-700 hover:border-purple-300'
        default:
          return 'hover:text-gray-700 hover:border-gray-300'
      }
    }
  }, [])

  const categorizeDaysWork = useCallback(
    (participant: EventParticipant) => {
      if (
        !participant.daysWork ||
        participant.daysWork.length === 0 ||
        !evento ||
        Array.isArray(evento)
      ) {
        return { setup: [], preparation: [], finalization: [] }
      }

      const categorized = {
        setup: [] as string[],
        preparation: [] as string[],
        finalization: [] as string[],
      }

      participant.daysWork.forEach(day => {
        const dayDate = new Date(day.split('/').reverse().join('-'))
        dayDate.setHours(0, 0, 0, 0)

        // Verificar montagem
        if (evento.montagem && evento.montagem.length > 0) {
          const isSetupDay = evento.montagem.some(item => {
            const itemDate = new Date(item.date)
            itemDate.setHours(0, 0, 0, 0)
            return dayDate.getTime() === itemDate.getTime()
          })
          if (isSetupDay) {
            categorized.setup.push(day)
            return
          }
        }

        // Verificar evento
        if (evento.evento && evento.evento.length > 0) {
          const isEventDay = evento.evento.some(item => {
            const itemDate = new Date(item.date)
            itemDate.setHours(0, 0, 0, 0)
            return dayDate.getTime() === itemDate.getTime()
          })
          if (isEventDay) {
            categorized.preparation.push(day)
            return
          }
        }

        // Verificar desmontagem
        if (evento.desmontagem && evento.desmontagem.length > 0) {
          const isFinalizationDay = evento.desmontagem.some(item => {
            const itemDate = new Date(item.date)
            itemDate.setHours(0, 0, 0, 0)
            return dayDate.getTime() === itemDate.getTime()
          })
          if (isFinalizationDay) {
            categorized.finalization.push(day)
            return
          }
        }
      })

      return categorized
    },
    [evento],
  )

  const getAvailableDates = useCallback(
    (phase?: string): string[] => {
      if (!evento || Array.isArray(evento)) return []

      const availableDates: string[] = []

      if (phase) {
        let phaseItems: { date: string; period: string }[] = []

        switch (phase) {
          case 'preparacao':
            phaseItems = evento.evento || []
            break
          case 'montagem':
            phaseItems = evento.montagem || []
            break
          case 'finalizacao':
            phaseItems = evento.desmontagem || []
            break
          default:
            return []
        }

        phaseItems.forEach(item => {
          const date = new Date(item.date)
          const formattedDate = date.toLocaleDateString('pt-BR')
          if (!availableDates.includes(formattedDate)) {
            availableDates.push(formattedDate)
          }
        })

        return availableDates.sort()
      }

      // Retornar todas as datas disponíveis de todos os períodos
      const allItems = [
        ...(evento.montagem || []),
        ...(evento.evento || []),
        ...(evento.desmontagem || [])
      ]

      allItems.forEach(item => {
        const date = new Date(item.date)
        const formattedDate = date.toLocaleDateString('pt-BR')
        if (!availableDates.includes(formattedDate)) {
          availableDates.push(formattedDate)
        }
      })

      return availableDates.sort()
    },
    [evento],
  )

  const hasDefinedPeriods = useCallback((): boolean => {
    if (!evento || Array.isArray(evento)) return false
    return (
      (evento.montagem && evento.montagem.length > 0) ||
      (evento.evento && evento.evento.length > 0) ||
      (evento.desmontagem && evento.desmontagem.length > 0)
    )
  }, [evento])

  const toggleDateSelection = useCallback((date: string) => {
    setNovoStaff(prev => {
      const currentDates = [...prev.daysWork]
      const dateIndex = currentDates.indexOf(date)
      if (dateIndex > -1) {
        currentDates.splice(dateIndex, 1)
      } else {
        currentDates.push(date)
      }
      return { ...prev, daysWork: currentDates.sort() }
    })
  }, [])

  const atualizarCadastradoPor = useCallback(() => {
    if (operadorInfo) {
      const operadorRaw = localStorage.getItem('operador')
      if (operadorRaw) {
        try {
          const operador = JSON.parse(operadorRaw)
          const cadastradoPor = `${operador.nome}-${operador.cpf}-${operador.id}`
          setNovoStaff(prev => ({ ...prev, cadastrado_por: cadastradoPor }))
        } catch { }
      }
    }
  }, [operadorInfo])

  // Função de limpeza otimizada
  const clearCache = () => {
    setIsDataStale(prev => !prev) // Toggle para forçar refresh
  }

  // Funções para filtros das colunas
  const handleColumnFilterChange = useCallback(
    (column: keyof typeof columnFilters, selectedValues: string[]) => {
      setColumnFilters(prev => ({
        ...prev,
        [column]: selectedValues,
      }))
    },
    [],
  )

  // Função para ordenar tabela por coluna específica
  const handleColumnSort = useCallback(
    (column: string, direction: 'asc' | 'desc') => {
      setOrdenacao({ campo: column, direcao: direction })
      // Virtualização não precisa de reset de página
    },
    [],
  )

  const clearColumnFilters = useCallback(() => {
    setColumnFilters({
      nome: [],
      cpf: [],
      funcao: [],
      empresa: [],
      credencial: [],
    })
    // Virtualização não precisa de reset de página
  }, [])

  const hasActiveColumnFilters = useMemo(() => {
    return Object.values(columnFilters).some(filters => filters.length > 0)
  }, [columnFilters])

  // Função utilitária para converter dd/mm/yyyy para Date
  const dataBRtoDate = (dataStr: string): Date => {
    const [dia, mes, ano] = dataStr.split('/')
    return new Date(Number(ano), Number(mes) - 1, Number(dia))
  }

  // Retorna apenas as datas atribuídas ao operador logado
  const getDiasDisponiveisParaOperador = useCallback(() => {
    console.log('🔍 Debug getDiasDisponiveisParaOperador - operadorInfo:', {
      id: operadorInfo?.id,
      id_events: operadorInfo?.id_events,
      eventId: eventId,
      hasOperatorInfo: !!operadorInfo
    })

    // Se não tem operador logado ou não tem shifts atribuídos, mostrar todos os dias
    if (!operadorInfo?.id || !operadorInfo?.id_events) {
      console.log('🔍 Operador sem ID ou sem shifts atribuídos, mostrando todos os dias')
      const dias = getEventDays()
      console.log('🔍 Todos os dias retornados quando sem shifts:', dias.length, dias.map(d => ({ id: d.id, label: d.label })))
      dias.sort((a, b) => {
        const dateA = dataBRtoDate(a.date)
        const dateB = dataBRtoDate(b.date)
        return dateA.getTime() - dateB.getTime()
      })
      return dias
    }

    console.log('🔍 Operador shifts:', operadorInfo.id_events)

    // Obter todos os dias do evento
    const allEventDays = getEventDays()
    console.log('🔍 Todos os dias do evento:', allEventDays.map(d => d.id))

    // Dividir os shifts do operador por vírgula e filtrar para este evento
    const operatorShifts = operadorInfo.id_events
      .split(',')
      .map(shift => shift.trim())
      .filter(shift => shift.includes(eventId)) // Filtrar apenas shifts deste evento
      .map(shift => shift.replace(`${eventId}:`, '')) // Remover o prefixo eventId:

    console.log('🔍 Shifts do operador para este evento:', operatorShifts)

    // Filtrar apenas os dias em que o operador trabalha
    const diasDisponiveis = allEventDays.filter(day => {
      const dayIncluded = operatorShifts.includes(day.id)
      if (dayIncluded) {
        console.log('✅ Dia incluído:', day.id, day.label)
      } else {
        console.log('❌ Dia excluído:', day.id, day.label)
      }
      return dayIncluded
    })

    // Ordena as datas
    diasDisponiveis.sort((a, b) => {
      const dateA = dataBRtoDate(a.date)
      const dateB = dataBRtoDate(b.date)
      return dateA.getTime() - dateB.getTime()
    })

    console.log('🎯 Dias finais disponíveis para o operador:', diasDisponiveis.map(d => ({ id: d.id, label: d.label })))
    return diasDisponiveis
  }, [operadorInfo?.id, operadorInfo?.id_events, eventId, getEventDays])

  // Adicione após os outros useCallback, antes dos useEffect:

  // Função para formatar CPF (movida para antes dos useMemo)
  const formatCPF = (cpf: string): string => {
    if (!cpf) return ''
    const trimmedCpf = cpf.trim()
    if (!trimmedCpf) return ''
    const digits = trimmedCpf.replace(/\D/g, '')
    if (digits.length !== 11) return trimmedCpf
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  // Função utilitária para obter a credencial do participante
  const getCredencial = (colab: EventParticipant): string => {
    const credentialSelected = credential.find(w => w.id === colab.credentialId)
    if (credentialSelected) {
      return credentialSelected.nome
    } else {
      return 'SEM CREDENCIAL'
    }
  }

  // Função utilitária para obter a cor da credencial do participante
  const getCredencialCor = (colab: EventParticipant): string => {
    const credentialSelected = credential.find(w => w.id === colab.credentialId)
    if (credentialSelected && credentialSelected.cor) {
      return credentialSelected.cor
    } else {
      return '#9333ea' // cor purple padrão
    }
  }

  // Função para determinar se o texto deve ser branco ou preto baseado na cor de fundo
  const getContrastingTextColor = (backgroundColor: string): string => {
    // Remove o # se existir
    const hex = backgroundColor.replace('#', '')

    // Converte para RGB
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // Calcula a luminância
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Retorna branco para cores escuras e preto para cores claras
    return luminance < 0.5 ? '#ffffff' : '#000000'
  }

  // Função para determinar se a cor é muito clara e precisa de borda
  const needsBorder = (backgroundColor: string): boolean => {
    // Remove o # se existir
    const hex = backgroundColor.replace('#', '')

    // Converte para RGB
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // Calcula a luminância
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Se a luminância for muito alta (cor muito clara), precisa de borda
    return luminance > 0.9
  }

  // Função para determinar qual botão mostrar
  const getBotaoAcao = (colaborador: EventParticipant) => {
    // Verificar se o colaborador trabalha neste turno usando shiftId
    if (!colaborador.shiftId || colaborador.shiftId !== selectedDay) {
      return null // Não trabalha neste turno
    }

    // Verificar status de presença para esta data
    const status = participantsAttendanceStatus.get(colaborador.id)

    if (!status) {
      // Se não tem status, permite checkin
      return 'checkin'
    }

    if (!status.checkIn) {
      // Se não tem checkin, permite checkin
      return 'checkin'
    } else if (!status.checkOut) {
      // Se tem checkin mas não tem checkout, permite checkout
      return 'checkout'
    } else {
      // Se já tem checkout, não mostra botão
      return null
    }
  }

  const abrirPopup = async (colaborador: EventParticipant) => {
    setSelectedParticipant(colaborador)
    setModalAberto(true)

    // Buscar código da pulseira do participante
    try {
      const movementCredential = await getMovementCredentialByParticipant(eventId, colaborador.id)
      if (movementCredential?.data?.code) {
        setSelectedParticipantWristband(movementCredential.data.code)
      } else {
        setSelectedParticipantWristband(null)
      }
    } catch (error) {
      setSelectedParticipantWristband(null)
    }
  }

  // Função para abrir popup de check-in
  const abrirCheckin = (colaborador: EventParticipant) => {
    setParticipantAction(colaborador)
    setCodigoPulseira('')
    setSelectedDateForAction(selectedDay)
    setPopupCheckin(true)
  }

  // Função para abrir popup de check-out
  const abrirCheckout = (colaborador: EventParticipant) => {
    setParticipantAction(colaborador)
    setSelectedDateForAction(selectedDay)
    setPopupCheckout(true)
  }

  // TODOS OS useMemo DEPOIS DOS useCallback - OTIMIZADO
  const filtrarColaboradores = useMemo(() => {

    let filtrados: EventParticipant[] = getColaboradoresPorDia(selectedDay)

    filtrados = filtrados.filter((colab: EventParticipant) => {
      // ⚡ BUSCA OTIMIZADA - SEM TRAVAMENTO
      const searchTerm = filtro.nome?.toLowerCase()?.trim() || ''

      // Busca rápida e eficiente (sem loops complexos)
      const quickMatch = (text: string, search: string): boolean => {
        if (!search || !text) return !search

        const textLower = text.toLowerCase()
        const searchLower = search.toLowerCase()

        // 1. Busca direta (mais rápida)
        if (textLower.includes(searchLower)) return true

        // 2. Busca sem acentos (eficiente)
        const textNorm = textLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const searchNorm = searchLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        if (textNorm.includes(searchNorm)) return true

        // 3. Só busca avançada se termo > 2 chars (evita loops desnecessários)
        if (searchNorm.length <= 2) return false

        // 4. Busca por iniciais (otimizada)
        if (searchNorm.length === 2) {
          const words = textLower.split(/[\s]+/)
          if (words.length >= 2) {
            const initials = words[0][0] + (words[1]?.[0] || '')
            if (initials === searchNorm) return true
          }
        }

        return false
      }

      // ⚡ BUSCA RÁPIDA - SEM LOOPS PESADOS
      const nomeMatch = quickMatch(colab.name || '', searchTerm)

      // CPF (otimizado)
      const cpfLimpo = (colab.cpf || '').replace(/\D/g, '')
      const buscaCpfLimpa = searchTerm.replace(/\D/g, '')
      const cpfMatch = buscaCpfLimpa ? cpfLimpo.includes(buscaCpfLimpa) : false

      // Empresa (rápida)
      const empresaMatch_search = quickMatch(colab.company || '', searchTerm)

      // Função (rápida)
      const funcaoMatch_search = quickMatch(colab.role || '', searchTerm)

      // Credencial (eficiente)
      const credencialNome = getCredencial(colab)
      const credencialMatch_search = quickMatch(credencialNome || '', searchTerm)

      // Pulseira (simples)
      const wristbandCode = participantWristbands.get(colab.id) || ''
      const wristbandMatch = wristbandCode.toLowerCase().includes(searchTerm)

      // Filtros específicos dos dropdowns
      const empresaFilter = filtro.empresa ? colab.company === filtro.empresa : true
      const funcaoFilter = filtro.funcao ? colab.role === filtro.funcao : true
      const credencialFilter = filtro.credencial ? getCredencial(colab) === filtro.credencial : true

      // Match geral para busca de texto (MELHORADO - inclui pulseira)
      const searchMatch = !filtro.nome.trim() ||
        nomeMatch || cpfMatch || empresaMatch_search || funcaoMatch_search ||
        credencialMatch_search || wristbandMatch

      let match = searchMatch && empresaFilter && funcaoFilter && credencialFilter


      // Aplicar filtros das colunas
      if (match && hasActiveColumnFilters) {
        const credentialSelected = credential.find(
          w => w.id === colab.credentialId,
        )
        const credentialName = credentialSelected?.nome || 'SEM CREDENCIAL'

        // Filtro de nome
        if (
          columnFilters.nome.length > 0 &&
          !columnFilters.nome.includes(colab.name || '')
        ) {
          match = false
        }

        // Filtro de CPF
        if (columnFilters.cpf.length > 0) {
          const formattedCpf = formatCPF(colab.cpf?.trim() || '')
          if (!columnFilters.cpf.includes(formattedCpf)) {
            match = false
          }
        }

        // Filtro de função
        if (
          columnFilters.funcao.length > 0 &&
          !columnFilters.funcao.includes(colab.role || '')
        ) {
          match = false
        }

        // Filtro de empresa
        if (
          columnFilters.empresa.length > 0 &&
          !columnFilters.empresa.includes(colab.company || '')
        ) {
          match = false
        }

        // Filtro de credencial
        if (
          columnFilters.credencial.length > 0 &&
          !columnFilters.credencial.includes(credentialName)
        ) {
          match = false
        }
      }

      return match
    })

    if (ordenacao.campo) {
      filtrados = filtrados.sort((a: EventParticipant, b: EventParticipant) => {
        let aVal: any
        let bVal: any

        // Mapear campos para valores corretos
        switch (ordenacao.campo) {
          case 'name':
            aVal = a.name ?? ''
            bVal = b.name ?? ''
            break
          case 'cpf':
            aVal = formatCPF(a.cpf?.trim() || '')
            bVal = formatCPF(b.cpf?.trim() || '')
            break
          case 'role':
            aVal = a.role ?? ''
            bVal = b.role ?? ''
            break
          case 'company':
            aVal = a.company ?? ''
            bVal = b.company ?? ''
            // Normalizar para comparação de empresa
            aVal =
              typeof aVal === 'string'
                ? aVal
                  .normalize('NFD')
                  .replace(/\p{Diacritic}/gu, '')
                  .toLowerCase()
                  .trim()
                : ''
            bVal =
              typeof bVal === 'string'
                ? bVal
                  .normalize('NFD')
                  .replace(/\p{Diacritic}/gu, '')
                  .toLowerCase()
                  .trim()
                : ''
            break
          case 'credentialId':
            // Ordenar por nome da credencial, não pelo ID
            const credentialA = credential.find(w => w.id === a.credentialId)
            const credentialB = credential.find(w => w.id === b.credentialId)
            aVal = credentialA?.nome || 'SEM CREDENCIAL'
            bVal = credentialB?.nome || 'SEM CREDENCIAL'
            break
          default:
            // Fallback para outros campos
            type EventParticipantKey = keyof EventParticipant
            const campoOrdenacao = ordenacao.campo as EventParticipantKey
            aVal = a[campoOrdenacao] ?? ''
            bVal = b[campoOrdenacao] ?? ''
        }

        // Comparar valores
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          if (ordenacao.direcao === 'asc') return aVal.localeCompare(bVal)
          else return bVal.localeCompare(aVal)
        }
        return 0
      })
    }

    return { data: filtrados, total: filtrados.length }
  }, [
    filtro.nome,
    filtro.empresa,
    filtro.funcao,
    filtro.credencial,
    selectedDay,
    columnFilters,
    participantsData.length // APENAS length, não array completo
  ]) // ⚡ FIXED: Incluindo filtro.credencial e columnFilters nas dependências

  // Detectar se é mobile para tabela regular
  useEffect(() => {
    const checkIsMobileTable = () => {
      setIsMobileTable(window.innerWidth < 700)
    }

    checkIsMobileTable()
    window.addEventListener('resize', checkIsMobileTable)

    return () => window.removeEventListener('resize', checkIsMobileTable)
  }, [])

  // ⚡ DADOS UNIFICADOS - SEM TRAVAMENTO
  const unifiedData = useMemo(() => {
    return filtrarColaboradores // Sempre usar filtro tradicional otimizado
  }, [
    filtrarColaboradores
  ]) // SIMPLIFIED: uma só dependência

  // 🚀 DADOS FINAIS VIRTUALIZADOS - SEM PAGINAÇÃO
  const finalData = useMemo(() => {
    // Sempre retorna todos os dados filtrados para virtualização
    return unifiedData
  }, [unifiedData])

  // Para compatibilidade com componentes que usam paginatedData
  const paginatedData = finalData

  // 🚀 CONFIGURAÇÃO VIRTUALIZAÇÃO REACT-WINDOW
  const itemHeight = isMobileTable ? 72 : 84 // Altura das linhas

  // Componente para renderizar cada linha da tabela virtualizada
  const VirtualizedTableRow = useCallback(({ index, style }: { index: number; style: any }) => {
    const colab = finalData.data[index]
    if (!colab) return null

    const botaoTipo = getBotaoAcao(colab)

    return (
      <div
        style={style}
        className="border-b border-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 cursor-pointer transition-all duration-200 bg-white shadow-sm"
        onClick={() => abrirPopup(colab)}
      >
        <div className="flex items-center min-h-full">
          {/* Nome - sempre visível */}
          <div
            className={`text-gray-600 ${isMobileTable ? 'px-2 py-3' : 'px-6 py-4'}`}
            style={{ width: isMobileTable ? '40%' : '25%' }}
          >
            <div className="text-sm font-semibold text-gray-900 truncate">
              {colab.name}
            </div>
            {/* Informações adicionais em mobile */}
            {isMobileTable && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                {formatCPF(colab.cpf?.trim() || '')} • {colab.role}
              </div>
            )}
          </div>

          {/* CPF - esconder em mobile */}
          {!isMobileTable && (
            <div
              className="px-6 py-4 whitespace-nowrap text-gray-600"
              style={{ width: '15%' }}
            >
              <p className="text-sm text-gray-900 font-mono">
                {formatCPF(colab.cpf?.trim() || '')}
              </p>
            </div>
          )}

          {/* Função - esconder em mobile */}
          {!isMobileTable && (
            <div
              className="px-6 py-4 whitespace-nowrap text-gray-600"
              style={{ width: '18%' }}
            >
              <p className="text-sm text-gray-600 truncate">{colab.role}</p>
            </div>
          )}

          {/* Empresa - esconder em mobile */}
          {!isMobileTable && (
            <div
              className="px-6 py-4 whitespace-nowrap text-gray-600"
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
              className="px-6 py-4 whitespace-nowrap text-gray-600"
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
            className={`whitespace-nowrap text-sm font-medium sticky right-0 bg-white border-l border-gray-200 ${isMobileTable ? 'px-2 py-3' : 'px-6 py-4'}`}
            style={{ width: isMobileTable ? '30%' : '8%', zIndex: 10 }}
          >
            <div
              className="flex justify-center"
              onClick={e => e.stopPropagation()}
            >
              {botaoTipo === 'checkin' && (
                <Button
                  onClick={() => abrirCheckin(colab)}
                  size="sm"
                  className={`bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 ${isMobileTable ? 'text-xs px-1.5 py-1' : ''}`}
                  disabled={loading}
                >
                  <Check className={`${isMobileTable ? 'w-3 h-3 mr-0.5' : 'w-4 h-4 mr-1'}`} />
                  {isMobileTable ? 'In' : 'Check-in'}
                </Button>
              )}
              {botaoTipo === 'checkout' && (
                <Button
                  onClick={() => abrirCheckout(colab)}
                  size="sm"
                  className={`bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 ${isMobileTable ? 'text-xs px-1.5 py-1' : ''}`}
                  disabled={loading}
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
  }, [finalData.data, formatCPF, getBotaoAcao, getCredencialCor, getContrastingTextColor, needsBorder, getCredencial, loading, abrirCheckin, abrirCheckout, abrirPopup, isMobileTable])

  const isHighVolume = unifiedData.total > 1000
  const showPerformanceIndicator = isHighVolume && !participantsLoading

  // ⚡ VALORES ÚNICOS CORRIGIDOS - FUNCIONANDO
  const columnUniqueValues = useMemo(() => {
    const currentData = getColaboradoresPorDia(selectedDay)

    if (!currentData || currentData.length === 0) {
      return {
        nome: [],
        cpf: [],
        funcao: [],
        empresa: [],
        credencial: []
      }
    }

    return {
      nome: [...new Set(currentData.map(c => c.name).filter(Boolean))].sort(),
      cpf: [...new Set(currentData.map(c => formatCPF(c.cpf?.trim() || '')).filter(Boolean))].sort(),
      funcao: [...new Set(currentData.map(c => c.role).filter(Boolean))].sort(),
      empresa: [...new Set(currentData.map(c => c.company).filter(Boolean))].sort(),
      credencial: [...new Set(currentData.map(c => {
        const cred = credential.find(w => w.id === c.credentialId)
        return cred?.nome || 'SEM CREDENCIAL'
      }).filter(Boolean))].sort()
    }
  }, [selectedDay, participantsData, credential]) // Dependências necessárias


  // Função para obter todos os dias disponíveis nas tabs (navegação sequencial)
  const getDaysOfSameStage = useCallback((currentShiftId: string) => {
    if (!currentShiftId || currentShiftId === 'all') return []

    // Retornar TODOS os dias disponíveis nas tabs, ordenados cronologicamente
    return getDiasDisponiveisParaOperador()
      .sort((a, b) => a.id.localeCompare(b.id))
  }, [getDiasDisponiveisParaOperador])

  // Função para navegar para o dia anterior do mesmo estágio
  const goToPreviousDay = useCallback(() => {
    const sameStageDays = getDaysOfSameStage(selectedDay)
    const currentIndex = sameStageDays.findIndex(day => day.id === selectedDay)

    if (currentIndex > 0) {
      setSelectedDay(sameStageDays[currentIndex - 1].id)
    }
  }, [selectedDay, getDaysOfSameStage])

  // Função para navegar para o próximo dia do mesmo estágio
  const goToNextDay = useCallback(() => {
    const sameStageDays = getDaysOfSameStage(selectedDay)
    const currentIndex = sameStageDays.findIndex(day => day.id === selectedDay)

    if (currentIndex < sameStageDays.length - 1) {
      setSelectedDay(sameStageDays[currentIndex + 1].id)
    }
  }, [selectedDay, getDaysOfSameStage])

  // Função para verificar se há dia anterior/próximo disponível
  const canNavigateToPrevious = useMemo(() => {
    const sameStageDays = getDaysOfSameStage(selectedDay)
    const currentIndex = sameStageDays.findIndex(day => day.id === selectedDay)
    return currentIndex > 0
  }, [selectedDay, getDaysOfSameStage])

  const canNavigateToNext = useMemo(() => {
    const sameStageDays = getDaysOfSameStage(selectedDay)
    const currentIndex = sameStageDays.findIndex(day => day.id === selectedDay)
    return currentIndex < sameStageDays.length - 1
  }, [selectedDay, getDaysOfSameStage])


  // TODOS OS useEffect POR ÚLTIMO
  useEffect(() => {
    const carregarOperador = async () => {
      const operadorRaw = localStorage.getItem('operador')
      setOperadorLogado(!!operadorRaw)
      if (operadorRaw) {
        try {
          const operador = JSON.parse(operadorRaw)

          // Se não tem ID, buscar pelo CPF
          if (!operador.id && operador.cpf) {
            try {
              const response = await apiClient.get(
                `/operadores?cpf=eq.${operador.cpf}`,
              )
              if (response.data && response.data.length > 0) {
                const operadorCompleto = response.data[0]
                console.log('🔍 Operador carregado:', operadorCompleto)
                setOperadorInfo({
                  nome: operador.nome,
                  cpf: operador.cpf,
                  id: operadorCompleto.id,
                  acoes: operadorCompleto.acoes,
                  id_events: operadorCompleto.id_events,
                })
                return
              } else {
              }
            } catch (error) {
            }
          }

          setOperadorInfo({
            nome: operador.nome,
            cpf: operador.cpf,
            id: operador.id,
            acoes: operador.acoes,
            id_events: operador.id_events,
          })
        } catch (error) {
          setOperadorInfo(null)
        }
      } else {
        setOperadorInfo(null)
      }
      setAuthChecked(true)
    }

    carregarOperador()
  }, [])

  useEffect(() => {
    if (participantsData.length > 0) {
      setIsDataStale(true)
      // Dados carregados, limpar loading
      setIsLoadingPage(false)
    }
  }, [participantsData])

  // useEffect para revalidar dados quando filtros mudam
  useEffect(() => {
    // Limpar cache de busca quando filtros mudam
    if (searchDebounce) {
      clearTimeout(searchDebounce)
      setSearchDebounce(null)
    }
  }, [
    filtro,
    selectedDay,
    ordenacao,
    columnFilters,
  ])

  // Carregar status de presença quando o dia selecionado mudar (debounced)
  useEffect(() => {
    const participantesParaCarregar = getColaboradoresPorDia(selectedDay)
    if (selectedDay && participantesParaCarregar.length > 0) {
      setAttendanceDataLoaded(false) // Reset o status ao trocar de dia
      setIsLoadingAttendance(true) // Iniciar loading
      debouncedLoadAttendanceStatus(participantesParaCarregar, selectedDay)
    }
  }, [selectedDay, getColaboradoresPorDia, debouncedLoadAttendanceStatus])


  // Preload do modal de troca de pulseira para melhor UX
  useEffect(() => {
    // Pre-carregar depois que os dados são carregados
    if (participantsData.length > 0) {
      preloadModal(() => import('@/components/operador/modalTrocaPulseira'))
    }
  }, [participantsData.length])

  useEffect(() => {
    return () => {
      if (searchDebounce) {
        clearTimeout(searchDebounce)
      }
      // Cancelar todas as requisições pendentes na desmontagem
      cancelAllRequests()
    }
  }, [searchDebounce, cancelAllRequests])

  useEffect(() => {
    if (!eventId) {
      router.push('/')
      return
    }
  }, [
    eventId,
    participantsError,
    participantsErrorObj,
    participantsData,
    router,
  ])




  // useEffect para definir o primeiro dia disponível como selecionado
  useEffect(() => {
    if (!selectedDay && getDiasDisponiveisParaOperador().length > 0) {
      const primeiroDia = getDiasDisponiveisParaOperador()[0]
      setSelectedDay(primeiroDia.id)
    }
  }, [selectedDay, getDiasDisponiveisParaOperador])

  // Variáveis computadas
  const empresasUnicas = [
    ...new Set(participantsData.map((c: EventParticipant) => c.company)),
  ]
  const funcoesUnicas = [
    ...new Set(participantsData.map((c: EventParticipant) => c.role)),
  ]

  const empresasUnicasFiltradas = Array.from(new Set(empresasUnicas)).filter(
    (e): e is string => typeof e === 'string' && !!e && e.trim() !== '',
  )
  const funcoesUnicasFiltradas = Array.from(new Set(funcoesUnicas)).filter(
    (f): f is string => typeof f === 'string' && !!f && f.trim() !== '',
  )
  const tiposCredencialUnicosFiltrados = credential.map(c => c.nome)

  // Normalizar dias dos participantes após carregar os dados
  useEffect(() => {
    if (participantsData && participantsData.length > 0) {
      participantsData.forEach(p => {
        if (Array.isArray(p.daysWork)) {
          p.daysWork = p.daysWork.map(day => {
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(day)) return day
            const d = new Date(day)
            if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR')
            return day
          })
        }
      })
    }
  }, [participantsData])

  // Early returns APÓS todos os hooks serem chamados
  if (eventosLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-600 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando evento...</p>
        </div>
      </div>
    )
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-600 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Evento não encontrado</p>
        </div>
      </div>
    )
  }


  const handleBusca = (valor: string) => {
    setFiltro({ ...filtro, nome: valor })
  }

  // 🚀 BUSCA COM ZERO LAG - Debounce real otimizado
  const handleBuscaOtimizada = (valor: string) => {
    // 1. ATUALIZAÇÃO IMEDIATA DO VALOR VISUAL (zero lag)
    setFiltro(prev => ({ ...prev, nome: valor }))

    // 2. LIMPAR TIMEOUT ANTERIOR
    if (searchDebounce) {
      clearTimeout(searchDebounce)
    }

    // 3. BUSCA VAZIA - execução imediata
    if (!valor.trim()) {
      setSearchTerm('')
      setIsSearching(false)
      // Virtualização não precisa de reset de página
      setSearchDebounce(null)
      return
    }

    // 4. INDICAR QUE ESTÁ BUSCANDO
    setIsSearching(true)

    // 5. DEBOUNCE REAL - só executa filtro após parar de digitar
    const timeout = setTimeout(() => {
      setSearchTerm(valor)
      // Virtualização não precisa de reset de página
      setIsSearching(false)
    }, 300) // 300ms após parar de digitar

    setSearchDebounce(timeout)
  }

  // Funções de paginação removidas - usando virtualização completa

  const fecharPopup = () => {
    setSelectedParticipant(null)
    setSelectedParticipantWristband(null)
    setModalAberto(false)
  }

  // Função para salvar nova pulseira inline
  const salvarNovaPulseiraInline = async (participantId: string) => {
    if (!newWristbandCode.trim()) {
      toast.error('Digite o código da pulseira')
      return
    }

    setLoading(true)
    try {
      const participant = paginatedData.data.find(p => p.id === participantId)
      if (!participant) {
        toast.error('Participante não encontrado')
        return
      }

      const currentCredential = getCredencial(participant)
      const newCredential = newCredentialType ?
        credential.find(c => c.id === newCredentialType)?.nome || currentCredential :
        currentCredential

      // Verificar se houve mudança de tipo de credencial
      const changedCredentialType = newCredentialType && newCredentialType !== participant.credentialId

      // Salvar no sistema de movement_credentials
      await changeCredentialCode(
        eventId,
        participantId,
        newWristbandCode.trim(),
        newCredentialType || participant.credentialId
      )

      // Atualizar participante com nova credencial se necessário
      if (changedCredentialType) {
        await updateParticipantCredential(
          participantId,
          newCredentialType,
          operadorInfo?.nome || 'system'
        )
      }

      // Registrar ação do operador com informação detalhada
      const actionType = changedCredentialType ? 'change_credential_and_wristband' : 'update_wristband'

      await registerOperatorActionInColumn({
        type: actionType,
        staffId: participantId ? Number(participantId) : undefined,
        staffName: participant.name,
        staffCpf: participant.cpf,
        empresa: participant.company,
        funcao: participant.role,
        pulseira: newWristbandCode.trim() || undefined,
        pulseiraAnterior: participantWristbands.get(participantId) || undefined,
        credencial: newCredential,
        credencialAnterior: currentCredential,
        trocouTipoCredencial: changedCredentialType || false,
        observacoes: changedCredentialType ?
          `Troca de credencial: ${currentCredential} → ${newCredential} + Nova pulseira: ${newWristbandCode.trim()}` :
          `Atualização de pulseira: ${participantWristbands.get(participantId) || 'anterior'} → ${newWristbandCode.trim()}`
      })

      // Atualizar o estado local
      setParticipantWristbands(prev => {
        const newMap = new Map(prev)
        newMap.set(participantId, newWristbandCode.trim())
        return newMap
      })

      const message = changedCredentialType ?
        `Pulseira e credencial atualizadas! ${currentCredential} → ${newCredential}` :
        'Pulseira atualizada com sucesso!'

      toast.success(message)
      setEditingWristbandId(null)
      setNewWristbandCode('')
      setNewCredentialType('')

      // Atualizar dados automaticamente
      await refetchParticipants()
      await refetchAttendance()
    } catch (error) {
      toast.error('Erro ao atualizar pulseira')
    }
    setLoading(false)
  }

  // Função para cancelar edição
  const cancelarEdicaoPulseira = () => {
    setEditingWristbandId(null)
    setNewWristbandCode('')
    setNewCredentialType('')
  }

  // Função para verificar status de presença por data
  const verificarPresencaPorData = async (
    participantId: string,
    date: string,
  ) => {
    const [signal, request] = createCancellableRequest()

    try {
      const formattedDate = date.includes('/')
        ? date.split('/').join('-')
        : date
      const { data: attendanceData } = await apiClient.get(
        `/event-attendance?eventId=${params?.id}&participantId=${participantId}&date=${formattedDate}&limit=1`,
        {
          signal,
        },
      )

      if (request.isCancelled()) return null

      if (attendanceData.data && attendanceData.data.length > 0) {
        const check = attendanceData.data[0]
        let status = 'present'
        if (!check.checkIn) {
          status = 'absent'
        } else if (!check.checkOut) {
          status = 'present'
        } else {
          status = 'checked_out'
        }

        const attendanceStatus = {
          participantId: participantId,
          date: date,
          checkIn: check.checkIn as string | null,
          checkOut: check.checkOut as string | null,
          status: status,
        }

        setAttendanceStatus(attendanceStatus)
        return attendanceStatus
      }
      return null
    } catch (error) {
      return null
    }
  }

  // Função para carregar status de presença de todos os participantes
  const carregarStatusPresencaTodos = (
    participants: EventParticipant[],
    date: string,
  ) => {
    try {

      if (!attendanceData || !Array.isArray(attendanceData)) {
        return
      }


      const statusMap = new Map<
        string,
        {
          checkIn: string | null
          checkOut: string | null
          status: string
        }
      >()

      // Criar mapa dos checks por participantId
      const checksByParticipant = new Map()
      attendanceData.forEach((check: any) => {
        checksByParticipant.set(check.participantId, check)
      })

      // Para cada participante, verificar se tem check na data
      for (const participant of participants) {
        const check = checksByParticipant.get(participant.id)

        if (check) {
          let status = 'present'
          if (!check.checkIn) {
            status = 'absent'
          } else if (!check.checkOut) {
            status = 'present'
          } else {
            status = 'checked_out'
          }

          statusMap.set(participant.id, {
            checkIn: check.checkIn,
            checkOut: check.checkOut,
            status: status,
          })
        } else {
          // Participante não tem check na data
          statusMap.set(participant.id, {
            checkIn: null,
            checkOut: null,
            status: 'absent',
          })
        }
      }

      setParticipantsAttendanceStatus(statusMap)
      setAttendanceDataLoaded(true)
      setIsLoadingAttendance(false) // Parar loading

      // Notificar que o processamento foi concluído
    } catch (error) {
      setIsLoadingAttendance(false) // Parar loading mesmo em caso de erro
    }
  }

  // // Função para registrar ações do operador
  // const registerOperatorAction = async (acao: Record<string, unknown>) => {
  //     if (!operadorInfo) return;
  //     try {
  //         await apiClient.post("/event-histories", {
  //             eventId: params?.id as string,
  //             entityType: "participant",
  //             entityId: acao.entityId as string,
  //             action: acao.action,
  //             performedBy: operadorInfo.nome,
  //             performedByCpf: operadorInfo.cpf,
  //             details: acao.details,
  //             timestamp: new Date().toISOString(),
  //             description: acao.details,

  //         });
  //     } catch (error) {
  //     }
  // };

  // Função para registrar ações na coluna acao do operador
  const registerOperatorActionInColumn = async (actionData: {
    type: string
    staffId?: number
    staffName?: string
    staffCpf?: string
    pulseira?: string
    pulseiraAnterior?: string
    credencial?: string
    credencialAnterior?: string
    trocouTipoCredencial?: boolean
    workDate?: string
    workStage?: string
    workPeriod?: string
    checkInTime?: string
    checkOutTime?: string
    empresa?: string
    funcao?: string
    observacoes?: string
  }) => {

    if (!operadorInfo?.id) {

      // Tentar buscar o operador pelo CPF se não temos ID
      if (operadorInfo?.cpf) {
        try {
          const response = await apiClient.get(
            `/operadores?cpf=eq.${operadorInfo.cpf}`,
          )

          if (response.data && response.data.length > 0) {
            const operadorCompleto = response.data[0]

            // Atualizar operadorInfo com os dados completos
            setOperadorInfo({
              nome: operadorInfo.nome,
              cpf: operadorInfo.cpf,
              id: operadorCompleto.id,
              acoes: operadorCompleto.acoes,
              id_events: operadorCompleto.id_events,
            })

            // Continuar com o registro da ação
          } else {
            return
          }
        } catch (error) {
          return
        }
      } else {
        return
      }
    }

    // Verificar se agora temos o ID
    if (!operadorInfo?.id) {
      return
    }

    try {
      const currentActions = operadorInfo.acoes
        ? Array.isArray(operadorInfo.acoes)
          ? operadorInfo.acoes
          : []
        : []

      // Criar objeto base com campos obrigatórios
      const baseAction = {
        type: actionData.type,
        timestamp: new Date().toISOString(),
        tabela: 'operadores', // Propriedade obrigatória para o backend
      }

      // Função para adicionar campo apenas se não for vazio
      const addFieldIfNotEmpty = (obj: any, key: string, value: any) => {
        // Verificar se o valor é realmente válido
        if (value === undefined || value === null || value === '' || value === 'undefined' || value === 'null') {
          return // Não adicionar campos vazios/inválidos
        }

        // Para números (incluindo staffId)
        if (typeof value === 'number') {
          // Aceitar números válidos (incluindo 0, mas não NaN)
          if (!isNaN(value)) {
            obj[key] = value
          }
        }
        // Para strings que podem ser números
        else if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
          const numValue = parseInt(value.trim())
          if (!isNaN(numValue)) {
            obj[key] = numValue
          }
        }
        // Para booleans
        else if (typeof value === 'boolean') {
          obj[key] = value
        }
        // Para strings normais
        else if (typeof value === 'string') {
          const trimmed = value.trim()
          if (trimmed !== '' && trimmed !== 'undefined' && trimmed !== 'null') {
            obj[key] = trimmed
          }
        }
        // Para outros tipos válidos
        else {
          obj[key] = value
        }
      }

      // Adicionar campos do evento
      addFieldIfNotEmpty(baseAction, 'evento', Array.isArray(evento) ? 'Evento' : evento?.name || 'Evento')
      addFieldIfNotEmpty(baseAction, 'eventId', params?.id as string)
      addFieldIfNotEmpty(baseAction, 'workDate', actionData.workDate || selectedDay)
      addFieldIfNotEmpty(baseAction, 'workStage', actionData.workStage)
      addFieldIfNotEmpty(baseAction, 'workPeriod', actionData.workPeriod)

      // Adicionar campos do staff
      addFieldIfNotEmpty(baseAction, 'staffId', actionData.staffId)
      addFieldIfNotEmpty(baseAction, 'staffName', actionData.staffName)
      addFieldIfNotEmpty(baseAction, 'staffCpf', actionData.staffCpf)
      addFieldIfNotEmpty(baseAction, 'empresa', actionData.empresa)
      addFieldIfNotEmpty(baseAction, 'funcao', actionData.funcao)

      // Adicionar campos das pulseiras/credenciais
      addFieldIfNotEmpty(baseAction, 'pulseira', actionData.pulseira)
      addFieldIfNotEmpty(baseAction, 'pulseiraAnterior', actionData.pulseiraAnterior)
      addFieldIfNotEmpty(baseAction, 'credencial', actionData.credencial)
      addFieldIfNotEmpty(baseAction, 'credencialAnterior', actionData.credencialAnterior)
      addFieldIfNotEmpty(baseAction, 'trocouTipoCredencial', actionData.trocouTipoCredencial)

      // Adicionar campos de check-in/check-out
      addFieldIfNotEmpty(baseAction, 'checkInTime', actionData.checkInTime)
      addFieldIfNotEmpty(baseAction, 'checkOutTime', actionData.checkOutTime)

      // Adicionar campos do operador
      addFieldIfNotEmpty(baseAction, 'operatorId', operadorInfo.id)
      addFieldIfNotEmpty(baseAction, 'operatorName', operadorInfo.nome)
      addFieldIfNotEmpty(baseAction, 'operatorCpf', operadorInfo.cpf)

      // Adicionar observações
      addFieldIfNotEmpty(baseAction, 'observacoes', actionData.observacoes)

      const newAction = baseAction

      const updatedActions = [...currentActions, newAction]


      const response = await apiClient.put(`/operadores/${operadorInfo.id}`, {
        acoes: updatedActions,
      })

      // Atualizar o operadorInfo local com as novas ações
      setOperadorInfo(prev =>
        prev
          ? {
            ...prev,
            acoes: updatedActions,
          }
          : null,
      )
    } catch (error) {
    }
  }

  // Função para salvar nova pulseira
  const salvarNovaPulseira = async (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== 'Enter' || !participantAction || !novaPulseira.trim())
      return
    setLoading(true)
    try {
      await updateEventParticipant(participantAction.id, {
        wristbandId: novaPulseira.trim(),
      })
      toast.success('Pulseira atualizada com sucesso!')
      setNovaPulseira('')
      setParticipantAction(null)
      setModalAberto(false)
      // await registerOperatorAction({
      //     action: "updated",
      //     entityId: participantAction.id,
      //     details: `Pulseira alterada para: ${novaPulseira.trim()}`,
      // });
      await registerOperatorActionInColumn({
        type: 'update_wristband',
        staffId: participantAction.id ? Number(participantAction.id) : undefined,
        staffName: participantAction.name,
        staffCpf: participantAction.cpf,
        empresa: participantAction.company,
        funcao: participantAction.role,
        pulseira: novaPulseira.trim() || undefined,
        pulseiraAnterior: undefined, // Removido "Não informada"
        credencial: (() => {
          const credentialSelected = credential.find(
            w => w.id === participantAction.credentialId,
          )
          return credentialSelected?.nome || undefined
        })(),
        observacoes: `Pulseira atualizada para: ${novaPulseira.trim()}`
      })

      // Atualizar dados automaticamente
      await refetchParticipants()
      await refetchAttendance()
    } catch (error) {
      toast.error('Erro ao atualizar pulseira.')
    }
    setLoading(false)
  }

  // Função utilitária para capitalizar cada palavra
  const capitalizeWords = (str: string): string =>
    str.replace(/(\b\w)/g, char => char)

  // Função para adicionar novo staff
  const adicionarNovoStaff = async () => {
    if (
      !novoStaff.name.trim() ||
      !novoStaff.cpf.trim() ||
      !novoStaff.funcao.trim() ||
      !novoStaff.empresa.trim() ||
      !novoStaff.tipo_credencial?.trim() ||
      !novoStaff.cadastrado_por?.trim()
    ) {
      toast.error('Todos os campos são obrigatórios!')
      return
    }

    const cpfNovo = novoStaff.cpf.trim().replace(/\D/g, '')
    const cpfExistente = participantsData.some(
      c => c.cpf && c.cpf.trim().replace(/\D/g, '') === cpfNovo,
    )
    if (cpfExistente) {
      toast.error('Já existe um staff cadastrado com este CPF.')
      return
    }
    const credentialSelected = credential.find(
      w => w.nome === novoStaff.tipo_credencial,
    )
    setLoading(true)
    try {
      await createEventParticipant({
        eventId: params?.id as string,
        credentialId: credentialSelected?.id || '',
        name: novoStaff.name,
        cpf: novoStaff.cpf,
        role: novoStaff.funcao,
        company: novoStaff.empresa,
        validatedBy: operadorInfo?.nome || undefined,
        daysWork: novoStaff.daysWork,
      })
      // await registerOperatorAction({
      //     action: "created",
      //     entityId: "new",
      //     details: `Novo staff adicionado: ${novoStaff.name} (${formatCPF(novoStaff.cpf?.trim() || '')}) - Função: ${novoStaff.funcao} - Empresa: ${novoStaff.empresa}`,
      // });
      await registerOperatorActionInColumn({
        type: 'add_staff',
        staffName: novoStaff.name,
        staffCpf: novoStaff.cpf,
        empresa: novoStaff.empresa,
        funcao: novoStaff.funcao,
        credencial: (() => {
          const credentialSelected = credential.find(
            w => w.nome === novoStaff.tipo_credencial,
          )
          return credentialSelected?.nome || ''
        })(),
        observacoes: `Novo staff adicionado: ${novoStaff.name} (${formatCPF(novoStaff.cpf)}) - ${novoStaff.empresa} - ${novoStaff.funcao}`
      })
      toast.success('Novo staff adicionado com sucesso!')
      setNovoStaff({
        name: '',
        cpf: '',
        funcao: '',
        empresa: '',
        tipo_credencial: '',
        cadastrado_por: '',
        daysWork: [],
      })
      setPopupNovoStaff(false)
    } catch (error) {
      toast.error('Erro ao adicionar staff.')
    }
    setLoading(false)
  }

  const sair = () => {
    setPreLoading(true)
    localStorage.removeItem('staff_tabela')
    localStorage.removeItem('nome_evento')
    setTimeout(() => {
      window.location.href = '/operador/eventos'
    }, 500)
  }






  const handleOpenImportDialog = () => setImportDialogOpen(true)
  const handleProceedImport = () => {
    setImportDialogOpen(false)
    fileInputRef.current?.click()
  }

  const countFiltrosAtivos = () => {
    let count = 0
    if (filtro.nome) count++
    if (filtro.empresa) count++
    if (filtro.funcao) count++
    if (filtro.credencial) count++
    if (ordenacao.campo && ordenacao.campo !== '') count++
    // Contar filtros das colunas
    Object.values(columnFilters).forEach(filters => {
      if (filters.length > 0) count++
    })
    return count
  }

  // Função para confirmar check-in
  const confirmarCheckin = async () => {

    if (!participantAction) {
      toast.error('Dados insuficientes para realizar check-in')
      return
    }
    if (!operadorInfo?.nome) {
      toast.error('Informações do operador não encontradas')
      return
    }
    setLoading(true)
    try {
      const today = new Date()
      const day = String(today.getDate()).padStart(2, '0')
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const year = today.getFullYear()
      const todayFormatted = `${day}-${month}-${year}`

      const dateToUse = selectedDateForAction
        ? formatDateForAPI(selectedDateForAction)
        : todayFormatted


      // Extrair informações do shift selecionado
      const { stage, period } = parseShiftId(selectedDateForAction || selectedDay)

      await checkInMutation.mutateAsync({
        participantId: participantAction.id,
        date: dateToUse,
        validatedBy: operadorInfo.nome,
        performedBy: operadorInfo.nome,
        notes: `Check-in realizado via painel do operador - Pulseira: ${codigoPulseira.trim()}`,
        workPeriod: period,
        workStage: stage,
      })

      // Salvar pulseira no sistema de movement_credentials
      try {
        await changeCredentialCode(
          eventId,
          participantAction.id,
          codigoPulseira.trim(),
        )
      } catch (error) {
        // Não falha o check-in se der erro ao salvar a pulseira
      }

      // Atualizar estado local imediatamente
      const currentTime = new Date().toISOString()
      const newStatus = {
        checkIn: currentTime,
        checkOut: null,
        status: 'present',
      }

      setParticipantsAttendanceStatus(prev => {
        const newMap = new Map(prev)
        newMap.set(participantAction.id, newStatus)
        return newMap
      })

      // await registerOperatorAction({
      //     action: "check_in",
      //     entityId: participantAction.id,
      //     details: `Check-in realizado para: ${participantAction.name} (${formatCPF(participantAction.cpf?.trim() || '')}) - Pulseira: ${codigoPulseira.trim()}${selectedDateForAction ? ` - Data: ${selectedDateForAction}` : ''}`,
      // });
      await registerOperatorActionInColumn({
        type: 'checkin',
        staffId: participantAction.id ? Number(participantAction.id) : undefined,
        staffName: participantAction.name,
        staffCpf: participantAction.cpf,
        empresa: participantAction.company,
        funcao: participantAction.role,
        pulseira: codigoPulseira.trim() || undefined,
        credencial: getCredencial(participantAction),
        workDate: dateToUse,
        workStage: stage,
        workPeriod: period,
        checkInTime: currentTime,
        observacoes: `Check-in realizado - Pulseira: ${codigoPulseira.trim()} - Data: ${dateToUse} - Turno: ${stage.toUpperCase()} ${period.toUpperCase()}`
      })

      // Atualizar dados de presença automaticamente
      await refetchAttendance()

      toast.success('Check-in realizado com sucesso!')
      setPopupCheckin(false)
      setParticipantAction(null)
      setCodigoPulseira('')
      setSelectedDateForAction('')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro ao realizar check-in: ${errorMessage}`)
    }
    setLoading(false)
  }

  // Função para confirmar check-out
  const confirmarCheckout = async () => {
    if (!participantAction) {
      toast.error('Participante não selecionado')
      return
    }
    if (!operadorInfo?.nome) {
      toast.error('Informações do operador não encontradas')
      return
    }
    setLoading(true)
    try {
      const today = new Date()
      const day = String(today.getDate()).padStart(2, '0')
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const year = today.getFullYear()
      const todayFormatted = `${day}-${month}-${year}`

      const dateToUse = selectedDateForAction
        ? formatDateForAPI(selectedDateForAction)
        : todayFormatted

      // Extrair informações do shift selecionado
      const { stage, period } = parseShiftId(selectedDateForAction || selectedDay)

      await checkOutMutation.mutateAsync({
        participantId: participantAction.id,
        date: dateToUse,
        validatedBy: operadorInfo.nome,
        performedBy: operadorInfo.nome,
        notes: 'Check-out realizado via painel do operador',
        workPeriod: period,
        workStage: stage,
      })

      // Atualizar estado local imediatamente
      const currentTime = new Date().toISOString()
      const currentStatus = participantsAttendanceStatus.get(
        participantAction.id,
      )
      const newStatus = {
        checkIn: currentStatus?.checkIn || currentTime, // Mantém o checkin existente ou usa o tempo atual
        checkOut: currentTime,
        status: 'checked_out',
      }

      setParticipantsAttendanceStatus(prev => {
        const newMap = new Map(prev)
        newMap.set(participantAction.id, newStatus)
        return newMap
      })

      // await registerOperatorAction({
      //     action: "check_out",
      //     entityId: participantAction.id,
      //     details: `Check-out realizado para: ${participantAction.name} (${formatCPF(participantAction.cpf?.trim() || '')})${selectedDateForAction ? ` - Data: ${selectedDateForAction}` : ''}`,
      // });
      await registerOperatorActionInColumn({
        type: 'checkout',
        staffId: participantAction.id ? Number(participantAction.id) : undefined,
        staffName: participantAction.name,
        staffCpf: participantAction.cpf,
        empresa: participantAction.company,
        funcao: participantAction.role,
        credencial: getCredencial(participantAction),
        workDate: dateToUse,
        workStage: stage,
        workPeriod: period,
        checkOutTime: currentTime,
        checkInTime: currentStatus?.checkIn || undefined,
        observacoes: `Check-out realizado - Data: ${dateToUse} - Turno: ${stage.toUpperCase()} ${period.toUpperCase()}`
      })

      // Atualizar dados de presença automaticamente
      await refetchAttendance()

      toast.success('Check-out realizado com sucesso!')
      setPopupCheckout(false)
      setParticipantAction(null)
      setSelectedDateForAction('')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro ao realizar check-out: ${errorMessage}`)
    }
    setLoading(false)
  }

  // Função para gerar iniciais do nome
  const getInitials = (nome: string) =>
    nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  // Função para formatar o dia selecionado
  const formatSelectedDay = (selectedDay: string): string => {
    if (!selectedDay || selectedDay === 'all') {
      return ''
    }

    try {
      // Formato esperado: YYYY-MM-DD-stage-period
      const parts = selectedDay.split('-')
      if (parts.length >= 5) {
        const year = parts[0]
        const month = parts[1]
        const day = parts[2]
        const stage = parts[3]
        const period = parts[4]

        // Formatar data
        const date = new Date(`${year}-${month}-${day}`)
        const dateStr = date.toLocaleDateString('pt-BR')

        // Mapear estágios
        const stageMap: { [key: string]: string } = {
          'montagem': 'Montagem',
          'evento': 'Evento',
          'desmontagem': 'Desmontagem'
        }

        // Mapear períodos
        const periodMap: { [key: string]: string } = {
          'diurno': 'Diurno',
          'noturno': 'Noturno'
        }

        const stageName = stageMap[stage] || stage
        const periodName = periodMap[period] || period

        // Calcular qual dia é sequencialmente através de todos os dias disponíveis
        let dayNumber = 1
        const availableDays = getDiasDisponiveisParaOperador()

        // Ordenar todos os dias disponíveis por data (ordem cronológica)
        const sortedDays = availableDays.sort((a, b) => a.id.localeCompare(b.id))

        // Encontrar a posição do dia atual na sequência completa
        const currentIndex = sortedDays.findIndex(day => day.id === selectedDay)
        if (currentIndex !== -1) {
          dayNumber = currentIndex + 1
        }

        return `(${dateStr} - ${stageName} ${dayNumber}º Dia - ${periodName})`
      }
    } catch (error) {
      console.warn('Erro ao formatar dia selecionado:', error)
    }

    return selectedDay
  }

  return (
    <div className="min-h-screen bg-fuchsia-100">
      {preLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <Loader2 className="animate-spin w-16 h-16 text-purple-600" />
        </div>
      )}

      {!authChecked ? (
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="animate-spin w-16 h-16 text-purple-600" />
        </div>
      ) : !operadorLogado ? (
        <div className="bg-red-50 text-red-700 p-4 text-center font-medium border-b border-red-200">
          Você precisa estar logado como operador para adicionar ou editar
          staff.
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <Image
                    src="/images/logo-rg-fone.png"
                    width={120}
                    height={40}
                    className="h-8 w-auto"
                    alt="Logo"
                  />
                </div>

                <div className="flex-1 max-w-lg mx-8">
                  <h1 className="text-xl font-semibold text-gray-900 text-center">
                    {Array.isArray(evento)
                      ? 'Evento'
                      : evento?.name || 'Evento'}
                  </h1>
                </div>

                <div className="flex items-center space-x-4">
                  {operadorInfo && (
                    <div className="text-sm text-gray-600 text-right">
                      <div className="font-medium">{operadorInfo.nome}</div>
                      <div className="text-xs">{operadorInfo.cpf}</div>
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{unifiedData.total}</span>{' '}
                    colaboradores
                    {(searchTerm.trim() || filtro.nome.trim()) && (
                      <span className="text-xs text-blue-600 ml-2">
                        🔍 Filtrado
                      </span>
                    )}
                    {isSearching && (
                      <span className="text-xs text-orange-600 ml-2 animate-pulse">
                        ⏳ Processando busca inteligente...
                      </span>
                    )}
                    {unifiedData.total > 1000 && (
                      <span className="text-xs text-green-600 ml-2">
                        ⚡ Otimizado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isRealtimeSyncing && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sincronizando...</span>
                      </div>
                    )}

                    {showPerformanceIndicator && (
                      <Button
                        onClick={clearCache}
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 border-green-200"
                        title="Limpar cache para melhorar performance"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Otimizar
                      </Button>
                    )}

                    {/* Exibir dia selecionado formatado com navegação */}
                    {selectedDay && selectedDay !== 'all' && (
                      <div className="flex items-center gap-2">
                        {/* Botão dia anterior */}
                        <button
                          onClick={goToPreviousDay}
                          disabled={!canNavigateToPrevious}
                          className={`p-1 rounded-full transition-colors ${canNavigateToPrevious
                            ? 'text-purple-600 hover:text-purple-800 hover:bg-purple-100'
                            : 'text-gray-300 cursor-not-allowed'
                            }`}
                          title="Dia anterior do mesmo estágio"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Badge do dia atual */}
                        <div className="text-xs text-purple-600 font-medium bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                          {formatSelectedDay(selectedDay)}
                        </div>

                        {/* Botão próximo dia */}
                        <button
                          onClick={goToNextDay}
                          disabled={!canNavigateToNext}
                          className={`p-1 rounded-full transition-colors ${canNavigateToNext
                            ? 'text-purple-600 hover:text-purple-800 hover:bg-purple-100'
                            : 'text-gray-300 cursor-not-allowed'
                            }`}
                          title="Próximo dia do mesmo estágio"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <Button
                      onClick={sair}
                      variant="outline"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900 bg-transparent"
                    >
                      Trocar evento
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Action Bar */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-3">

                  <Button
                    onClick={() => {
                      if (operadorLogado) {
                        setPopupNovoStaff(true)
                        atualizarCadastradoPor()
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    disabled={loading || !operadorLogado}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Staff
                  </Button>


                </div>



                <Button
                  onClick={() => {
                    if (operadorLogado) {
                      setPopupTrocaPulseira(true)
                    }
                  }}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  disabled={loading || !operadorLogado}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Trocar Pulseira
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md bg-white">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${isSearching ? 'text-orange-500 animate-pulse' :
                    (searchTerm.trim() || filtro.nome.trim()) ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  <Input
                    type="text"
                    placeholder="🔍 Busca inteligente: nome, iniciais, CPF, empresa, pulseira..."
                    value={filtro.nome}
                    onChange={e => handleBuscaOtimizada(e.target.value)}
                    className={`pl-10 pr-10 text-gray-600 bg-white shadow-sm transition-all duration-200 ${isSearching ? 'border-orange-300 ring-2 ring-orange-100' :
                      (searchTerm.trim() || filtro.nome.trim()) ? 'border-blue-300 ring-2 ring-blue-100' :
                        'border-gray-200 focus:border-purple-500 focus:ring-purple-500'
                      }`}
                  />
                  {(searchTerm.trim() || filtro.nome.trim()) && (
                    <button
                      onClick={() => {
                        // Limpar todos os estados de busca
                        setFiltro(prev => ({ ...prev, nome: '' }))
                        setSearchTerm('')
                        setIsSearching(false)

                        // Limpar debounce pendente
                        if (searchDebounce) {
                          clearTimeout(searchDebounce)
                          setSearchDebounce(null)
                        }

                        // Limpar busca indexada se ativa
                        clearSearch()
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Limpar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Selects */}
                <div className="flex flex-wrap gap-3">
                  {/* Empresa Filter */}
                  <Popover open={empresaSelectOpen} onOpenChange={setEmpresaSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={empresaSelectOpen}
                        className="w-[180px] justify-between bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 shadow-sm hover:bg-gray-50"
                      >
                        {filtro.empresa ? filtro.empresa : "Empresa"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[180px] p-0  bg-white border-gray-200">
                      <Command>
                        <CommandInput className='bg-white' placeholder="Buscar empresa..." />
                        <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-y-auto bg-white">
                          <CommandItem
                            value="__all__"
                            onSelect={() => {
                              setFiltro({ ...filtro, empresa: '' })
                              setEmpresaSelectOpen(false)
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${!filtro.empresa ? "opacity-100" : "opacity-0"
                                }`}
                            />
                            Todas as empresas
                          </CommandItem>
                          {empresasUnicasFiltradas.map((empresa) => (
                            <CommandItem
                              key={empresa}
                              value={empresa}
                              onSelect={(value) => {
                                setFiltro({ ...filtro, empresa: value === filtro.empresa ? '' : value })
                                setEmpresaSelectOpen(false)
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${empresa === filtro.empresa ? "opacity-100" : "opacity-0"
                                  }`}
                              />
                              {empresa}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Função Filter */}
                  <Popover open={funcaoSelectOpen} onOpenChange={setFuncaoSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={funcaoSelectOpen}
                        className="w-[160px] justify-between bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 shadow-sm hover:bg-gray-50"
                      >
                        {filtro.funcao ? filtro.funcao : "Função"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[160px] p-0 bg-white border-gray-200">
                      <Command>
                        <CommandInput className='bg-white' placeholder="Buscar função..." />
                        <CommandEmpty>Nenhuma função encontrada.</CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-y-auto bg-white">
                          <CommandItem
                            value="__all__"
                            onSelect={() => {
                              setFiltro({ ...filtro, funcao: '' })
                              setFuncaoSelectOpen(false)
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${!filtro.funcao ? "opacity-100" : "opacity-0"
                                }`}
                            />
                            Todas as funções
                          </CommandItem>
                          {funcoesUnicasFiltradas.map((funcao) => (
                            <CommandItem
                              key={funcao}
                              value={funcao}
                              onSelect={(value) => {
                                setFiltro({ ...filtro, funcao: value === filtro.funcao ? '' : value })
                                setFuncaoSelectOpen(false)
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${funcao === filtro.funcao ? "opacity-100" : "opacity-0"
                                  }`}
                              />
                              {funcao}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Credencial Filter */}
                  <Popover open={credencialSelectOpen} onOpenChange={setCredencialSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={credencialSelectOpen}
                        className="w-[170px] justify-between bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 shadow-sm hover:bg-gray-50"
                      >
                        {filtro.credencial ? filtro.credencial : "Credencial"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[170px] p-0 bg-white border-gray-200">
                      <Command>
                        <CommandInput className='bg-white' placeholder="Buscar credencial..." />
                        <CommandEmpty>Nenhuma credencial encontrada.</CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-y-auto bg-white">
                          <CommandItem
                            value="__all__"
                            onSelect={() => {
                              setFiltro({ ...filtro, credencial: '' })
                              setCredencialSelectOpen(false)
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${!filtro.credencial ? "opacity-100" : "opacity-0"
                                }`}
                            />
                            Todas as credenciais
                          </CommandItem>
                          {tiposCredencialUnicosFiltrados.map((credencial) => (
                            <CommandItem
                              key={credencial}
                              value={credencial}
                              onSelect={(value) => {
                                setFiltro({ ...filtro, credencial: value === filtro.credencial ? '' : value })
                                setCredencialSelectOpen(false)
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${credencial === filtro.credencial ? "opacity-100" : "opacity-0"
                                  }`}
                              />
                              {credencial}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Clear Filters Button */}
                  {(filtro.empresa || filtro.funcao || filtro.credencial) && (
                    <Button
                      onClick={() => setFiltro({ ...filtro, empresa: '', funcao: '', credencial: '' })}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-white shadow-sm transition-all duration-200"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs dos dias do evento */}
            {(() => {
              const diasDisponiveis = getDiasDisponiveisParaOperador()
              console.log('🎯 Renderização das tabs - Dias disponíveis:', diasDisponiveis.length, diasDisponiveis.map(d => ({ id: d.id, label: d.label })))
              return diasDisponiveis.length > 0
            })() && (
                <div className="mb-8">
                  <div className="border-b border-gray-200 bg-white rounded-t-lg relative">
                    {/* Container dos tabs sem scroll horizontal */}
                    <nav className="-mb-px flex flex-wrap gap-1 px-4 py-2">
                      {getDiasDisponiveisParaOperador().map(day => {
                        const participantesNoDia = getParticipantsCountByShift(day.id)
                        const isActive = selectedDay === day.id

                        return (
                          <div key={day.id} className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedDay(day.id)}
                              className={`border-b-2 py-2 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                                ? getTabColor(day.type, true)
                                : `border-transparent text-gray-500 ${getTabColor(
                                  day.type,
                                  false,
                                )}`
                                }`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium">
                                    {day.label.split(' ')[0]}
                                  </span>
                                  {getPeriodIcon(day.period)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs opacity-75">
                                    {day.type === 'setup' ? 'MONTAGEM' :
                                      day.type === 'preparation' ? 'EVENTO' :
                                        day.type === 'finalization' ? 'DESMONTAGEM' :
                                          'EVENTO'}
                                  </span>
                                  {day.period && (
                                    <span className="text-xs opacity-60">
                                      ({day.period === 'diurno' ? 'D' : day.period === 'noturno' ? 'N' : 'DI'})
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs opacity-75">
                                  ({participantesNoDia})
                                </span>
                              </div>
                            </button>
                          </div>
                        )
                      })}
                    </nav>
                  </div>
                </div>
              )}

            {/* Table */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              {participantsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin w-6 h-6 text-purple-600" />
                    <span className="text-gray-600">
                      Carregando colaboradores...
                    </span>
                  </div>
                </div>
              )}

              {/* 🚀 VIRTUALIZED TABLE CONTAINER */}
              <div className="overflow-x-auto">
                <div className="min-w-full" style={{ minWidth: isMobileTable ? '100%' : '1000px' }}>
                  <Table className="table-fixed" style={{ width: '100%' }}>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                        {/* Nome - sempre visível */}
                        <TableHead className={`text-left text-xs font-semibold uppercase tracking-wider ${isMobileTable ? 'px-2 py-2' : 'px-6 py-4'}`} style={{ width: isMobileTable ? '40%' : '25%' }}>
                          <div className="flex items-center justify-between">
                            <span>{isMobileTable ? 'Nome / CPF / Função' : 'Nome'}</span>
                          </div>
                        </TableHead>

                        {/* CPF - esconder em mobile */}
                        {!isMobileTable && (
                          <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ width: '15%' }}>
                            <div className="flex items-center justify-between">
                              <span>CPF</span>
                            </div>
                          </TableHead>
                        )}

                        {/* Função - esconder em mobile */}
                        {!isMobileTable && (
                          <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ width: '18%' }}>
                            <div className="flex items-center justify-between">
                              <span>Função</span>
                              <ExcelColumnFilter
                                values={columnUniqueValues.funcao.filter(
                                  (v): v is string => typeof v === 'string',
                                )}
                                selectedValues={columnFilters.funcao}
                                onSelectionChange={values =>
                                  handleColumnFilterChange('funcao', values)
                                }
                                onSortTable={direction =>
                                  handleColumnSort('role', direction)
                                }
                                columnTitle="Função"
                                isActive={columnFilters.funcao.length > 0}
                              />
                            </div>
                          </TableHead>
                        )}

                        {/* Empresa - esconder em mobile */}
                        {!isMobileTable && (
                          <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ width: '18%' }}>
                            <div className="flex items-center justify-between">
                              <span>Empresa</span>
                              <ExcelColumnFilter
                                values={columnUniqueValues.empresa}
                                selectedValues={columnFilters.empresa}
                                onSelectionChange={values =>
                                  handleColumnFilterChange('empresa', values)
                                }
                                onSortTable={direction =>
                                  handleColumnSort('company', direction)
                                }
                                columnTitle="Empresa"
                                isActive={columnFilters.empresa.length > 0}
                              />
                            </div>
                          </TableHead>
                        )}

                        {/* Credencial - esconder em mobile */}
                        {!isMobileTable && (
                          <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ width: '16%' }}>
                            <div className="flex items-center justify-between">
                              <span>Tipo de Credencial</span>
                              <ExcelColumnFilter
                                values={columnUniqueValues.credencial}
                                selectedValues={columnFilters.credencial}
                                onSelectionChange={values =>
                                  handleColumnFilterChange('credencial', values)
                                }
                                onSortTable={direction =>
                                  handleColumnSort('credentialId', direction)
                                }
                                columnTitle="Tipo de Credencial"
                                isActive={columnFilters.credencial.length > 0}
                              />
                            </div>
                          </TableHead>
                        )}

                        {/* Ação - sempre visível e sticky à direita */}
                        <TableHead className={`text-left text-xs font-semibold uppercase tracking-wider sticky right-0 bg-white border-l border-gray-200 ${isMobileTable ? 'px-2 py-2' : 'px-6 py-4'}`} style={{ width: isMobileTable ? '30%' : '8%', zIndex: 10 }}>
                          {isMobileTable ? 'Check-in/out' : 'Ação'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                </div>

                {/* 🚀 REACT-WINDOW VIRTUALIZED TABLE */}
                {finalData.data.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-semibold text-gray-700 mb-2">
                          {filtro.nome.trim() ? 'Nenhum resultado encontrado' : 'Nenhum colaborador encontrado'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {filtro.nome.trim() ? (
                            <>Tente termos diferentes ou <button
                              onClick={() => setFiltro(prev => ({ ...prev, nome: '' }))}
                              className="text-blue-600 hover:text-blue-800 underline"
                            >limpe a busca</button></>
                          ) : (
                            'Adicione colaboradores ou ajuste os filtros'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-b-lg border-t-0">
                    {/* Performance indicator */}
                    {finalData.data.length > 1000 && (
                      <div className="px-6 py-2 bg-blue-50 border-b border-blue-200">
                        <div className="flex items-center text-sm text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          Modo de alta performance ativo ({finalData.data.length.toLocaleString()} registros)
                        </div>
                      </div>
                    )}

                    {/* Lista virtualizada usando react-window */}
                    <div style={{ minWidth: isMobileTable ? '100%' : '1000px' }}>
                      <List
                        key={`${selectedDay}-${filtro.nome}-${finalData.data.length}`}
                        height={Math.min(finalData.data.length * itemHeight, isMobileTable ? 500 : 600)}
                        width="100%"
                        itemCount={finalData.data.length}
                        itemSize={itemHeight}
                        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                      >
                        {VirtualizedTableRow}
                      </List>
                    </div>
                  </div>
                )}

                {/* 📊 INFORMAÇÕES DA LISTA VIRTUALIZADA */}
                {finalData.data.length > 0 && (
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{finalData.data.length.toLocaleString()}</span> {finalData.data.length === 1 ? 'colaborador' : 'colaboradores'}
                      {filtro.nome.trim() && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          🔍 Filtrado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span>🚀 Virtualizado para máxima performance</span>
                      {finalData.data.length > 500 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          ⚡ Modo rápido
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MODAL DETALHES DO COLABORADOR */}
            <Dialog open={modalAberto} onOpenChange={setModalAberto}>
              <DialogContent className="max-w-md bg-white border-0 shadow-xl max-h-[80vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                  <DialogTitle className="flex items-center gap-3 text-lg font-bold text-gray-900">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    Detalhes do Participante
                  </DialogTitle>
                </DialogHeader>

                {selectedParticipant && (
                  <div className="space-y-4">
                    {/* Informações principais - Layout compacto */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {getInitials(selectedParticipant.name)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {selectedParticipant.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedParticipant.role}
                          </p>
                        </div>
                      </div>

                      {/* Informações essenciais */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            CPF
                          </p>
                          <p className="font-mono text-gray-900">
                            {formatCPF(selectedParticipant.cpf?.trim() || '')}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Empresa
                          </p>
                          <p className="text-gray-900">
                            {selectedParticipant.company}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Credencial
                          </p>
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: getCredencialCor(selectedParticipant),
                              color: getContrastingTextColor(getCredencialCor(selectedParticipant)),
                              border: needsBorder(getCredencialCor(selectedParticipant)) ? '1px solid #d1d5db' : 'none'
                            }}
                          >
                            {getCredencial(selectedParticipant)}
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Código Pulseira
                          </p>
                          <p className="font-mono text-gray-900">
                            {selectedParticipantWristband || 'Não informado'}
                          </p>
                        </div>
                      </div>

                      {/* Detalhes de Check-in/Check-out */}
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 uppercase mb-3">
                          Detalhes de Presença - {selectedDay ? (selectedDay.includes('_') ? selectedDay.split('_')[1] : selectedDay) : 'Hoje'}
                        </p>
                        {(() => {
                          const status = participantsAttendanceStatus.get(
                            selectedParticipant.id,
                          )
                          if (!status) {
                            return (
                              <div className="text-center py-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Não verificado
                                </span>
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span className="text-sm font-medium text-gray-700">Check-in:</span>
                                </div>
                                <div className="text-right">
                                  {status.checkIn ? (
                                    <>
                                      <div className="text-sm text-gray-900">
                                        {new Date(status.checkIn).toLocaleDateString('pt-BR')}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {new Date(status.checkIn).toLocaleTimeString('pt-BR', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-500">Não realizado</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${status.checkOut ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                                  <span className="text-sm font-medium text-red-700">Check-out:</span>
                                </div>
                                <div className="text-right">
                                  {status.checkOut ? (
                                    <>
                                      <div className="text-sm text-gray-900">
                                        {new Date(status.checkOut).toLocaleDateString('pt-BR')}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {new Date(status.checkOut).toLocaleTimeString('pt-BR', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-500">Não realizado</span>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">Status:</span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.checkIn && status.checkOut
                                    ? 'bg-gray-100 text-gray-800'
                                    : status.checkIn
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-orange-100 text-orange-800'
                                    }`}>
                                    {status.checkIn && status.checkOut
                                      ? '✓ Finalizado'
                                      : status.checkIn
                                        ? '✓ Presente'
                                        : 'Pendente'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                          if (selectedParticipant) {
                            const botaoAcao = getBotaoAcao(selectedParticipant)
                            if (botaoAcao === 'checkin') {
                              abrirCheckin(selectedParticipant)
                            } else if (botaoAcao === 'checkout') {
                              abrirCheckout(selectedParticipant)
                            }
                            setModalAberto(false)
                          }
                        }}
                        className={`flex-1 text-white ${getBotaoAcao(selectedParticipant) === 'checkout'
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                          }`}
                        disabled={!getBotaoAcao(selectedParticipant)}
                      >
                        {getBotaoAcao(selectedParticipant) === 'checkin'
                          ? 'Check-in'
                          : getBotaoAcao(selectedParticipant) === 'checkout'
                            ? 'Check-out'
                            : 'Sem ação'}
                      </Button>
                      <Button
                        onClick={() => setModalAberto(false)}
                        variant="outline"
                        className="px-4"
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* MODAL CHECK-IN */}
            <Dialog open={popupCheckin} onOpenChange={setPopupCheckin}>
              <DialogContent className="max-w-md bg-gradient-to-br from-white to-green-50 border-0 shadow-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader className="pb-6">
                  <DialogTitle className="text-center text-xl font-bold text-gray-900 flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    Check-in
                  </DialogTitle>
                  <DialogDescription className="text-center text-gray-600">
                    Digite o código da pulseira para confirmar o check-in
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 text-gray-600">
                  {participantAction && (
                    <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <p className="font-bold text-gray-900 text-lg">
                        {participantAction.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCPF(participantAction.cpf?.trim() || '')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {participantAction.role}
                      </p>
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="flex items-center justify-center gap-2">
                          <span>Tipo de Credencial:</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border-2 border-black"
                              style={{ backgroundColor: getCredencialCor(participantAction) }}
                            />
                            <span className="text-gray-900 font-medium">
                              {getCredencial(participantAction)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedDateForAction &&
                        selectedDateForAction !== 'all' && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-semibold text-blue-800">
                              Data selecionada:
                            </p>
                            <p className="text-lg font-bold text-blue-900">
                              {selectedDateForAction}
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  <Input
                    type="text"
                    value={codigoPulseira}
                    onChange={e => setCodigoPulseira(e.target.value)}
                    placeholder="Código da pulseira (opcional)"
                    className="text-center text-lg bg-white border-green-300 focus:border-green-500 focus:ring-green-500 shadow-sm text-gray-600"
                    autoFocus
                    disabled={loading}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        confirmarCheckin()
                      }
                    }}
                  />

                  <div className="flex gap-4">
                    <Button
                      onClick={() => {
                        setPopupCheckin(false)
                        setParticipantAction(null)
                        setCodigoPulseira('')
                      }}
                      variant="outline"
                      className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={confirmarCheckin}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Confirmar Check-in
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* MODAL CHECK-OUT */}
            <Dialog open={popupCheckout} onOpenChange={setPopupCheckout}>
              <DialogContent className="max-w-md bg-gradient-to-br from-white to-red-50 border-0 shadow-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader className="pb-6">
                  <DialogTitle className="text-center text-xl font-bold text-gray-900 flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    Check-out
                  </DialogTitle>
                  <DialogDescription className="text-center text-gray-600">
                    Confirme o check-out do colaborador
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {participantAction && (
                    <div className="text-center p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg">
                      <p className="font-bold text-gray-900 text-lg">
                        {participantAction.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCPF(participantAction.cpf?.trim() || '')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {participantAction.role}
                      </p>
                      <div className="text-sm text-gray-600 mt-1">
                        Tipo de Credencial:
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2"
                          style={{
                            backgroundColor: getCredencialCor(participantAction),
                            color: getContrastingTextColor(getCredencialCor(participantAction)),
                            border: needsBorder(getCredencialCor(participantAction)) ? '1px solid #d1d5db' : 'none'
                          }}
                        >
                          {getCredencial(participantAction)}
                        </span>
                      </div>
                      {selectedDateForAction &&
                        selectedDateForAction !== 'all' && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-semibold text-blue-800">
                              Data selecionada:
                            </p>
                            <p className="text-lg font-bold text-blue-900">
                              {selectedDateForAction}
                            </p>
                          </div>
                        )}
                      <p className="text-xs text-red-600 mt-3 font-medium">
                        Deseja realmente fazer o check-out?
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      onClick={() => {
                        setPopupCheckout(false)
                        setParticipantAction(null)
                      }}
                      variant="outline"
                      className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={confirmarCheckout}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Confirmar Check-out
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>



            {/* Modal de Troca de Pulseira */}
            <Dialog
              open={popupTrocaPulseira}
              onOpenChange={setPopupTrocaPulseira}
            >
              <DialogContent className="sm:max-w-md bg-white text-gray-900 max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    {editingWristbandId ? 'Alterar Credencial e Pulseira' : 'Trocar Pulseira'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingWristbandId ? 'Altere o tipo de credencial e/ou código da pulseira' : 'Busque e selecione um participante para trocar a credencial'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {!editingWristbandId ? (
                    <>
                      {/* Campo de busca */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          type="text"
                          placeholder="🔍 Busca inteligente: nome, iniciais, CPF..."
                          value={filtro.nome}
                          onChange={e => handleBuscaOtimizada(e.target.value)}
                          className="pl-10 text-gray-600 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm transition-all duration-200"
                        />
                      </div>

                      {/* Lista de participantes */}
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {paginatedData.data.map(participant => {
                          const attendanceStatus = participantsAttendanceStatus.get(
                            participant.id,
                          )
                          const hasCheckIn = attendanceStatus?.checkIn

                          return (
                            <div
                              key={participant.id}
                              onClick={async () => {
                                if (!hasCheckIn) {
                                  toast.error(
                                    'Participante precisa ter check-in para trocar pulseira',
                                  )
                                  return
                                }

                                // Buscar código atual da pulseira
                                try {
                                  const movementCredential = await getMovementCredentialByParticipant(eventId, participant.id)
                                  const currentCode = movementCredential?.data?.code || ''
                                  setNewWristbandCode(currentCode)

                                  // Atualizar o mapa de pulseiras
                                  setParticipantWristbands(prev => {
                                    const newMap = new Map(prev)
                                    newMap.set(participant.id, currentCode)
                                    return newMap
                                  })
                                } catch (error) {
                                  setNewWristbandCode('')
                                }

                                // Inicializar com a credencial atual
                                setNewCredentialType(participant.credentialId || "")
                                setEditingWristbandId(participant.id)
                              }}
                              className={`p-3 border rounded-lg transition-colors ${hasCheckIn
                                ? 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                                : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${hasCheckIn
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                    : 'bg-gray-300'
                                    }`}
                                >
                                  <span className="text-sm font-bold text-white">
                                    {getInitials(participant.name)}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {participant.name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {participant.role} • {participant.company}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatCPF(participant.cpf?.trim() || '')}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end">
                                  {hasCheckIn ? (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <Check className="w-3 h-3" />
                                      <span className="text-xs">Check-in</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-gray-400">
                                      <Clock className="w-3 h-3" />
                                      <span className="text-xs">Sem check-in</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {paginatedData.data.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>Nenhum participante encontrado</p>
                        </div>
                      )}

                      {/* Informação sobre check-in */}
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Nota:</strong> Apenas participantes com check-in podem ter suas pulseiras trocadas.
                        </p>
                      </div>
                    </>
                  ) : (
                    /* Detalhes do participante selecionado para edição */
                    (() => {
                      const selectedParticipant = paginatedData.data.find(p => p.id === editingWristbandId)
                      if (!selectedParticipant) return null

                      const attendanceStatus = participantsAttendanceStatus.get(selectedParticipant.id)
                      const currentWristband = participantWristbands.get(selectedParticipant.id) || 'Não informado'

                      return (
                        <div className="space-y-4">
                          {/* Detalhes do participante */}
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">
                                  {getInitials(selectedParticipant.name)}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{selectedParticipant.name}</h3>
                                <p className="text-sm text-gray-600">{selectedParticipant.role}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">CPF:</span>
                                <p className="font-mono text-gray-900">{formatCPF(selectedParticipant.cpf?.trim() || '')}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Empresa:</span>
                                <p className="text-gray-900">{selectedParticipant.company}</p>
                              </div>
                              <div className="col-span-2">
                                <span className="text-gray-500">Credencial atual:</span>
                                <span
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2"
                                  style={{
                                    backgroundColor: getCredencialCor(selectedParticipant),
                                    color: getContrastingTextColor(getCredencialCor(selectedParticipant)),
                                    border: needsBorder(getCredencialCor(selectedParticipant)) ? '1px solid #d1d5db' : 'none'
                                  }}
                                >
                                  {getCredencial(selectedParticipant)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <div className="flex items-center gap-1 text-green-600">
                                  <Check className="w-3 h-3" />
                                  <span className="text-xs">Check-in realizado</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <span className="text-gray-500 text-sm">Pulseira atual:</span>
                              <p className="font-mono text-lg text-blue-900 font-semibold">{currentWristband}</p>
                            </div>
                          </div>

                          {/* Campos para nova credencial e pulseira */}
                          <div className="space-y-4">
                            {/* Seleção de nova credencial */}
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Tipo de credencial:
                              </label>
                              <Select value={newCredentialType} onValueChange={setNewCredentialType}>
                                <SelectTrigger className="w-full bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500">
                                  <SelectValue placeholder="Selecione o tipo de credencial" />
                                </SelectTrigger>
                                <SelectContent>
                                  {credential.filter(c => c.isActive !== false).map(credencial => (
                                    <SelectItem key={credencial.id} value={credencial.id}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: credencial.cor }}
                                        />
                                        {credencial.nome}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {newCredentialType !== selectedParticipant.credentialId && (
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                  ⚠️ <strong>Atenção:</strong> O tipo de credencial será alterado de &quot;{getCredencial(selectedParticipant)}&quot; para &quot;{credential.find(c => c.id === newCredentialType)?.nome}&quot;
                                </p>
                              )}
                            </div>

                            {/* Campo do código da pulseira */}
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Código da pulseira:
                              </label>
                              <Input
                                type="text"
                                value={newWristbandCode}
                                onChange={e => setNewWristbandCode(e.target.value)}
                                placeholder="Digite o código da pulseira"
                                className="text-center text-lg font-mono bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    salvarNovaPulseiraInline(selectedParticipant.id)
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    cancelarEdicaoPulseira()
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {/* Botões de ação */}
                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={() => salvarNovaPulseiraInline(selectedParticipant.id)}
                              disabled={loading || !newWristbandCode.trim() || !newCredentialType}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  {newCredentialType !== selectedParticipant.credentialId ? 'Salvar Credencial e Pulseira' : 'Salvar Pulseira'}
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={cancelarEdicaoPulseira}
                              disabled={loading}
                              className="px-6"
                            >
                              Voltar
                            </Button>
                          </div>
                        </div>
                      )
                    })()
                  )}
                </div>
              </DialogContent>
            </Dialog>


            <ModalAdicionarStaff
              isOpen={popupNovoStaff}
              eventId={eventId}
              selectedDay={selectedDay}
              onClose={() => setPopupNovoStaff(false)}
              evento={evento}
              operadorInfo={operadorInfo}
              onSuccess={async () => {
                // Recarregar dados se necessário
                await refetchParticipants();
                await refetchAttendance();
              }} />

          </div>
        </>
      )}
    </div>
  )
}
