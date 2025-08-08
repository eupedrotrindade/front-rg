/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

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
import { saveAs } from 'file-saver'
import {
  Calendar,
  Check,
  Clock,
  CreditCard,
  Download,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

import ExcelColumnFilter from '@/components/ui/excel-column-filter'
import { preloadModal, useLazyModal } from '@/components/ui/lazy-modal'
import VirtualTable, {
  ActionCell,
  BadgeCell,
  TextCell,
} from '@/components/ui/virtual-table'
import { changeCredentialCode } from '@/features/eventos/actions/movement-credentials'
import { useCredentialsByEvent } from '@/features/eventos/api/query/use-credentials-by-event'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import {
  useCancellableRequest,
  useDebouncedCancellableRequest,
} from '@/hooks/useCancellableRequest'
import { useIndexedSearch } from '@/hooks/useOptimizedSearch'

export default function Painel() {
  // TODOS OS useState PRIMEIRO
  const [filtro, setFiltro] = useState({
    nome: '',
    cpf: '',
    pulseira: '',
    empresa: '',
    funcao: '',
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

  const [operadorLogado, setOperadorLogado] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [operadorInfo, setOperadorInfo] = useState<{
    nome: string
    cpf: string
    id?: string
    acoes?: any[]
  } | null>(null)

  // Estados para os filtros pesquisáveis
  const [filteredEmpresas, setFilteredEmpresas] = useState<string[]>([])
  const [filteredFuncoes, setFilteredFuncoes] = useState<string[]>([])
  const [empresaSelectOpen, setEmpresaSelectOpen] = useState(false)
  const [empresaSearch, setEmpresaSearch] = useState('')
  const [funcaoSelectOpen, setFuncaoSelectOpen] = useState(false)
  const [funcaoSearch, setFuncaoSearch] = useState('')

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

  // Estado para filtro avançado e ordenação
  const [filtroAvancadoOpen, setFiltroAvancadoOpen] = useState(false)
  const [filtroAvancado, setFiltroAvancado] = useState<
    Partial<EventParticipant>
  >({})
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

  // Estados para paginação e otimização
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [virtualizedData, setVirtualizedData] = useState<EventParticipant[]>([])
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(
    null,
  )

  // Estados para cache e otimização
  const [filteredDataCache, setFilteredDataCache] = useState<
    Map<string, EventParticipant[]>
  >(new Map())
  const [lastFilterHash, setLastFilterHash] = useState<string>('')
  const [isDataStale, setIsDataStale] = useState(false)

  // Estados para virtualização e performance
  const [isVirtualMode, setIsVirtualMode] = useState(false)
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

  // TODOS OS useRef DEPOIS DOS useState
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)

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
  } = useEventParticipantsByEvent({ eventId })
  const { data: credential = [] } = useCredentialsByEvent(eventId)
  // Hooks para operações de check-in/check-out
  const checkInMutation = useCheckIn()
  const checkOutMutation = useCheckOut()

  // Hook para buscar status de presença por evento e data
  const { data: attendanceData, refetch: refetchAttendance } =
    useEventAttendanceByEventAndDate(
      params?.id as string,
      selectedDay
        ? (selectedDay.includes('_') ? selectedDay.split('_')[1] : selectedDay)
          .split('/')
          .join('-')
        : new Date().toLocaleDateString('pt-BR').split('/').join('-'),
    )

  // Hooks de otimização de performance
  const { createCancellableRequest, cancelAllRequests } =
    useCancellableRequest()

  // Lazy loading do modal de troca de pulseira
  const {
    openModal: openWristbandModal,
    closeModal: closeWristbandModal,
    ModalComponent: WristbandModalComponent,
  } = useLazyModal(() => import('@/components/operador/modalTrocaPulseira'))

  // Hook de busca otimizada com índices para datasets grandes
  const [searchResult, performOptimizedSearchFn, clearSearch] =
    useIndexedSearch({
      data: participantsData,
      searchFields: ['name', 'cpf', 'role', 'company'],
      enableIndexing: participantsData.length > 500,
      debounceMs: 150,
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

  // TODOS OS useCallback DEPOIS DOS useMemo
  const generateFilterHash = useCallback(
    (filtro: any, selectedDay: string, filtroAvancado: any) => {
      return JSON.stringify({ filtro, selectedDay, filtroAvancado })
    },
    [],
  )

  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      if (searchDebounce) {
        clearTimeout(searchDebounce)
      }

      const timeout = setTimeout(() => {
        // O filtro já foi atualizado imediatamente em handleBuscaOtimizada
        // Aqui apenas resetamos a página para mostrar os resultados
        setCurrentPage(1)
      }, 300)

      setSearchDebounce(timeout)
    },
    [searchDebounce],
  )

  // Handler otimizado de busca para mode virtual
  const handleOptimizedSearch = useCallback(
    (term: string) => {
      setSearchTerm(term)
      setIsSearching(true)

      // Para datasets grandes, usar busca indexada
      if (participantsData.length > 500) {
        performOptimizedSearchFn(term)
      } else {
        // Para datasets menores, usar busca tradicional
        debouncedSearch(term)
      }

      setCurrentPage(1)
    },
    [participantsData.length, performOptimizedSearchFn, debouncedSearch],
  )

  const getPaginatedData = useCallback(
    (data: EventParticipant[], page: number, perPage: number) => {
      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      return data.slice(startIndex, endIndex)
    },
    [],
  )

  const calculateTotalPages = useCallback((total: number, perPage: number) => {
    return Math.ceil(total / perPage)
  }, [])

  const getVisiblePages = useCallback(
    (currentPage: number, totalPages: number) => {
      const delta = 2
      const range = []
      const rangeWithDots = []

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i)
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...')
      } else {
        rangeWithDots.push(1)
      }

      rangeWithDots.push(...range)

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages)
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages)
      }

      return rangeWithDots
    },
    [],
  )

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

      const eventPeriods = [
        {
          start: evento.setupStartDate,
          end: evento.setupEndDate,
          type: 'setup',
        },
        {
          start: evento.preparationStartDate,
          end: evento.preparationEndDate,
          type: 'preparation',
        },
        {
          start: evento.finalizationStartDate,
          end: evento.finalizationEndDate,
          type: 'finalization',
        },
      ]

      return eventPeriods.some(period => {
        if (!period.start || !period.end) return false
        const startDate = new Date(period.start)
        const endDate = new Date(period.end)
        return inputDate >= startDate && inputDate <= endDate
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
    const hasSetup = evento.setupStartDate && evento.setupEndDate
    const hasPreparation =
      evento.preparationStartDate && evento.preparationEndDate
    const hasFinalization =
      evento.finalizationStartDate && evento.finalizationEndDate

    if (hasSetup && evento.setupStartDate && evento.setupEndDate) {
      periods.push(
        `Montagem: ${new Date(evento.setupStartDate).toLocaleDateString(
          'pt-BR',
        )} - ${new Date(evento.setupEndDate).toLocaleDateString('pt-BR')}`,
      )
    }
    if (
      hasPreparation &&
      evento.preparationStartDate &&
      evento.preparationEndDate
    ) {
      const startDate = new Date(evento.preparationStartDate)
      const endDate = new Date(evento.preparationEndDate)

      // Remover horário para evitar problemas de timezone
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)

      periods.push(
        `Evento: ${new Date(startDate).toLocaleDateString(
          'pt-BR',
        )} - ${new Date(endDate).toLocaleDateString('pt-BR')}`,
      )
    }
    if (
      hasFinalization &&
      evento.finalizationStartDate &&
      evento.finalizationEndDate
    ) {
      periods.push(
        `Desmontagem: ${new Date(
          evento.finalizationStartDate,
        ).toLocaleDateString('pt-BR')} - ${new Date(
          evento.finalizationEndDate,
        ).toLocaleDateString('pt-BR')}`,
      )
    }

    if (periods.length === 0) {
      return 'Nenhum período definido'
    }

    if (periods.length === 1 && hasPreparation) {
      return `${periods[0]} (apenas dia do evento)`
    }

    return periods.join(' | ')
  }, [evento])

  const getEventDays = useCallback((): Array<{
    id: string
    label: string
    date: string
    type: string
  }> => {
    if (!evento || Array.isArray(evento)) return []

    const days: Array<{
      id: string
      label: string
      date: string
      type: string
    }> = []
    const hasSetup = evento.setupStartDate && evento.setupEndDate
    const hasPreparation =
      evento.preparationStartDate && evento.preparationEndDate
    const hasFinalization =
      evento.finalizationStartDate && evento.finalizationEndDate

    console.log('🔍 Debug getEventDays:')
    console.log('🔍 preparationStartDate:', evento.preparationStartDate)
    console.log('🔍 preparationEndDate:', evento.preparationEndDate)

    // Removido a aba "TODOS" - não adiciona mais o 'all'

    if (hasSetup && evento.setupStartDate && evento.setupEndDate) {
      // Corrigir problema de timezone - tratar como data local
      const startDateStr = evento.setupStartDate
      const endDateStr = evento.setupEndDate

      // Criar datas no timezone local
      const startDate = new Date(startDateStr + 'T00:00:00')
      const endDate = new Date(endDateStr + 'T00:00:00')

      console.log('🔍 Montagem - startDate original:', startDateStr)
      console.log('🔍 Montagem - endDate original:', endDateStr)
      console.log('🔍 Montagem - startDate local:', startDate)
      console.log('🔍 Montagem - endDate local:', endDate)

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        const dateStr = date.toLocaleDateString('pt-BR')
        console.log('🔍 Adicionando dia de montagem:', dateStr)
        days.push({
          id: `${dateStr}`,
          label: `${dateStr} (MONTAGEM)`,
          date: dateStr,
          type: 'setup',
        })
      }
    }

    if (
      hasPreparation &&
      evento.preparationStartDate &&
      evento.preparationEndDate
    ) {
      // Corrigir problema de timezone - tratar como data local
      const startDateStr = evento.preparationStartDate
      const endDateStr = evento.preparationEndDate

      // Criar datas no timezone local
      const startDate = new Date(startDateStr + 'T00:00:00')
      const endDate = new Date(endDateStr + 'T00:00:00')

      console.log('🔍 Preparação/Evento - startDate original:', startDateStr)
      console.log('🔍 Preparação/Evento - endDate original:', endDateStr)
      console.log('🔍 Preparação/Evento - startDate local:', startDate)
      console.log('🔍 Preparação/Evento - endDate local:', endDate)

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        const dateStr = date.toLocaleDateString('pt-BR')
        const isOnlyEventDay = !hasSetup && !hasFinalization
        console.log('🔍 Adicionando dia de preparação/evento:', dateStr)
        days.push({
          id: `${dateStr}`,
          label: isOnlyEventDay
            ? `${dateStr} (DIA DO EVENTO)`
            : `${dateStr} (EVENTO)`,
          date: dateStr,
          type: 'preparation',
        })
      }
    }

    if (
      hasFinalization &&
      evento.finalizationStartDate &&
      evento.finalizationEndDate
    ) {
      // Corrigir problema de timezone - tratar como data local
      const startDateStr = evento.finalizationStartDate
      const endDateStr = evento.finalizationEndDate

      // Criar datas no timezone local
      const startDate = new Date(startDateStr + 'T00:00:00')
      const endDate = new Date(endDateStr + 'T00:00:00')

      console.log('🔍 Finalização - startDate original:', startDateStr)
      console.log('🔍 Finalização - endDate original:', endDateStr)
      console.log('🔍 Finalização - startDate local:', startDate)
      console.log('🔍 Finalização - endDate local:', endDate)

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        const dateStr = date.toLocaleDateString('pt-BR')
        console.log('🔍 Adicionando dia de finalização:', dateStr)
        days.push({
          id: `${dateStr}`,
          label: `${dateStr} (DESMONTAGEM)`,
          date: dateStr,
          type: 'finalization',
        })
      }
    }

    console.log('🔍 Dias finais gerados:', days)
    return days
  }, [evento])

  const getColaboradoresPorDia = useCallback(
    (dia: string): EventParticipant[] => {
      if (dia === 'all') {
        return participantsData
      }

      // Extrair apenas a data do ID (remover prefixo se existir)
      const dataDia = dia.includes('_') ? dia.split('_')[1] : dia

      return participantsData.filter((colab: EventParticipant) => {
        if (!colab.daysWork || colab.daysWork.length === 0) {
          return false
        }
        return colab.daysWork.includes(dataDia)
      })
    },
    [participantsData],
  )

  const scrollToLeft = useCallback(() => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current
      const scrollAmount = container.clientWidth * 0.8
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }, [])

  const scrollToRight = useCallback(() => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current
      const scrollAmount = container.clientWidth * 0.8
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }, [])

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

      const hasSetup = evento.setupStartDate && evento.setupEndDate
      const hasPreparation =
        evento.preparationStartDate && evento.preparationEndDate
      const hasFinalization =
        evento.finalizationStartDate && evento.finalizationEndDate

      participant.daysWork.forEach(day => {
        const dayDate = new Date(day.split('/').reverse().join('-'))
        dayDate.setHours(0, 0, 0, 0)

        if (hasSetup && evento.setupStartDate && evento.setupEndDate) {
          const startDate = new Date(evento.setupStartDate)
          const endDate = new Date(evento.setupEndDate)
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(0, 0, 0, 0)

          if (dayDate >= startDate && dayDate <= endDate) {
            categorized.setup.push(day)
            return
          }
        }

        if (
          hasPreparation &&
          evento.preparationStartDate &&
          evento.preparationEndDate
        ) {
          const startDate = new Date(evento.preparationStartDate)
          const endDate = new Date(evento.preparationEndDate)
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(0, 0, 0, 0)

          if (dayDate >= startDate && dayDate <= endDate) {
            categorized.preparation.push(day)
            return
          }
        }

        if (
          hasFinalization &&
          evento.finalizationStartDate &&
          evento.finalizationEndDate
        ) {
          const startDate = new Date(evento.finalizationStartDate)
          const endDate = new Date(evento.finalizationEndDate)
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(0, 0, 0, 0)

          if (dayDate >= startDate && dayDate <= endDate) {
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
        let startDate: string | undefined
        let endDate: string | undefined

        switch (phase) {
          case 'preparacao':
            startDate = evento.preparationStartDate
            endDate = evento.preparationEndDate
            break
          case 'montagem':
            startDate = evento.setupStartDate
            endDate = evento.setupEndDate
            break
          case 'finalizacao':
            startDate = evento.finalizationStartDate
            endDate = evento.finalizationEndDate
            break
          default:
            return []
        }

        if (startDate && endDate) {
          const start = new Date(startDate)
          const end = new Date(endDate)
          start.setHours(0, 0, 0, 0)
          end.setHours(0, 0, 0, 0)
          const currentDate = new Date(start)

          while (currentDate <= end) {
            const formattedDate = currentDate.toLocaleDateString('pt-BR')
            availableDates.push(formattedDate)
            currentDate.setDate(currentDate.getDate() + 1)
          }
        }

        return availableDates.sort()
      }

      const periods = []

      if (evento.setupStartDate && evento.setupEndDate) {
        periods.push({ start: evento.setupStartDate, end: evento.setupEndDate })
      }
      if (evento.preparationStartDate && evento.preparationEndDate) {
        periods.push({
          start: evento.preparationStartDate,
          end: evento.preparationEndDate,
        })
      }
      if (evento.finalizationStartDate && evento.finalizationEndDate) {
        periods.push({
          start: evento.finalizationStartDate,
          end: evento.finalizationEndDate,
        })
      }

      periods.forEach(period => {
        const startDate = new Date(period.start)
        const endDate = new Date(period.end)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(0, 0, 0, 0)
        const currentDate = new Date(startDate)

        while (currentDate <= endDate) {
          const formattedDate = currentDate.toLocaleDateString('pt-BR')
          availableDates.push(formattedDate)
          currentDate.setDate(currentDate.getDate() + 1)
        }
      })

      return availableDates.sort()
    },
    [evento],
  )

  const hasDefinedPeriods = useCallback((): boolean => {
    if (!evento || Array.isArray(evento)) return false
    return (
      !!(evento.setupStartDate && evento.setupEndDate) ||
      !!(evento.preparationStartDate && evento.preparationEndDate) ||
      !!(evento.finalizationStartDate && evento.finalizationEndDate)
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

  const clearCache = useCallback(() => {
    setFilteredDataCache(new Map())
    setIsDataStale(false)
  }, [])

  // Funções para filtros das colunas
  const handleColumnFilterChange = useCallback(
    (column: keyof typeof columnFilters, selectedValues: string[]) => {
      setColumnFilters(prev => ({
        ...prev,
        [column]: selectedValues,
      }))
      setCurrentPage(1)
    },
    [],
  )

  // Função para ordenar tabela por coluna específica
  const handleColumnSort = useCallback(
    (column: string, direction: 'asc' | 'desc') => {
      setOrdenacao({ campo: column, direcao: direction })
      setCurrentPage(1)
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
    setCurrentPage(1)
  }, [])

  const hasActiveColumnFilters = useMemo(() => {
    return Object.values(columnFilters).some(filters => filters.length > 0)
  }, [columnFilters])

  // Função utilitária para converter dd/mm/yyyy para Date
  const dataBRtoDate = (dataStr: string): Date => {
    const [dia, mes, ano] = dataStr.split('/')
    return new Date(Number(ano), Number(mes) - 1, Number(dia))
  }

  // Retorna apenas as datas autorizadas para o operador logado
  const getDiasDisponiveisParaOperador = useCallback(() => {
    let dias = []
    if (!operadorInfo?.id) {
      dias = getEventDays()
    } else if (availableDatesForOperator.length === 0) {
      dias = getEventDays()
    } else {
      dias = getEventDays().filter(day =>
        availableDatesForOperator.includes(day.id),
      )
    }
    // Ordena as datas
    dias.sort((a, b) => {
      const dateA = dataBRtoDate(a.date)
      const dateB = dataBRtoDate(b.date)
      return dateA.getTime() - dateB.getTime()
    })
    return dias
  }, [operadorInfo?.id, availableDatesForOperator, getEventDays])

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

  // Função para determinar qual botão mostrar
  const getBotaoAcao = (colaborador: EventParticipant) => {
    // Extrair apenas a data do selectedDay (remover prefixo se existir)
    const dataDia = selectedDay.includes('_')
      ? selectedDay.split('_')[1]
      : selectedDay

    // Verificar se o colaborador trabalha nesta data
    if (!colaborador.daysWork || !colaborador.daysWork.includes(dataDia)) {
      return null // Não trabalha nesta data
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

  const abrirPopup = (colaborador: EventParticipant) => {
    setSelectedParticipant(colaborador)
    setModalAberto(true)
  }

  // Função para abrir popup de check-in
  const abrirCheckin = (colaborador: EventParticipant) => {
    console.log('🔍 abrirCheckin chamado com colaborador:', colaborador)
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

  // TODOS OS useMemo DEPOIS DOS useCallback
  const filtrarColaboradores = useMemo(() => {
    const filterHash =
      generateFilterHash(filtro, selectedDay, filtroAvancado) +
      JSON.stringify(columnFilters)

    if (filteredDataCache.has(filterHash) && !isDataStale) {
      const cachedData = filteredDataCache.get(filterHash)!
      return { data: cachedData, total: cachedData.length }
    }

    let filtrados: EventParticipant[] = getColaboradoresPorDia(selectedDay)

    filtrados = filtrados.filter((colab: EventParticipant) => {
      const nomeMatch = colab.name
        ?.toLowerCase()
        .includes(filtro.nome.toLowerCase())
      const cpfTrimmed = colab.cpf?.trim() || ''
      const cpfSemPontuacao = cpfTrimmed.replace(/\D/g, '')
      const buscaSemPontuacao = filtro.nome.replace(/\D/g, '')
      const cpfMatch =
        cpfTrimmed === filtro.nome ||
        (cpfSemPontuacao &&
          buscaSemPontuacao &&
          cpfSemPontuacao === buscaSemPontuacao) ||
        (buscaSemPontuacao.length >= 3 &&
          cpfSemPontuacao?.includes(buscaSemPontuacao))
      const credentialMatch =
        colab.credentialId?.toLowerCase() === filtro.nome.toLowerCase()
      const empresaMatch = filtro.empresa
        ? colab.company === filtro.empresa
        : true
      const funcaoMatch = filtro.funcao ? colab.role === filtro.funcao : true

      let match =
        (nomeMatch || cpfMatch || credentialMatch) &&
        empresaMatch &&
        funcaoMatch

      // Aplicar filtros avançados
      Object.entries(filtroAvancado).forEach(([campo, valor]) => {
        const colabValue = (colab as any)[campo]
        if (valor && String(valor).trim() !== '') {
          if (
            colabValue === undefined ||
            String(colabValue).toLowerCase() !== String(valor).toLowerCase()
          ) {
            match = false
          }
        }
      })

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
    filtro,
    selectedDay,
    filtroAvancado,
    ordenacao,
    getColaboradoresPorDia,
    generateFilterHash,
    isDataStale,
    filteredDataCache,
    columnFilters,
    hasActiveColumnFilters,
    credential,
  ])

  const paginatedData = useMemo(() => {
    const { data: allData, total } = filtrarColaboradores
    const paginated = getPaginatedData(allData, currentPage, itemsPerPage)
    return { data: paginated, total }
  }, [filtrarColaboradores, currentPage, itemsPerPage, getPaginatedData])

  const isHighVolume = paginatedData.total > 1000
  const showPerformanceIndicator = isHighVolume && !participantsLoading

  // Sempre usar modo virtual para consistência responsiva
  useEffect(() => {
    setIsVirtualMode(true) // Sempre true para garantir responsividade
  }, [])

  // Detectar se é mobile para tabela regular
  useEffect(() => {
    const checkIsMobileTable = () => {
      setIsMobileTable(window.innerWidth < 700)
    }

    checkIsMobileTable()
    window.addEventListener('resize', checkIsMobileTable)

    return () => window.removeEventListener('resize', checkIsMobileTable)
  }, [])

  // Usar busca otimizada quando há termo de busca
  const optimizedData = useMemo(() => {
    if (searchTerm.trim() && searchTerm.length >= 2) {
      const searchData = searchResult.items.filter((item: EventParticipant) => {
        return getColaboradoresPorDia(selectedDay).includes(item)
      })
      return { data: searchData, total: searchData.length }
    }
    return filtrarColaboradores
  }, [
    searchTerm,
    searchResult,
    filtrarColaboradores,
    selectedDay,
    getColaboradoresPorDia,
  ])

  // Dados finais para exibição
  const finalData = useMemo(() => {
    const sourceData = searchTerm.trim() ? optimizedData : filtrarColaboradores
    if (isVirtualMode) {
      // No modo virtual, retornamos todos os dados filtrados
      return sourceData
    } else {
      // No modo paginado, aplicamos paginação
      const paginated = getPaginatedData(
        sourceData.data,
        currentPage,
        itemsPerPage,
      )
      return { data: paginated, total: sourceData.total }
    }
  }, [
    searchTerm,
    optimizedData,
    filtrarColaboradores,
    isVirtualMode,
    currentPage,
    itemsPerPage,
    getPaginatedData,
  ])

  // Valores únicos para filtros das colunas
  const columnUniqueValues = useMemo(() => {
    const currentData = getColaboradoresPorDia(selectedDay)

    return {
      nome: Array.from(
        new Set(
          currentData
            .map(c => c.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ),
      cpf: Array.from(
        new Set(
          currentData
            .map(c => formatCPF(c.cpf?.trim() || ''))
            .filter((cpf): cpf is string => Boolean(cpf)),
        ),
      ),
      funcao: Array.from(
        new Set(
          currentData
            .map(c => c.role)
            .filter((role): role is string => Boolean(role)),
        ),
      ),
      empresa: Array.from(
        new Set(
          currentData
            .map(c => c.company)
            .filter((company): company is string => Boolean(company)),
        ),
      ),
      credencial: Array.from(
        new Set(
          currentData
            .map(c => {
              const credentialSelected = credential.find(
                w => w.id === c.credentialId,
              )
              return credentialSelected?.nome || 'SEM CREDENCIAL'
            })
            .filter((cred): cred is string => Boolean(cred)),
        ),
      ),
    }
  }, [getColaboradoresPorDia, selectedDay, credential])

  // Configuração das colunas para a tabela virtual
  const virtualTableColumns = useMemo(
    () => [
      {
        key: 'name',
        header: (
          <div className="flex items-center justify-between">
            <span>Nome</span>
            <ExcelColumnFilter
              values={columnUniqueValues.nome}
              selectedValues={columnFilters.nome}
              onSelectionChange={values =>
                handleColumnFilterChange('nome', values)
              }
              onSortTable={direction => handleColumnSort('name', direction)}
              columnTitle="Nome"
              isActive={columnFilters.nome.length > 0}
            />
          </div>
        ),
        width: 200,
        minWidth: 120,
        priority: 2, // Alta prioridade para mobile (depois de Ação)
        cell: (item: EventParticipant) => (
          <TextCell className="font-semibold text-gray-900">
            {item.name}
          </TextCell>
        ),
      },
      {
        key: 'cpf',
        header: (
          <div className="flex items-center justify-between">
            <span>CPF</span>
            <ExcelColumnFilter
              values={columnUniqueValues.cpf}
              selectedValues={columnFilters.cpf}
              onSelectionChange={values =>
                handleColumnFilterChange('cpf', values)
              }
              onSortTable={direction => handleColumnSort('cpf', direction)}
              columnTitle="CPF"
              isActive={columnFilters.cpf.length > 0}
            />
          </div>
        ),
        width: 150,
        minWidth: 120,
        priority: 3, // Baixa prioridade para mobile
        hiddenOnMobile: true,
        cell: (item: EventParticipant) => (
          <TextCell className="font-mono">
            {formatCPF(item.cpf?.trim() || '')}
          </TextCell>
        ),
      },
      {
        key: 'role',
        header: (
          <div className="flex items-center justify-between">
            <span>Função</span>
            <ExcelColumnFilter
              values={columnUniqueValues.funcao}
              selectedValues={columnFilters.funcao}
              onSelectionChange={values =>
                handleColumnFilterChange('funcao', values)
              }
              onSortTable={direction => handleColumnSort('role', direction)}
              columnTitle="Função"
              isActive={columnFilters.funcao.length > 0}
            />
          </div>
        ),
        width: 150,
        minWidth: 100,
        priority: 4, // Baixa prioridade para mobile
        hiddenOnMobile: true,
        cell: (item: EventParticipant) => <TextCell>{item.role}</TextCell>,
      },
      {
        key: 'company',
        header: (
          <div className="flex items-center justify-between">
            <span>Empresa</span>
            <ExcelColumnFilter
              values={columnUniqueValues.empresa}
              selectedValues={columnFilters.empresa}
              onSelectionChange={values =>
                handleColumnFilterChange('empresa', values)
              }
              onSortTable={direction => handleColumnSort('company', direction)}
              columnTitle="Empresa"
              isActive={columnFilters.empresa.length > 0}
            />
          </div>
        ),
        width: 150,
        minWidth: 100,
        priority: 5, // Baixa prioridade para mobile
        hiddenOnMobile: true,
        cell: (item: EventParticipant) => (
          <BadgeCell variant="blue">{item.company}</BadgeCell>
        ),
      },
      {
        key: 'credential',
        header: (
          <div className="flex items-center justify-between">
            <span className="hidden sm:inline">Tipo de Credencial</span>
            <span className="sm:hidden">Credencial</span>
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
        ),
        width: 180,
        minWidth: 120,
        priority: 6, // Baixa prioridade para mobile
        hiddenOnMobile: true,
        cell: (item: EventParticipant) => (
          <BadgeCell variant="purple">{getCredencial(item)}</BadgeCell>
        ),
      },
      {
        key: 'actions',
        header: 'Ação',
        width: 120,
        minWidth: 90,
        priority: 1, // Máxima prioridade - sempre visível e fixo
        sticky: 'right', // Fixado à direita
        cell: (item: EventParticipant) => {
          const botaoTipo = getBotaoAcao(item)
          return (
            <ActionCell>
              {botaoTipo === 'checkin' && (
                <Button
                  onClick={() => abrirCheckin(item)}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-xs px-1.5 py-1"
                  disabled={loading}
                >
                  <Check className="w-3 h-3 mr-0.5" />
                  <span>In</span>
                </Button>
              )}
              {botaoTipo === 'checkout' && (
                <Button
                  onClick={() => abrirCheckout(item)}
                  size="sm"
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-xs px-1.5 py-1"
                  disabled={loading}
                >
                  <Clock className="w-3 h-3 mr-0.5" />
                  <span>Out</span>
                </Button>
              )}
            </ActionCell>
          )
        },
      },
    ],
    [
      columnUniqueValues,
      columnFilters,
      handleColumnFilterChange,
      handleColumnSort,
      getBotaoAcao,
      getCredencial,
      formatCPF,
      abrirCheckin,
      abrirCheckout,
      loading,
    ],
  )

  // TODOS OS useEffect POR ÚLTIMO
  useEffect(() => {
    const carregarOperador = async () => {
      const operadorRaw = localStorage.getItem('operador')
      setOperadorLogado(!!operadorRaw)
      if (operadorRaw) {
        try {
          const operador = JSON.parse(operadorRaw)
          console.log('🔍 Operador do localStorage:', operador)
          console.log('🔍 Operador ID:', operador.id)
          console.log('🔍 Operador acao:', operador.acao)
          console.log('🔍 Tipo do ID:', typeof operador.id)

          // Se não tem ID, buscar pelo CPF
          if (!operador.id && operador.cpf) {
            console.log('🔍 Buscando operador pelo CPF:', operador.cpf)
            try {
              const response = await apiClient.get(
                `/operadores?cpf=eq.${operador.cpf}`,
              )
              console.log('🔍 Resposta da busca:', response)
              if (response.data && response.data.length > 0) {
                const operadorCompleto = response.data[0]
                console.log(
                  '🔍 Operador completo encontrado:',
                  operadorCompleto,
                )
                setOperadorInfo({
                  nome: operador.nome,
                  cpf: operador.cpf,
                  id: operadorCompleto.id,
                  acoes: operadorCompleto.acoes,
                })
                return
              } else {
                console.log('❌ Operador não encontrado na base de dados')
              }
            } catch (error) {
              console.error('❌ Erro ao buscar operador:', error)
            }
          }

          setOperadorInfo({
            nome: operador.nome,
            cpf: operador.cpf,
            id: operador.id,
            acoes: operador.acoes,
          })
        } catch (error) {
          console.error('❌ Erro ao parsear operador do localStorage:', error)
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
      setFilteredDataCache(new Map())
      setCurrentPage(1)
    }
  }, [participantsData])

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [
    filtro,
    selectedDay,
    filtroAvancado,
    ordenacao,
    currentPage,
    columnFilters,
  ])

  // Carregar status de presença quando o dia selecionado mudar (debounced)
  useEffect(() => {
    if (selectedDay && finalData.data.length > 0) {
      setAttendanceDataLoaded(false) // Reset o status ao trocar de dia
      setIsLoadingAttendance(true) // Iniciar loading
      debouncedLoadAttendanceStatus(finalData.data, selectedDay)
    }
  }, [selectedDay, finalData.data, debouncedLoadAttendanceStatus])

  // Registrar carregamento de dados de attendance
  useEffect(() => {
    if (attendanceDataLoaded && attendanceData && attendanceData.length > 0) {
      console.log(
        '🔍 Dados de attendance carregados para',
        attendanceData.length,
        'registros',
      )
    }
  }, [attendanceDataLoaded, attendanceData])

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

  // useEffect para gerenciar cache
  useEffect(() => {
    const filterHash = generateFilterHash(filtro, selectedDay, filtroAvancado)
    const { data: filtrados } = filtrarColaboradores

    if (!filteredDataCache.has(filterHash) || isDataStale) {
      const newCache = new Map(filteredDataCache)
      newCache.set(filterHash, filtrados)
      setFilteredDataCache(newCache)
      setLastFilterHash(filterHash)
      setIsDataStale(false)
    }
  }, [
    filtrarColaboradores,
    isDataStale,
    filtro,
    selectedDay,
    filtroAvancado,
    filteredDataCache,
    generateFilterHash,
  ])

  // useEffect para atualizar totalItems
  useEffect(() => {
    setTotalItems(paginatedData.total)
  }, [paginatedData.total])

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

  console.log('evento', evento)

  const handleBusca = (valor: string) => {
    setFiltro({ ...filtro, nome: valor })
  }

  // Função otimizada de busca com debounce
  const handleBuscaOtimizada = (valor: string) => {
    // Atualizar o filtro imediatamente para manter a responsividade do input
    setFiltro(prev => ({ ...prev, nome: valor }))

    // Usar busca otimizada baseada no tamanho do dataset
    if (participantsData.length > 500) {
      // Para datasets grandes, usar a busca indexada
      performOptimizedSearchFn(valor)
      setSearchTerm(valor)
      setCurrentPage(1)
    } else {
      // Para datasets menores, usar busca tradicional com debounce apenas para otimização
      debouncedSearch(valor)
    }
  }

  // Função para mudar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Função para mudar itens por página
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  // Componente de paginação
  const PaginationComponent = () => {
    const totalPages = calculateTotalPages(paginatedData.total, itemsPerPage)
    const visiblePages = getVisiblePages(currentPage, totalPages)

    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between bg-white px-6 py-4 border-t border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Itens por página:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={value => handleItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-gray-600">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{' '}
            {Math.min(currentPage * itemsPerPage, paginatedData.total)} de{' '}
            {paginatedData.total} resultados
            {attendanceDataLoaded && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                ✓ Dados de presença carregados - Exibindo todos os registros
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1"
          >
            Anterior
          </Button>

          {visiblePages.map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="px-3 py-1 text-gray-500">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page as number)}
                  className="px-3 py-1"
                >
                  {page}
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1"
          >
            Próxima
          </Button>
        </div>
      </div>
    )
  }

  const fecharPopup = () => {
    setSelectedParticipant(null)
    setModalAberto(false)
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
      console.error('Erro ao verificar presença:', error)
      return null
    }
  }

  // Função para carregar status de presença de todos os participantes
  const carregarStatusPresencaTodos = (
    participants: EventParticipant[],
    date: string,
  ) => {
    try {
      console.log(
        '🔍 Carregando status de presença para',
        participants.length,
        'participantes na data',
        date,
      )

      if (!attendanceData || !Array.isArray(attendanceData)) {
        console.log('🔍 Nenhum dado de presença disponível')
        return
      }

      console.log('🔍 Dados de presença recebidos:', attendanceData)

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

      console.log('🔍 Status map final:', statusMap)
      setParticipantsAttendanceStatus(statusMap)
      setAttendanceDataLoaded(true)
      setIsLoadingAttendance(false) // Parar loading

      // Notificar que o processamento foi concluído
      console.log(
        '🔍 Processamento de attendance concluído, todos os registros disponíveis',
      )
    } catch (error) {
      console.error('Erro ao carregar status de presença:', error)
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
  //         console.error("Erro ao registrar ação:", error);
  //     }
  // };

  // Função para registrar ações na coluna acao do operador
  const registerOperatorActionInColumn = async (actionData: {
    type: string
    staffId?: string
    staffName?: string
    pulseira?: string
    credencial?: string
  }) => {
    console.log('🔍 registerOperatorActionInColumn chamado com:', actionData)
    console.log('🔍 operadorInfo:', operadorInfo)

    if (!operadorInfo?.id) {
      console.log('❌ operadorInfo.id não existe, saindo...')
      console.log('🔍 Tentando buscar operador pelo CPF...')

      // Tentar buscar o operador pelo CPF se não temos ID
      if (operadorInfo?.cpf) {
        try {
          const response = await apiClient.get(
            `/operadores?cpf=eq.${operadorInfo.cpf}`,
          )
          console.log('🔍 Resposta da busca por CPF:', response)

          if (response.data && response.data.length > 0) {
            const operadorCompleto = response.data[0]
            console.log('🔍 Operador encontrado:', operadorCompleto)

            // Atualizar operadorInfo com os dados completos
            setOperadorInfo({
              nome: operadorInfo.nome,
              cpf: operadorInfo.cpf,
              id: operadorCompleto.id,
              acoes: operadorCompleto.acoes,
            })

            // Continuar com o registro da ação
            console.log('🔍 Continuando com o registro da ação...')
          } else {
            console.log('❌ Operador não encontrado na base de dados')
            return
          }
        } catch (error) {
          console.error('❌ Erro ao buscar operador por CPF:', error)
          return
        }
      } else {
        console.log('❌ Nem ID nem CPF disponíveis')
        return
      }
    }

    // Verificar se agora temos o ID
    if (!operadorInfo?.id) {
      console.log('❌ Ainda não temos operadorInfo.id, saindo...')
      return
    }

    try {
      const currentActions = operadorInfo.acoes
        ? Array.isArray(operadorInfo.acoes)
          ? operadorInfo.acoes
          : []
        : []
      console.log('🔍 currentActions:', currentActions)

      const newAction = {
        type: actionData.type,
        evento: Array.isArray(evento) ? 'Evento' : evento?.name || 'Evento',
        tabela: params?.id as string,
        staffId: actionData.staffId ? parseInt(actionData.staffId) : 0,
        pulseira: actionData.pulseira || '',
        staffName: actionData.staffName || '',
        timestamp: new Date().toISOString(),
        credencial: actionData.credencial || '',
      }
      console.log('🔍 newAction:', newAction)

      const updatedActions = [...currentActions, newAction]
      console.log('🔍 updatedActions:', updatedActions)

      console.log('🔍 Fazendo PUT para /operadores/${operadorInfo.id}')
      console.log('🔍 ID do operador sendo usado:', operadorInfo.id)
      console.log('🔍 Tipo do ID:', typeof operadorInfo.id)

      const response = await apiClient.put(`/operadores/${operadorInfo.id}`, {
        acoes: updatedActions,
      })
      console.log('✅ PUT realizado com sucesso:', response)

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
      console.error('❌ Erro ao registrar ação na coluna do operador:', error)
      console.error('❌ Detalhes do erro:', error)
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
        staffId: String(participantAction.id),
        staffName: participantAction.name,
        pulseira: novaPulseira.trim(),
        credencial: (() => {
          const credentialSelected = credential.find(
            w => w.id === participantAction.credentialId,
          )
          return credentialSelected?.nome || ''
        })(),
      })
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
        credencial: (() => {
          const credentialSelected = credential.find(
            w => w.id === novoStaff.tipo_credencial,
          )
          return credentialSelected?.nome || ''
        })(),
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

  // Função para exportar para Excel
  const exportarParaExcel = () => {
    const { data } = filtrarColaboradores
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(
      new Blob([wbout], { type: 'application/octet-stream' }),
      `colaboradores_${nomeEvento}.xlsx`,
    )
  }

  // Função para baixar modelo Excel
  const baixarModeloExcel = () => {
    const ids = participantsData
      .map(c => Number(c.id) || 0)
      .filter(n => !isNaN(n))
    const maxId = ids.length > 0 ? Math.max(...ids) : 0
    const proximoId = maxId + 1

    const modelo = [
      { name: '', cpf: '', role: '', company: '', wristbandId: '' },
    ]
    const ws = XLSX.utils.json_to_sheet(modelo)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(
      new Blob([wbout], { type: 'application/octet-stream' }),
      `modelo_colaboradores.xlsx`,
    )
  }

  // Função para exportar barrados para CSV
  const exportarBarradosCSV = () => {
    const headers = ['Nome', 'CPF', 'Função', 'Empresa', 'Tipo de Credencial']
    const csvContent = [
      headers.join(','),
      ...resumoImportacao.barrados.map(item =>
        [item.name, item.cpf, item.role, item.company, item.wristbandId || '']
          .map(f => `"${f}"`)
          .join(','),
      ),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `colaboradores-barrados-${new Date().toISOString().split('T')[0]
      }.csv`
    link.click()
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
    Object.values(filtroAvancado).forEach(val => {
      if (val && String(val).trim() !== '') count++
    })
    if (ordenacao.campo && ordenacao.campo !== '') count++
    // Contar filtros das colunas
    Object.values(columnFilters).forEach(filters => {
      if (filters.length > 0) count++
    })
    return count
  }

  // Função para confirmar check-in
  const confirmarCheckin = async () => {
    console.log('🔍 confirmarCheckin chamado')
    console.log('🔍 participantAction:', participantAction)
    console.log('🔍 codigoPulseira:', codigoPulseira)
    console.log('🔍 operadorInfo:', operadorInfo)

    if (!participantAction) {
      console.log('❌ Dados insuficientes para realizar check-in')
      toast.error('Dados insuficientes para realizar check-in')
      return
    }
    if (!operadorInfo?.nome) {
      console.log('❌ Informações do operador não encontradas')
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
        ? selectedDateForAction
        : todayFormatted

      console.log('🔍 Enviando check-in com dados:', {
        participantId: participantAction.id,
        date: dateToUse,
        validatedBy: operadorInfo.nome,
        performedBy: operadorInfo.nome,
        notes: `Check-in realizado via painel do operador - Pulseira: ${codigoPulseira.trim()}`,
      })

      await checkInMutation.mutateAsync({
        participantId: participantAction.id,
        date: dateToUse,
        validatedBy: operadorInfo.nome,
        performedBy: operadorInfo.nome,
        notes: `Check-in realizado via painel do operador - Pulseira: ${codigoPulseira.trim()}`,
      })

      // Salvar pulseira no sistema de movement_credentials
      try {
        await changeCredentialCode(
          eventId,
          participantAction.id,
          codigoPulseira.trim(),
        )
        console.log('✅ Pulseira salva no sistema de movement_credentials')
      } catch (error) {
        console.error('⚠️ Erro ao salvar pulseira no sistema:', error)
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
        staffId: String(participantAction.id),
        staffName: participantAction.name,
        pulseira: codigoPulseira.trim(),
        credencial: getCredencial(participantAction),
      })
      toast.success('Check-in realizado com sucesso!')
      setPopupCheckin(false)
      setParticipantAction(null)
      setCodigoPulseira('')
      setSelectedDateForAction('')
    } catch (error) {
      console.error('❌ Erro ao realizar check-in:', error)
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
        ? selectedDateForAction
        : todayFormatted

      await checkOutMutation.mutateAsync({
        participantId: participantAction.id,
        date: dateToUse,
        validatedBy: operadorInfo.nome,
        performedBy: operadorInfo.nome,
        notes: 'Check-out realizado via painel do operador',
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
        staffId: String(participantAction.id),
        staffName: participantAction.name,
        credencial: getCredencial(participantAction),
      })
      toast.success('Check-out realizado com sucesso!')
      setPopupCheckout(false)
      setParticipantAction(null)
      setSelectedDateForAction('')
    } catch (error) {
      console.error('❌ Erro ao realizar check-out:', error)
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
                    <span className="font-medium">{paginatedData.total}</span>{' '}
                    colaboradores
                    {selectedDay && (
                      <span className="text-xs text-gray-500 ml-1">
                        (dia {selectedDay})
                      </span>
                    )}
                    {paginatedData.total > 1000 && (
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
                    onClick={() => setFiltroAvancadoOpen(true)}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 border-gray-200 hover:bg-gray-50  hover:border-gray-300 bg-white shadow-sm transition-all duration-200"
                    disabled={loading}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros
                    {countFiltrosAtivos() > 0 && (
                      <span className="ml-2 bg-purple-100 text-purple-800 text-xs rounded-full px-2 py-0.5 font-medium">
                        {countFiltrosAtivos()}
                      </span>
                    )}
                  </Button>

                  {countFiltrosAtivos() > 0 && (
                    <Button
                      onClick={() => {
                        setFiltroAvancado({})
                        setOrdenacao({ campo: '', direcao: 'asc' })
                      }}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-white shadow-sm transition-all duration-200"
                      disabled={loading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpar Filtros
                      <span className="ml-2 bg-red-100 text-red-800 text-xs rounded-full px-2 py-0.5 font-medium">
                        {countFiltrosAtivos()}
                      </span>
                    </Button>
                  )}

                  <Button
                    onClick={exportarParaExcel}
                    variant="outline"
                    size="sm"
                    className="btn-brand-green"
                    disabled={loading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>

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

            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Procure pelo colaborador, pessoa gestora ou cpf"
                  value={filtro.nome}
                  onChange={e => handleBuscaOtimizada(e.target.value)}
                  className="pl-10 text-gray-600 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 shadow-sm transition-all duration-200"
                />
              </div>
            </div>

            {/* Tabs dos dias do evento com carrossel */}
            <div className="mb-8">
              <div className="border-b border-gray-200 bg-white rounded-t-lg relative">
                {/* Botão de navegação esquerda */}
                <button
                  onClick={scrollToLeft}
                  className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-white border-r border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors duration-200"
                >
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                {/* Container dos tabs com scroll */}
                <nav
                  ref={tabsContainerRef}
                  className="-mb-px flex space-x-2 px-6 overflow-x-auto scrollbar-hide"
                >
                  {getDiasDisponiveisParaOperador().map(day => {
                    const colaboradoresNoDia = getColaboradoresPorDia(
                      day.id,
                    ).length
                    const isActive = selectedDay === day.id

                    return (
                      <button
                        key={day.id}
                        onClick={() => setSelectedDay(day.id)}
                        className={`border-b-2 py-3 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                          ? getTabColor(day.type, true)
                          : `border-transparent text-gray-500 ${getTabColor(
                            day.type,
                            false,
                          )}`
                          }`}
                      >
                        {day.label} ({colaboradoresNoDia})
                      </button>
                    )
                  })}
                </nav>

                {/* Botão de navegação direita */}
                <button
                  onClick={scrollToRight}
                  className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-white border-l border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors duration-200"
                >
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

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


              <div className="overflow-x-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                      {/* Nome - sempre visível */}
                      <TableHead className={`text-left text-xs font-semibold uppercase tracking-wider ${isMobileTable ? 'px-2 py-2' : 'px-6 py-4'}`}>
                        <div className="flex items-center justify-between">
                          <span>Nome</span>
                          <ExcelColumnFilter
                            values={columnUniqueValues.nome}
                            selectedValues={columnFilters.nome}
                            onSelectionChange={values =>
                              handleColumnFilterChange('nome', values)
                            }
                            onSortTable={direction =>
                              handleColumnSort('name', direction)
                            }
                            columnTitle="Nome"
                            isActive={columnFilters.nome.length > 0}
                          />
                        </div>
                      </TableHead>
                      
                      {/* CPF - esconder em mobile */}
                      {!isMobileTable && (
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                          <div className="flex items-center justify-between">
                            <span>CPF</span>
                            <ExcelColumnFilter
                              values={columnUniqueValues.cpf}
                              selectedValues={columnFilters.cpf}
                              onSelectionChange={values =>
                                handleColumnFilterChange('cpf', values)
                              }
                              onSortTable={direction =>
                                handleColumnSort('cpf', direction)
                              }
                              columnTitle="CPF"
                              isActive={columnFilters.cpf.length > 0}
                            />
                          </div>
                        </TableHead>
                      )}
                      
                      {/* Função - esconder em mobile */}
                      {!isMobileTable && (
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
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
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
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
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
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
                      <TableHead className={`text-left text-xs font-semibold uppercase tracking-wider sticky right-0 bg-white border-l border-gray-200 ${isMobileTable ? 'px-2 py-2' : 'px-6 py-4'}`} style={{ zIndex: 10 }}>
                        Ação
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-100 text-gray-600">
                    {finalData.total === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isMobileTable ? 2 : 6}
                          className="px-6 py-16 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-semibold text-gray-700 mb-2">
                              {selectedDay
                                ? `Nenhum colaborador encontrado para ${selectedDay}`
                                : 'Nenhum colaborador encontrado'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {selectedDay
                                ? 'Adicione colaboradores com dias de trabalho definidos ou ajuste os filtros'
                                : 'Tente ajustar os filtros ou adicionar novos colaboradores'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      finalData.data.map(
                        (colab: EventParticipant, index: number) => {
                          const botaoTipo = getBotaoAcao(colab)

                          return (
                            <TableRow
                              key={index}
                              className={`hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 cursor-pointer transition-all duration-200 ${selectedDay &&
                                colab.daysWork &&
                                colab.daysWork.includes(
                                  selectedDay.includes('_')
                                    ? selectedDay.split('_')[1]
                                    : selectedDay,
                                )
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500'
                                : ''
                                }`}
                              onClick={() => abrirPopup(colab)}
                            >
                              {/* Nome - sempre visível */}
                              <TableCell className={`whitespace-nowrap text-gray-600 ${isMobileTable ? 'px-2 py-3' : 'px-6 py-4'}`}>
                                <div className="flex items-center">
                                  <div className={isMobileTable ? '' : 'ml-4'}>
                                    <div className="text-sm font-semibold text-gray-900">
                                      {colab.name}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              
                              {/* CPF - esconder em mobile */}
                              {!isMobileTable && (
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                  <p className="text-gray-600">
                                    {formatCPF(colab.cpf?.trim() || '')}
                                  </p>
                                </TableCell>
                              )}
                              
                              {/* Função - esconder em mobile */}
                              {!isMobileTable && (
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <p className="text-gray-600">{colab.role}</p>
                                </TableCell>
                              )}
                              
                              {/* Empresa - esconder em mobile */}
                              {!isMobileTable && (
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {colab.company}
                                  </span>
                                </TableCell>
                              )}
                              
                              {/* Credencial - esconder em mobile */}
                              {!isMobileTable && (
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {getCredencial(colab)}
                                  </span>
                                </TableCell>
                              )}
                              
                              {/* Ação - sempre visível e sticky à direita */}
                              <TableCell className={`whitespace-nowrap text-sm font-medium sticky right-0 bg-white border-l border-gray-100 ${isMobileTable ? 'px-2 py-3' : 'px-6 py-4'}`} style={{ zIndex: 5 }}>
                                <div
                                  className="flex space-x-2"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {botaoTipo === 'checkin' && (
                                    <Button
                                      onClick={() => abrirCheckin(colab)}
                                      size="sm"
                                      className={`bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 ${
                                        isMobileTable ? 'text-xs px-1.5 py-1' : ''
                                      }`}
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
                                      className={`bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 ${
                                        isMobileTable ? 'text-xs px-1.5 py-1' : ''
                                      }`}
                                      disabled={loading}
                                    >
                                      <Clock className={`${isMobileTable ? 'w-3 h-3 mr-0.5' : 'w-4 h-4 mr-1'}`} />
                                      {isMobileTable ? 'Out' : 'Check-out'}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        },
                      )
                    )}
                  </TableBody>
                </Table>
              </div>



            </div>
          </div>

          {/* MODAL DETALHES DO COLABORADOR */}
          <Dialog open={modalAberto} onOpenChange={setModalAberto}>
            <DialogContent className="max-w-md bg-white border-0 shadow-xl">
              <DialogHeader className="pb-4">
                <DialogTitle className="flex items-center gap-3 text-lg font-bold text-gray-900">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  Detalhes do Staff
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
                    <div className="grid grid-cols-3 gap-3 text-sm">
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
                        <p className="text-gray-900">
                          {getCredencial(selectedParticipant)}
                        </p>
                      </div>
                    </div>

                    {/* Status de presença atual */}
                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 uppercase mb-2">
                        Status Hoje
                      </p>
                      {(() => {
                        const status = participantsAttendanceStatus.get(
                          selectedParticipant.id,
                        )
                        if (!status) {
                          return (
                            <span className="text-blue-600">
                              Não verificado
                            </span>
                          )
                        } else if (status.checkIn && !status.checkOut) {
                          return (
                            <span className="text-green-600">
                              ✓ Check-in realizado
                            </span>
                          )
                        } else if (status.checkIn && status.checkOut) {
                          return (
                            <span className="text-gray-600">
                              ✓ Check-out realizado
                            </span>
                          )
                        } else {
                          return (
                            <span className="text-orange-600">Pendente</span>
                          )
                        }
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
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
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
            <DialogContent className="max-w-md bg-gradient-to-br from-white to-green-50 border-0 shadow-2xl">
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
                    <p className="text-sm text-gray-600 mt-1">
                      Tipo de Credencial: {getCredencial(participantAction)}
                    </p>
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
            <DialogContent className="max-w-md bg-gradient-to-br from-white to-red-50 border-0 shadow-2xl">
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
                    <p className="text-sm text-gray-600 mt-1">
                      Tipo de Credencial: {getCredencial(participantAction)}
                    </p>
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

          {/* MODAL ADICIONAR NOVO STAFF */}
          <Dialog open={popupNovoStaff} onOpenChange={setPopupNovoStaff}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-purple-50 border-0 shadow-2xl">
              <DialogHeader className="pb-6">
                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  Adicionar Novo Staff
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Preencha os dados do novo Staff
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-600">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-gray-600">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Nome completo *
                    </label>
                    <Input
                      type="text"
                      value={novoStaff.name}
                      onChange={e =>
                        setNovoStaff({
                          ...novoStaff,
                          name: capitalizeWords(e.target.value),
                        })
                      }
                      placeholder="Digite o nome completo"
                      disabled={loading || !operadorLogado}
                      className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-gray-600">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      CPF *
                    </label>
                    <Input
                      type="text"
                      value={novoStaff.cpf}
                      onChange={e =>
                        setNovoStaff({
                          ...novoStaff,
                          cpf: formatCPF(e.target.value),
                        })
                      }
                      placeholder="000.000.000-00"
                      disabled={loading || !operadorLogado}
                      className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Função *
                    </label>
                    <Input
                      type="text"
                      value={novoStaff.funcao}
                      onChange={e =>
                        setNovoStaff({
                          ...novoStaff,
                          funcao: capitalizeWords(e.target.value),
                        })
                      }
                      placeholder="Digite a função"
                      disabled={loading || !operadorLogado}
                      className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Empresa *
                    </label>
                    <Input
                      type="text"
                      value={novoStaff.empresa}
                      onChange={e =>
                        setNovoStaff({
                          ...novoStaff,
                          empresa: capitalizeWords(e.target.value),
                        })
                      }
                      placeholder="Digite a empresa"
                      disabled={loading || !operadorLogado}
                      className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Tipo de Credencial *
                  </label>
                  <Select
                    value={novoStaff.tipo_credencial || ''}
                    onValueChange={value =>
                      setNovoStaff({
                        ...novoStaff,
                        tipo_credencial: value.toUpperCase(),
                      })
                    }
                    disabled={
                      tiposCredencialUnicosFiltrados.length === 0 ||
                      loading ||
                      !operadorLogado
                    }
                  >
                    <SelectTrigger className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                      <SelectValue placeholder="Selecione o tipo de credencial" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposCredencialUnicosFiltrados.map((tipo, idx) => {
                        return (
                          <SelectItem key={idx} value={tipo}>
                            {tipo}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Dias de Trabalho
                  </label>
                  {hasDefinedPeriods() ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                        <strong>
                          Selecione as datas disponíveis para o evento:
                        </strong>
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Evento */}
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-2">
                            Evento
                          </p>
                          <div className="flex flex-col gap-2">
                            {getAvailableDates('preparacao').map(date => (
                              <Button
                                key={date}
                                type="button"
                                variant={
                                  novoStaff.daysWork.includes(date)
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() => toggleDateSelection(date)}
                                disabled={loading || !operadorLogado}
                                className={`text-xs transition-all duration-200 ${novoStaff.daysWork.includes(date)
                                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm'
                                  }`}
                              >
                                {date}
                              </Button>
                            ))}
                          </div>
                        </div>
                        {/* Montagem */}
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-2">
                            Montagem
                          </p>
                          <div className="flex flex-col gap-2">
                            {getAvailableDates('montagem').map(date => (
                              <Button
                                key={date}
                                type="button"
                                variant={
                                  novoStaff.daysWork.includes(date)
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() => toggleDateSelection(date)}
                                disabled={loading || !operadorLogado}
                                className={`text-xs transition-all duration-200 ${novoStaff.daysWork.includes(date)
                                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm'
                                  }`}
                              >
                                {date}
                              </Button>
                            ))}
                          </div>
                        </div>
                        {/* Finalização */}
                        <div>
                          <p className="text-xs font-semibold text-purple-700 mb-2">
                            Finalização
                          </p>
                          <div className="flex flex-col gap-2">
                            {getAvailableDates('finalizacao').map(date => (
                              <Button
                                key={date}
                                type="button"
                                variant={
                                  novoStaff.daysWork.includes(date)
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() => toggleDateSelection(date)}
                                disabled={loading || !operadorLogado}
                                className={`text-xs transition-all duration-200 ${novoStaff.daysWork.includes(date)
                                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm'
                                  }`}
                              >
                                {date}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {novoStaff.daysWork.length > 0 && (
                        <div className="bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-300 rounded-lg p-4">
                          <p className="text-sm text-purple-800 font-medium">
                            <strong>Datas selecionadas:</strong>{' '}
                            {novoStaff.daysWork.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        type="text"
                        value={novoStaff.daysWork.join(', ')}
                        onChange={e =>
                          setNovoStaff({
                            ...novoStaff,
                            daysWork: validateAndProcessDaysWork(
                              e.target.value,
                            ),
                          })
                        }
                        placeholder="Datas de trabalho (formato: DD/MM/AAAA, separadas por vírgula)"
                        disabled={loading || !operadorLogado}
                        className="bg-white border-blue-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                      <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                        <strong>Períodos permitidos:</strong>{' '}
                        {getPermittedDatesInfo()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Cadastrado por
                  </label>
                  <Input
                    type="text"
                    value={novoStaff.cadastrado_por}
                    readOnly
                    className="bg-gray-200 text-gray-600 cursor-not-allowed border-gray-300"
                    disabled
                  />
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 font-medium">
                    <strong>Atenção:</strong> Todos os campos marcados com * são
                    obrigatórios
                  </p>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    onClick={() => {
                      setPopupNovoStaff(false)
                      setNovoStaff({
                        name: '',
                        cpf: '',
                        funcao: '',
                        empresa: '',
                        tipo_credencial: '',
                        cadastrado_por: '',
                        daysWork: [],
                      })
                    }}
                    variant="outline"
                    className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={adicionarNovoStaff}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    disabled={loading || !operadorLogado}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Staff
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* DIALOG FILTRO AVANÇADO */}
          <Dialog
            open={filtroAvancadoOpen}
            onOpenChange={setFiltroAvancadoOpen}
          >
            <DialogContent className="max-w-lg bg-gradient-to-br from-white to-purple-50 border-0 shadow-2xl">
              <DialogHeader className="pb-6">
                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  Filtros Avançados
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Configure filtros personalizados para a busca
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Nome
                    </label>
                    <Input
                      placeholder="Filtrar por nome"
                      value={filtroAvancado.name || ''}
                      onChange={e =>
                        setFiltroAvancado({
                          ...filtroAvancado,
                          name: e.target.value,
                        })
                      }
                      className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      CPF
                    </label>
                    <Input
                      placeholder="Filtrar por CPF"
                      value={filtroAvancado.cpf || ''}
                      onChange={e =>
                        setFiltroAvancado({
                          ...filtroAvancado,
                          cpf: e.target.value,
                        })
                      }
                      className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Função
                    </label>
                    <Input
                      placeholder="Filtrar por função"
                      value={filtroAvancado.role || ''}
                      onChange={e =>
                        setFiltroAvancado({
                          ...filtroAvancado,
                          role: e.target.value,
                        })
                      }
                      list="funcoes"
                      className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                    <datalist id="funcoes">
                      {funcoesUnicasFiltradas.map(funcao => (
                        <option key={funcao} value={funcao} />
                      ))}
                    </datalist>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Empresa
                    </label>
                    <Input
                      placeholder="Filtrar por empresa"
                      value={filtroAvancado.company || ''}
                      onChange={e =>
                        setFiltroAvancado({
                          ...filtroAvancado,
                          company: e.target.value,
                        })
                      }
                      list="empresas"
                      className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                    <datalist id="empresas">
                      {empresasUnicasFiltradas.map(empresa => (
                        <option key={empresa} value={empresa} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Tipo de Credencial
                  </label>
                  <Input
                    placeholder="Filtrar por tipo de credencial"
                    value={filtroAvancado.wristbandId || ''}
                    onChange={e =>
                      setFiltroAvancado({
                        ...filtroAvancado,
                        wristbandId: e.target.value,
                      })
                    }
                    className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                {/* Ordenação */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Ordenação
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ordenacao-ativa"
                        checked={ordenacao.campo !== ''}
                        onChange={e => {
                          if (e.target.checked) {
                            setOrdenacao({ campo: 'name', direcao: 'asc' })
                          } else {
                            setOrdenacao({ campo: '', direcao: 'asc' })
                          }
                        }}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <label
                        htmlFor="ordenacao-ativa"
                        className="text-sm font-medium text-gray-700"
                      >
                        Ativar ordenação
                      </label>
                    </div>
                  </div>

                  {ordenacao.campo !== '' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Campo
                        </label>
                        <Select
                          value={ordenacao.campo}
                          onValueChange={campo =>
                            setOrdenacao({ ...ordenacao, campo })
                          }
                        >
                          <SelectTrigger className="bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                            <SelectValue placeholder="Campo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Nome</SelectItem>
                            <SelectItem value="cpf">CPF</SelectItem>
                            <SelectItem value="role">Função</SelectItem>
                            <SelectItem value="company">Empresa</SelectItem>
                            <SelectItem value="wristbandId">
                              Credencial
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Direção
                        </label>
                        <Select
                          value={ordenacao.direcao}
                          onValueChange={direcao =>
                            setOrdenacao({
                              ...ordenacao,
                              direcao: direcao as 'asc' | 'desc',
                            })
                          }
                        >
                          <SelectTrigger className="bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                            <SelectValue placeholder="Direção" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">A-Z</SelectItem>
                            <SelectItem value="desc">Z-A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFiltroAvancado({})
                      setOrdenacao({ campo: '', direcao: 'asc' })
                      clearColumnFilters()
                    }}
                    className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
                  >
                    Limpar Filtros
                    {countFiltrosAtivos() > 0 && (
                      <span className="ml-2 bg-red-100 text-red-800 text-xs rounded-full px-2 py-0.5 font-medium">
                        {countFiltrosAtivos()}
                      </span>
                    )}
                  </Button>
                  <Button
                    onClick={() => setFiltroAvancadoOpen(false)}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Aplicar Filtros
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
            <DialogContent className="sm:max-w-lg bg-white text-gray-900">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Trocar Credencial
                </DialogTitle>
                <DialogDescription>
                  Busque e selecione um participante para trocar a credencial
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Campo de busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Busque por nome ou CPF..."
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
                        onClick={() => {
                          if (!hasCheckIn) {
                            toast.error(
                              'Participante precisa ter check-in para trocar pulseira',
                            )
                            return
                          }
                          setSelectedParticipantForPulseira(participant)
                          openWristbandModal({
                            participant,
                            eventId,
                            onSuccess: () => {
                              setSelectedParticipantForPulseira(null)
                              closeWristbandModal()
                            },
                          })
                          setPopupTrocaPulseira(false)
                        }}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${hasCheckIn
                          ? 'border-gray-200 hover:bg-gray-50'
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
                              {participant.cpf}
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
                    <strong>Nota:</strong> Apenas participantes com check-in
                    podem ter suas pulseiras trocadas.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal de Troca de Pulseira Lazy-Loaded */}
          <WristbandModalComponent
            participant={selectedParticipantForPulseira}
            eventId={eventId}
            onSuccess={() => {
              setSelectedParticipantForPulseira(null)
              closeWristbandModal()
              // Recarregar dados se necessário
            }}
          />
        </>
      )}
    </div>
  )
}
