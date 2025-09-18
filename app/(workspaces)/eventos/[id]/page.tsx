/* eslint-disable @typescript-eslint/prefer-as-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { changeCredentialCode, getMovementCredentialByParticipant } from '@/features/eventos/actions/movement-credentials'
import { updateParticipantCredential } from '@/features/eventos/actions/update-participant-credential'
import {
    useCheckIn,
    useCheckOut,
    useEditAttendance,
} from '@/features/eventos/api/mutation/use-check-operations'
import { useDeleteEventAttendance } from '@/features/eventos/api/mutation/use-delete-event-attendance'
import { useCreateEventParticipant } from '@/features/eventos/api/mutation/use-create-event-participant'
import { useDeleteEventParticipant } from '@/features/eventos/api/mutation/use-delete-event-participant'
import { useDeleteParticipantFromShift } from '@/features/eventos/api/mutation/use-delete-participant-from-shift'
import { useDeleteParticipantAllShifts } from '@/features/eventos/api/mutation/use-delete-participant-all-shifts'
import { useUpdateEventParticipant } from '@/features/eventos/api/mutation/use-update-event-participant'
import { useUpdateEmpresa } from '@/features/eventos/api/mutation/use-update-empresa'
import { useCreateEmpresa } from '@/features/eventos/api/mutation/use-create-empresa'
import { useCreateCredential, useUpdateCredential } from '@/features/eventos/api/mutation/use-credential-mutations'
import { useCoordenadoresByEvent } from '@/features/eventos/api/query/use-coordenadores-by-event'
import { useEmpresasByEvent } from '@/features/eventos/api/query/use-empresas'
import { useEventAttendanceByEventAndDate } from '@/features/eventos/api/query/use-event-attendance'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useEventParticipantsGrouped } from '@/features/eventos/api/query/use-event-participants-grouped'
import { useEventParticipantsByShift } from '@/features/eventos/api/query/use-event-participants-by-shift'
import { useEventVehiclesByEvent } from '@/features/eventos/api/query/use-event-vehicles-by-event'
// TODO: Substituir por useEventById para melhor performance
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { EventParticipant } from '@/features/eventos/types'
import { useQueryClient } from '@tanstack/react-query'
import {
    Check,
    ChevronDown,
    Clock,
    Download,
    Filter,
    Loader2,
    Plus,
    RotateCcw,
    Search,
    Settings,
    Trash2,
    TrendingUp,
    User,
    UserCog,
    Users,
    X,
    Sun,
    Moon,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import EventLayout from '@/components/dashboard/dashboard-layout'
import ModalAdicionarStaff from '@/components/operador/modalAdicionarStaff'
import ModalEditarStaff from '@/components/operador/modalEditarStaff'
import OptimizedFilters from '@/components/optimized-filters/OptimizedFilters'
import VirtualizedParticipantsTable from '@/components/virtualized-table/VirtualizedParticipantsTable'
import { useCredentials } from '@/features/eventos/api/query'
import { useOptimizedFilters } from '@/hooks/use-optimized-filters'
import '@/styles/virtualized-table.css'
import { formatEventDate } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

export default function EventoDetalhesPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()

    // Estados básicos que são usados em hooks
    const [selectedDay, setSelectedDay] = useState<string>('')
    const [viewMode, setViewMode] = useState<'grouped' | 'shift'>('shift')

    // Queries React Query
    const { data: participantsData = [], isLoading: participantsLoading } =
        useEventParticipantsByEvent({ eventId: String(params.id) })

    // Nova query para participantes agrupados
    const { data: groupedParticipantsData = [], isLoading: groupedParticipantsLoading } =
        useEventParticipantsGrouped({ eventId: String(params.id) })

    // Query para participantes por turno específico
    const { data: shiftParticipantsData = [], isLoading: shiftParticipantsLoading } =
        useEventParticipantsByShift({
            eventId: String(params.id),
            shiftId: selectedDay,
        })

    const { mutate: createParticipant, isPending: isCreating } =
        useCreateEventParticipant()
    const { mutate: deleteParticipant, isPending: isDeleting } =
        useDeleteEventParticipant()
    const { mutate: deleteFromShift, isPending: isDeletingFromShift } =
        useDeleteParticipantFromShift()
    const { mutate: deleteAllShifts, isPending: isDeletingAllShifts } =
        useDeleteParticipantAllShifts()
    const { data: credentials } = useCredentials({ eventId: String(params.id) })
    // Hooks para dados adicionais (otimização: só carregam quando necessário)
    const { data: coordenadores = [], isLoading: coordenadoresLoading } =
        useCoordenadoresByEvent({
            eventId: String(params.id),
        })
    const { data: vagas = [], isLoading: vagasLoading } = useEventVehiclesByEvent(
        {
            eventId: String(params.id),
        },
    )
    const { data: empresas = [], isLoading: empresasLoading } =
        useEmpresasByEvent(String(params.id))
    const { mutate: updateParticipant } = useUpdateEventParticipant()
    const { mutate: updateEmpresa } = useUpdateEmpresa()
    const { mutate: createEmpresa } = useCreateEmpresa()
    const { mutate: createCredential } = useCreateCredential()
    const { mutate: updateCredential } = useUpdateCredential()
    const checkInMutation = useCheckIn()
    const checkOutMutation = useCheckOut()
    const deleteAttendanceMutation = useDeleteEventAttendance()
    const editAttendanceMutation = useEditAttendance()

    const [deletingParticipant, setDeletingParticipant] =
        useState<EventParticipant | null>(null)
    const [deletingParticipantHash, setDeletingParticipantHash] =
        useState<string | null>(null)
    const [deleteMode, setDeleteMode] =
        useState<'shift' | 'all'>('shift')
    const [replicatingStaff, setReplicatingStaff] = useState<string | null>(null)
    const [showReplicateDialog, setShowReplicateDialog] = useState(false)
    const [replicateSourceDay, setReplicateSourceDay] = useState<string>('')
    const [showProgressDialog, setShowProgressDialog] = useState(false)
    const [progressData, setProgressData] = useState<{
        total: number
        current: number
        processed: number
        currentParticipant: string
        estimatedTimeRemaining: number
        startTime: number
        currentBatch: number
        totalBatches: number
        operationsPerMinute: number
    }>({
        total: 0,
        current: 0,
        processed: 0,
        currentParticipant: '',
        estimatedTimeRemaining: 0,
        startTime: 0,
        currentBatch: 0,
        totalBatches: 0,
        operationsPerMinute: 0
    })

    // Estados para o sistema de replicação em etapas
    const [showStepReplicationModal, setShowStepReplicationModal] = useState(false)
    const [currentReplicationStep, setCurrentReplicationStep] = useState(1)
    const [replicationData, setReplicationData] = useState<{
        sourceDay: string
        targetDay: string
        sourceParticipants: EventParticipant[]
        targetParticipants: EventParticipant[]
        participantsToReplicate: EventParticipant[]
        companiesAnalysis: {
            existing: string[]
            missing: string[]
            needingCreation: string[]
        }
        credentialsAnalysis: {
            existing: string[]
            missing: string[]
            needingCreation: string[]
        }
        processingSummary: {
            companiesProcessed: number
            credentialsProcessed: number
            participantsProcessed: number
        }
        rateLimiting: {
            operationsCount: number
            windowStart: number
            estimatedTime: number
        }
    }>({
        sourceDay: '',
        targetDay: '',
        sourceParticipants: [],
        targetParticipants: [],
        participantsToReplicate: [],
        companiesAnalysis: {
            existing: [],
            missing: [],
            needingCreation: []
        },
        credentialsAnalysis: {
            existing: [],
            missing: [],
            needingCreation: []
        },
        processingSummary: {
            companiesProcessed: 0,
            credentialsProcessed: 0,
            participantsProcessed: 0
        },
        rateLimiting: {
            operationsCount: 0,
            windowStart: Date.now(),
            estimatedTime: 0
        }
    })

    // Rate limiting para Supabase (100 ops/min)
    const [rateLimitState, setRateLimitState] = useState({
        operationsCount: 0,
        windowStart: Date.now(),
        isThrottled: false
    })
    const [isProcessingStep, setIsProcessingStep] = useState(false)

    // Rate limiting utilities para Supabase (100 operações por minuto)
    const SUPABASE_RATE_LIMIT = 100 // ops por minuto
    const RATE_LIMIT_WINDOW = 60000 // 1 minuto em ms
    const SAFE_MARGIN = 0.8 // 80% do limite para segurança
    const MAX_SAFE_OPS_PER_MINUTE = Math.floor(SUPABASE_RATE_LIMIT * SAFE_MARGIN)

    // Função para calcular delay dinâmico baseado no rate limiting
    const calculateDynamicDelay = useCallback((operationsRemaining: number): number => {
        const now = Date.now()
        const timeInWindow = now - rateLimitState.windowStart
        const windowRemaining = RATE_LIMIT_WINDOW - timeInWindow

        // Se passou mais de 1 minuto, resetar contador
        if (timeInWindow >= RATE_LIMIT_WINDOW) {
            setRateLimitState({
                operationsCount: 1,
                windowStart: now,
                isThrottled: false
            })
            return 100 // delay mínimo
        }

        // Se estamos próximos do limite, calcular delay necessário
        if (rateLimitState.operationsCount >= MAX_SAFE_OPS_PER_MINUTE) {
            setRateLimitState(prev => ({ ...prev, isThrottled: true }))
            return windowRemaining + 1000 // Esperar até o final da janela + buffer
        }

        // Calcular delay ótimo para distribuir operações uniformemente
        const optimalDelay = Math.max(
            100, // delay mínimo
            Math.floor(windowRemaining / operationsRemaining)
        )

        return Math.min(optimalDelay, 2000) // delay máximo de 2s
    }, [rateLimitState])

    // Função para aguardar respeitando rate limit
    const waitForRateLimit = useCallback(async (operationsRemaining: number = 1) => {
        const delay = calculateDynamicDelay(operationsRemaining)

        // Incrementar contador de operações
        setRateLimitState(prev => ({
            ...prev,
            operationsCount: prev.operationsCount + 1
        }))

        if (delay > 2000) {
            console.log(`⏸️ Rate limit atingido, aguardando ${Math.round(delay / 1000)}s...`)
        }

        await new Promise(resolve => setTimeout(resolve, delay))
    }, [calculateDynamicDelay])

    // Sistema de batching inteligente
    const BATCH_SIZE = 10

    // Função para processar operações em lotes
    const processBatch = useCallback(
        async <T extends { name?: string }>(
            items: T[],
            processor: (item: T, index: number) => Promise<boolean>,
            onProgress?: (processed: number, total: number, current: string) => void
        ): Promise<{ success: number; errors: number }> => {
            let successCount = 0
            let errorCount = 0

            for (let i = 0; i < items.length; i++) {
                try {
                    const success = await processor(items[i], i)
                    if (success) successCount++
                    else errorCount++

                    if (onProgress && typeof items[i] === 'object' && items[i] && 'name' in (items[i] as any)) {
                        onProgress(i + 1, items.length, String((items[i] as any).name))
                    }

                    await waitForRateLimit(items.length - i - 1)
                } catch (error) {
                    errorCount++
                }
            }

            return { success: successCount, errors: errorCount }
        }, [waitForRateLimit])

    // Função para estimar tempo total de operação
    const estimateOperationTime = useCallback((totalOperations: number): number => {
        const opsPerMinute = MAX_SAFE_OPS_PER_MINUTE
        const minutes = Math.ceil(totalOperations / opsPerMinute)
        return minutes * 60000 // retorna em ms
    }, [])

    // Função para calcular tempo restante dinamicamente
    const calculateTimeRemaining = useCallback((processed: number, total: number, startTime: number): number => {
        if (processed === 0) return 0

        const elapsed = Date.now() - startTime
        const rate = processed / elapsed // items per ms
        const remaining = total - processed

        return remaining / rate // ms restantes
    }, [])

    // Função para formatar tempo em formato legível
    const formatTime = useCallback((ms: number): string => {
        if (ms < 60000) return `${Math.round(ms / 1000)}s`
        if (ms < 3600000) return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
        return `${Math.round(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`
    }, [])

    // Estado para modal de adicionar staff
    const [showAdicionarStaffModal, setShowAdicionarStaffModal] = useState(false)

    // Estado para modal de editar staff
    const [showEditarStaffModal, setShowEditarStaffModal] = useState(false)
    const [participantToEdit, setParticipantToEdit] = useState<EventParticipant | null>(null)

    // Estados para check-in/check-out
    const [participantAction, setParticipantAction] =
        useState<EventParticipant | null>(null)
    const [codigoPulseira, setCodigoPulseira] = useState<string>('')
    const [selectedDateForAction, setSelectedDateForAction] = useState<string>('')
    const [popupCheckin, setPopupCheckin] = useState(false)
    const [popupCheckout, setPopupCheckout] = useState(false)
    const [popupResetCheckin, setPopupResetCheckin] = useState(false)
    const [loading, setLoading] = useState(false)

    // Estados para edição de attendance
    const [isEditingAttendance, setIsEditingAttendance] = useState(false)
    const [currentAttendanceId, setCurrentAttendanceId] = useState<string>('')
    const [editCheckinDate, setEditCheckinDate] = useState<string>('')
    const [editCheckinTime, setEditCheckinTime] = useState<string>('')
    const [editCheckoutDate, setEditCheckoutDate] = useState<string>('')
    const [editCheckoutTime, setEditCheckoutTime] = useState<string>('')

    // Estados para seleção múltipla e edição em massa
    const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
        new Set(),
    )
    const [showBulkEditModal, setShowBulkEditModal] = useState(false)
    const [bulkEditData, setBulkEditData] = useState({
        credentialId: 'no-change',
        role: '',
        company: 'no-change',
    })
    const [bulkEditLoading, setBulkEditLoading] = useState(false)
    const [bulkCredentialPopoverOpen, setBulkCredentialPopoverOpen] = useState(false)
    const [bulkEmpresaPopoverOpen, setBulkEmpresaPopoverOpen] = useState(false)

    // Estados para remoção de duplicados
    const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)
    const [duplicatesLoading, setDuplicatesLoading] = useState(false)

    // Estados para exclusão em massa
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

    // Estados para reset de check-in em massa
    const [showBulkResetModal, setShowBulkResetModal] = useState(false)
    const [bulkResetLoading, setBulkResetLoading] = useState(false)

    // Estado para controle de refresh da tabela
    const [isRefreshingTable, setIsRefreshingTable] = useState(false)

    // Estados para gerenciamento de duplicatas do turno atual
    const [showDuplicatesManagerModal, setShowDuplicatesManagerModal] = useState(false)
    const [duplicatesManagerLoading, setDuplicatesManagerLoading] = useState(false)
    const [selectedDuplicatesForRemoval, setSelectedDuplicatesForRemoval] = useState<Set<string>>(new Set())

    // Estados para progresso de criação de empresas e credenciais
    const [companyCreationProgress, setCompanyCreationProgress] = useState<{
        current: number
        total: number
        currentItem: string
        completed: boolean
    }>({
        current: 0,
        total: 0,
        currentItem: '',
        completed: false
    })

    const [credentialCreationProgress, setCredentialCreationProgress] = useState<{
        current: number
        total: number
        currentItem: string
        completed: boolean
    }>({
        current: 0,
        total: 0,
        currentItem: '',
        completed: false
    })

    // Função para converter data para formato da API (dd-mm-yyyy)
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
                // ✅ CORREÇÃO: Usar UTC para evitar problemas de fuso horário
                const day = date.getUTCDate().toString().padStart(2, '0')
                const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
                const year = date.getUTCFullYear().toString()
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

    // Hook para buscar dados de attendance do dia selecionado
    // Este hook busca os dados reais de check-in/check-out do sistema
    const { data: attendanceData = [], isLoading: attendanceLoading } =
        useEventAttendanceByEventAndDate(
            String(params.id),
            formatDateForAPI(selectedDay),
        )

    // Buscar apenas dados necessários do evento (TODO: criar hook específico)
    const { data: eventos, isLoading: eventosLoading } = useEventos() // Temporário - precisa ser otimizado
    const evento = useMemo(() => {
        const foundEvent = Array.isArray(eventos)
            ? eventos.find(e => String(e.id) === String(params.id))
            : undefined

        // Debug detalhado para verificar estrutura dos dados
        if (foundEvent) {
            console.log('🔍 Evento encontrado:', {
                id: foundEvent.id,
                name: foundEvent.name,
                montagem: foundEvent.montagem,
                evento: foundEvent.evento,
                desmontagem: foundEvent.desmontagem,
                montagemType: typeof foundEvent.montagem,
                eventoType: typeof foundEvent.evento,
                desmontagemType: typeof foundEvent.desmontagem
            })

            // Debug específico das fases
            console.log('🔧 Debug das fases do evento:')
            console.log('📦 Montagem raw:', JSON.stringify(foundEvent.montagem, null, 2))
            console.log('🎭 Evento raw:', JSON.stringify(foundEvent.evento, null, 2))
            console.log('🔧 Desmontagem raw:', JSON.stringify(foundEvent.desmontagem, null, 2))
        }

        return foundEvent
    }, [eventos, params.id])

    // Memoizar array de participantes
    const participantsArray = useMemo(() => {
        return Array.isArray(participantsData) ? participantsData : []
    }, [participantsData])

    // Função para normalizar formato de data
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

    // Função helper para parsear dados que podem estar como JSON string
    const parseEventDays = useCallback((data: any): any[] => {
        if (!data) return []

        // Se for string, tentar fazer parse
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data)
                return Array.isArray(parsed) ? parsed : []
            } catch (error) {
                console.error('❌ Erro ao fazer parse de JSON string:', data, error)
                return []
            }
        }

        // Se já for array, retornar como está
        if (Array.isArray(data)) {
            return data
        }

        // Se for objeto, tentar extrair dados
        if (typeof data === 'object' && data !== null) {
            console.warn('⚠️ Dados inesperados para dias do evento:', data)
            return []
        }

        return []
    }, [])

    // Função helper para garantir que os dados sejam arrays válidos
    const ensureArray = useCallback((data: any): any[] => {
        if (!data) return []

        // Se for string, tentar fazer parse
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data)
                return Array.isArray(parsed) ? parsed : []
            } catch (error) {
                console.warn('⚠️ Dados não são JSON válido:', data)
                return []
            }
        }

        // Se já for array, retornar como está
        if (Array.isArray(data)) {
            return data
        }

        // Se for objeto, tentar extrair dados
        if (typeof data === 'object' && data !== null) {
            console.warn('⚠️ Dados inesperados para dias do evento:', data)
            return []
        }

        return []
    }, [])

    // Função para gerar tabs dos dias do evento usando apenas a nova estrutura
    const getEventDays = useCallback((): Array<{
        id: string
        label: string
        date: string
        type: string
        period?: 'diurno' | 'noturno' | 'dia_inteiro'
    }> => {
        console.log('🔧 getEventDays chamada, evento:', evento)

        if (!evento) {
            console.log('❌ Evento não encontrado')
            return []
        }

        const days: Array<{
            id: string
            label: string
            date: string
            type: string
            period?: 'diurno' | 'noturno' | 'dia_inteiro'
        }> = []

        // Função helper para processar cada fase
        const processPhaseData = (phaseData: any[], phaseType: 'montagem' | 'evento' | 'desmontagem', phaseLabel: string) => {
            const data = ensureArray(phaseData)
            console.log(`🔧 Processando ${phaseType}:`, data)

            data.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date)
                        // ✅ CORREÇÃO: Extrair dateISO diretamente da string para evitar problemas de fuso horário
                        const dateISO = day.date.match(/^\d{4}-\d{2}-\d{2}/)
                            ? day.date.split('T')[0]
                            : new Date(day.date + 'T12:00:00').toISOString().split('T')[0]
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'

                        console.log(`✅ Adicionando ${phaseType}: ${dateStr} - ${periodLabel}`)
                        days.push({
                            id: `${dateISO}-${phaseType}-${day.period}`,
                            label: `${dateStr} (${phaseLabel.toUpperCase()} - ${periodLabel})`,
                            date: dateStr,
                            type: phaseType,
                            period: day.period
                        })
                    } catch (error) {
                        console.error(`❌ Erro ao processar data da ${phaseType}:`, day, error)
                    }
                }
            })
        }

        // Processar todas as fases na ordem correta
        processPhaseData(evento.montagem, 'montagem', 'montagem')
        processPhaseData(evento.evento, 'evento', 'evento')
        processPhaseData(evento.desmontagem, 'desmontagem', 'desmontagem')

        // Ordenar por data e período para garantir ordem cronológica
        days.sort((a, b) => {
            // Extrair dateISO do ID para ordenação
            const dateA = a.id.split('-').slice(0, 3).join('-')
            const dateB = b.id.split('-').slice(0, 3).join('-')

            // Primeiro, ordenar por data
            const dateCompare = dateA.localeCompare(dateB)
            if (dateCompare !== 0) return dateCompare

            // Se mesma data, ordenar por período (diurno antes de noturno)
            const periodOrder = { 'diurno': 0, 'dia_inteiro': 1, 'noturno': 2 }
            const periodA = a.period || 'diurno'
            const periodB = b.period || 'diurno'

            return (periodOrder[periodA] || 0) - (periodOrder[periodB] || 0)
        })

        // Debug detalhado para investigar o problema
        console.log('🎯 Dias finais gerados (ordenados):', days)
        console.log('🔍 Debug detalhado por tipo:')
        console.log('📦 Montagem:', days.filter(d => d.type === 'montagem'))
        console.log('🎭 Evento:', days.filter(d => d.type === 'evento'))
        console.log('🔧 Desmontagem:', days.filter(d => d.type === 'desmontagem'))

        // Verificar se há conflitos de data/período
        const conflicts = new Map<string, any[]>()
        days.forEach(day => {
            const key = `${day.date}-${day.period}`
            if (!conflicts.has(key)) {
                conflicts.set(key, [])
            }
            conflicts.get(key)!.push(day)
        })

        conflicts.forEach((dayList, key) => {
            if (dayList.length > 1) {
                console.warn(`⚠️ Conflito detectado para ${key}:`, dayList)
            }
        })

        return days
    }, [evento, ensureArray])

    // Função para extrair informações do shift ID
    const parseShiftId = useCallback((shiftId: string) => {
        // Formato esperado: YYYY-MM-DD-stage-period
        const parts = shiftId.split('-');
        if (parts.length >= 5) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            const stage = parts[3];
            const period = parts[4] as 'diurno' | 'noturno';

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
                period: 'diurno' as 'diurno'
            };
        } catch (error) {
            // Se não conseguir fazer parse da data, retornar valor padrão
            return {
                dateISO: shiftId,
                dateFormatted: shiftId,
                stage: 'unknown',
                period: 'diurno' as 'diurno'
            };
        }
    }, []);

    // Função para obter ícone do período
    const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
        if (period === 'diurno') {
            return <Sun className="h-3 w-3 text-yellow-500" />;
        } else if (period === 'noturno') {
            return <Moon className="h-3 w-3 text-blue-500" />;
        } else if (period === 'dia_inteiro') {
            return <Clock className="h-3 w-3 text-purple-500" />;
        }
        return null;
    }, [])

    // Função para obter a cor da tab baseada no tipo de dia
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'montagem':
                    return 'border-yellow-500 text-yellow-600 bg-yellow-50'
                case 'evento':
                    return 'border-blue-500 text-blue-600 bg-blue-50'
                case 'desmontagem':
                    return 'border-purple-500 text-purple-600 bg-purple-50'
                default:
                    return 'border-purple-500 text-purple-600 bg-purple-50'
            }
        } else {
            switch (type) {
                case 'montagem':
                    return 'hover:text-yellow-700 hover:border-yellow-300'
                case 'evento':
                    return 'hover:text-blue-700 hover:border-blue-300'
                case 'desmontagem':
                    return 'hover:text-purple-700 hover:border-purple-300'
                default:
                    return 'hover:text-gray-700 hover:border-gray-300'
            }
        }
    }, [])

    // Função para verificar se o participante já fez check-in no dia selecionado
    const hasCheckIn = useCallback(
        (participantId: string, date: string): boolean => {
            if (!attendanceData || attendanceData.length === 0) return false

            const normalizedDate = normalizeDate(date)
            return attendanceData.some(attendance => {
                const normalizedAttendanceDate = normalizeDate(attendance.date)
                return (
                    attendance.participantId === participantId &&
                    attendance.checkIn !== null &&
                    normalizedAttendanceDate === normalizedDate
                )
            })
        },
        [attendanceData, normalizeDate],
    )

    // Função para verificar se o participante já fez check-out no dia selecionado
    const hasCheckOut = useCallback(
        (participantId: string, date: string): boolean => {
            if (!attendanceData || attendanceData.length === 0) return false

            const normalizedDate = normalizeDate(date)
            return attendanceData.some(attendance => {
                const normalizedAttendanceDate = normalizeDate(attendance.date)
                return (
                    attendance.participantId === participantId &&
                    attendance.checkOut !== null &&
                    normalizedAttendanceDate === normalizedDate
                )
            })
        },
        [attendanceData, normalizeDate],
    )

    // Função para obter registro de attendance de um participante em uma data específica
    const getAttendanceRecord = useCallback(
        (participantId: string, date: string) => {
            if (!attendanceData || attendanceData.length === 0) return null

            const normalizedDate = normalizeDate(date)
            return attendanceData.find(attendance => {
                const normalizedAttendanceDate = normalizeDate(attendance.date)
                return (
                    attendance.participantId === participantId &&
                    normalizedAttendanceDate === normalizedDate
                )
            })
        },
        [attendanceData, normalizeDate],
    )

    // Memoizar dias do evento para evitar recálculo
    const eventDays = useMemo(() => {
        return getEventDays()
    }, [getEventDays])

    const currentSelectedDay = useMemo(
        () => selectedDay || (eventDays.length > 0 ? eventDays[0].id : ''),
        [selectedDay, eventDays],
    )

    // Sincronizar selectedDay com o primeiro dia disponível se não houver seleção
    React.useEffect(() => {
        if (!selectedDay && eventDays.length > 0) {
            setSelectedDay(eventDays[0].id)
        }
    }, [selectedDay, eventDays])

    // Memoizar participantes do dia baseado no modo de visualização
    const participantesDoDia = useMemo(() => {
        if (viewMode === 'shift') {
            // Modo por turno: usar dados específicos do turno
            return shiftParticipantsData
        } else {
            // Modo agrupado: expandir participantes agrupados para o turno atual
            const expandedParticipants: EventParticipant[] = []

            groupedParticipantsData.forEach(group => {
                // Encontrar o participante do turno atual
                const currentShiftParticipant = group.shifts.find(shift => (shift as any).shiftId === currentSelectedDay)

                if (currentShiftParticipant) {
                    expandedParticipants.push(currentShiftParticipant)
                } else {
                    // Fallback: verificar compatibilidade com daysWork (retrocompatibilidade)
                    const participant = group.participant
                    if (participant.daysWork && participant.daysWork.length > 0) {
                        const hasDay = participant.daysWork.some(workDay => {
                            if (workDay === currentSelectedDay) {
                                return true;
                            }
                            // Compatibilidade: comparar datas extraídas
                            const { dateFormatted } = parseShiftId(currentSelectedDay);
                            const normalizedDia = normalizeDate(dateFormatted);
                            const normalizedWorkDay = normalizeDate(workDay);
                            return normalizedWorkDay === normalizedDia;
                        })

                        if (hasDay) {
                            expandedParticipants.push(participant)
                        }
                    }
                }
            })

            return expandedParticipants
        }
    }, [viewMode, shiftParticipantsData, groupedParticipantsData, currentSelectedDay, normalizeDate, parseShiftId])

    // ✅ OTIMIZAÇÃO DE PERFORMANCE: Cache inteligente de contagens
    // Calcula uma vez para todos os turnos e reutiliza nas tabs
    // Evita re-renderização desnecessária ao trocar de dia
    const participantsCountCache = useMemo(() => {
        const cache = new Map<string, number>();

        // Para cada turno, usar APENAS o shiftId exato (sem compatibilidade com daysWork)
        eventDays.forEach(day => {
            // Buscar participantes específicos deste turno usando shiftId exato
            const participantsForShift = participantsArray.filter(participant => {
                // APENAS verificar se o participante tem este shiftId específico
                return participant.shiftId === day.id;
            });

            cache.set(day.id, participantsForShift.length);
        });

        return cache;
    }, [participantsArray, eventDays, parseShiftId, normalizeDate]);

    // Função otimizada que usa cache - não recalcula
    const getParticipantsCountByShift = useCallback(
        (shiftId: string): number => {
            return participantsCountCache.get(shiftId) || 0;
        },
        [participantsCountCache],
    )

    // Credentials array
    const credentialsArray = Array.isArray(credentials) ? credentials : []
    const empresasArray = useMemo(() => Array.isArray(empresas) ? empresas : [], [empresas])

    // Função para filtrar empresas por dia selecionado (similar à lógica do empresas page)
    const getEmpresasPorDia = useCallback((shiftId: string) => {
        if (!shiftId || !empresasArray.length) return empresasArray

        // Extrair a data do shift ID
        const { dateISO } = parseShiftId(shiftId)

        return empresasArray.filter((empresa) => {
            if (!Array.isArray(empresa.days)) return false

            // Verificar se a empresa trabalha no dia selecionado
            return empresa.days.includes(dateISO)
        })
    }, [empresasArray, parseShiftId])

    // Empresas filtradas por dia
    const empresasDoDia = useMemo(() => {
        return getEmpresasPorDia(currentSelectedDay)
    }, [getEmpresasPorDia, currentSelectedDay])

    // Hook otimizado para filtros - apenas recalcula quando o dia muda
    const {
        filters,
        popoverStates,
        dayStats,
        uniqueEmpresas,
        uniqueFuncoes,
        uniqueCredenciais,
        filteredParticipants,
        hasActiveFilters,
        updateFilter,
        clearFilters,
        setPopoverState,
        isFilteringInProgress,
    } = useOptimizedFilters({
        participants: participantesDoDia,
        currentSelectedDay,
        hasCheckIn,
        hasCheckOut,
        credentialsArray,
    })

    // ✅ CORRIGIDO: Mostrar todas as empresas dos participantes do turno, não apenas as agendadas para o dia
    const uniqueEmpresasFiltered = useMemo(() => {
        // Extrair empresas únicas dos participantes do turno atual
        const empresasDoTurno = new Set<string>()

        participantesDoDia.forEach(participant => {
            if (participant.company && participant.company.trim()) {
                empresasDoTurno.add(participant.company.trim())
            }
        })

        return Array.from(empresasDoTurno).sort()
    }, [participantesDoDia])

    // KPIs otimizados - apenas recalcula quando participantes do dia ou stats mudam
    const kpiStats = useMemo(() => {
        const totalParticipants = participantesDoDia.length
        const participantsWithWristbands = participantesDoDia.filter(
            p => p.wristbandId,
        ).length
        const participantsWithoutWristbands =
            totalParticipants - participantsWithWristbands

        // Calcular check-ins e check-outs baseado nos dados reais de attendance
        const checkedInParticipants = dayStats.statusCounts.checkedIn
        const checkedOutParticipants = dayStats.statusCounts.checkedOut
        const activeParticipants = checkedInParticipants - checkedOutParticipants

        return {
            totalParticipants,
            participantsWithWristbands,
            participantsWithoutWristbands,
            checkedInParticipants,
            checkedOutParticipants,
            activeParticipants,
        }
    }, [participantesDoDia.length, dayStats.statusCounts]) // Otimizado: só deps essenciais

    // Memoizar estatísticas por credencial para evitar recálculo
    const credentialStats = useMemo(() => {
        const stats: Record<
            string,
            {
                total: number
                checkedIn: number
                credentialName: string
                color: string
            }
        > = {}

        dayStats.credentialsStats.forEach((credentialData, credentialId) => {
            stats[credentialId] = {
                total: credentialData.total,
                checkedIn: credentialData.checkedIn,
                credentialName: credentialData.name,
                color: credentialData.color,
            }
        })

        return stats
    }, [dayStats.credentialsStats])

    // Função para detectar participantes duplicados
    const findDuplicates = useCallback(() => {
        const duplicates: Array<{
            cpf: string
            participants: EventParticipant[]
            reason: string
        }> = []

        // Agrupar por CPF
        const participantsByCpf = participantsArray.reduce((acc, participant) => {
            if (participant.cpf) {
                const cpf = participant.cpf.replace(/\D/g, '') // Remove formatação
                if (!acc[cpf]) {
                    acc[cpf] = []
                }
                acc[cpf].push(participant)
            }
            return acc
        }, {} as Record<string, EventParticipant[]>)

        // Encontrar duplicados por CPF
        Object.entries(participantsByCpf).forEach(([cpf, participants]) => {
            if (participants.length > 1) {
                duplicates.push({
                    cpf,
                    participants,
                    reason: 'CPF duplicado',
                })
            }
        })

        return duplicates
    }, [participantsArray])

    // Memoizar duplicados para evitar recálculo custoso (todos os participantes)
    const duplicates = useMemo(() => {
        const dups: Array<{
            cpf: string
            participants: EventParticipant[]
            reason: string
        }> = []

        // Agrupar por CPF
        const participantsByCpf = participantsArray.reduce((acc, participant) => {
            if (participant.cpf) {
                const cpf = participant.cpf.replace(/\D/g, '') // Remove formatacão
                if (!acc[cpf]) {
                    acc[cpf] = []
                }
                acc[cpf].push(participant)
            }
            return acc
        }, {} as Record<string, EventParticipant[]>)

        // Encontrar duplicados por CPF
        Object.entries(participantsByCpf).forEach(([cpf, participants]) => {
            if (participants.length > 1) {
                dups.push({
                    cpf,
                    participants,
                    reason: 'CPF duplicado',
                })
            }
        })

        return dups
    }, [participantsArray])

    // Função para normalizar CPF para comparação (remove formatação)
    const normalizeCpf = useCallback((cpf: string): string => {
        if (!cpf) return ''
        return cpf.replace(/\D/g, '') // Remove tudo que não for dígito
    }, [])

    // Função para normalizar nome para comparação (minúscula, sem acentos, sem espaços extras)
    const normalizeName = useCallback((name: string): string => {
        if (!name) return ''
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/\s+/g, ' ') // Remove espaços extras
            .trim()
    }, [])

    // 🆕 Detectar duplicatas especificamente no turno atual
    const currentShiftDuplicates = useMemo(() => {
        const dups: Array<{
            cpf?: string
            name?: string
            participants: EventParticipant[]
            reason: string
        }> = []

        if (!participantesDoDia || participantesDoDia.length === 0) {
            return dups
        }

        // Agrupar por CPF normalizado
        const participantsByCpf = new Map<string, EventParticipant[]>()
        // Agrupar por nome normalizado (para casos sem CPF)
        const participantsByName = new Map<string, EventParticipant[]>()

        participantesDoDia.forEach(participant => {
            // Verificar duplicatas por CPF
            if (participant.cpf && participant.cpf.trim()) {
                const normalizedCpf = normalizeCpf(participant.cpf)
                if (normalizedCpf) {
                    if (!participantsByCpf.has(normalizedCpf)) {
                        participantsByCpf.set(normalizedCpf, [])
                    }
                    participantsByCpf.get(normalizedCpf)!.push(participant)
                }
            }

            // Verificar duplicatas por nome (para casos sem CPF)
            if (participant.name && participant.name.trim()) {
                const normalizedName = normalizeName(participant.name)
                if (normalizedName) {
                    if (!participantsByName.has(normalizedName)) {
                        participantsByName.set(normalizedName, [])
                    }
                    participantsByName.get(normalizedName)!.push(participant)
                }
            }
        })

        // Encontrar duplicados por CPF
        participantsByCpf.forEach((participants, cpf) => {
            if (participants.length > 1) {
                dups.push({
                    cpf: participants[0].cpf,
                    participants,
                    reason: 'CPF duplicado no turno atual',
                })
            }
        })

        // Encontrar duplicados por nome (apenas para participantes sem CPF ou CPF inválido)
        participantsByName.forEach((participants, name) => {
            if (participants.length > 1) {
                // Verificar se não são duplicatas já capturadas por CPF
                const hasValidCpfDuplicates = participants.some(p =>
                    p.cpf && p.cpf.trim() && normalizeCpf(p.cpf)
                )

                if (!hasValidCpfDuplicates) {
                    dups.push({
                        name: participants[0].name,
                        participants,
                        reason: 'Nome duplicado no turno atual (sem CPF válido)',
                    })
                }
            }
        })

        return dups
    }, [participantesDoDia, normalizeCpf, normalizeName])

    // 🆕 Funções para gerenciar duplicatas do turno atual
    const handleToggleDuplicateSelection = useCallback((participantId: string) => {
        setSelectedDuplicatesForRemoval(prev => {
            const newSet = new Set(prev)
            if (newSet.has(participantId)) {
                newSet.delete(participantId)
            } else {
                newSet.add(participantId)
            }
            return newSet
        })
    }, [])

    const handleSelectAllDuplicatesInGroup = useCallback((participants: EventParticipant[], keepFirst: boolean = true) => {
        setSelectedDuplicatesForRemoval(prev => {
            const newSet = new Set(prev)
            const participantsToSelect = keepFirst ? participants.slice(1) : participants

            participantsToSelect.forEach(p => {
                newSet.add(p.id)
            })
            return newSet
        })
    }, [])

    const handleClearDuplicateSelection = useCallback(() => {
        setSelectedDuplicatesForRemoval(new Set())
    }, [])

    const handleRemoveSelectedDuplicates = useCallback(async () => {
        if (selectedDuplicatesForRemoval.size === 0) {
            toast.error('Nenhum participante selecionado para remoção')
            return
        }

        setDuplicatesManagerLoading(true)
        let successCount = 0
        let errorCount = 0

        try {
            for (const participantId of Array.from(selectedDuplicatesForRemoval)) {
                try {
                    // Encontrar o participante para determinar o método de remoção
                    const participant = participantesDoDia.find(p => p.id === participantId)
                    if (!participant) {
                        errorCount++
                        continue
                    }

                    const hash = participant.participantHash || `${participant.cpf}_${params.id}`

                    await new Promise<void>((resolve, reject) => {
                        // Remover apenas do turno atual
                        deleteFromShift(
                            {
                                eventId: String(params.id),
                                participantHash: hash,
                                shiftId: currentSelectedDay,
                                performedBy: 'remocao-duplicatas',
                            },
                            {
                                onSuccess: () => {
                                    successCount++
                                    resolve()
                                },
                                onError: (error) => {
                                    console.error(`Erro ao remover duplicata ${participant.name}:`, error)
                                    errorCount++
                                    reject(error)
                                }
                            }
                        )
                    })

                    // Delay para evitar sobrecarga
                    await new Promise(resolve => setTimeout(resolve, 100))
                } catch (error) {
                    console.error(`Erro ao processar remoção de duplicata:`, error)
                    errorCount++
                }
            }

            if (successCount > 0) {
                const { dateFormatted, stage, period } = parseShiftId(currentSelectedDay)
                const stageLabel = stage === 'montagem' ? 'Montagem' :
                    stage === 'evento' ? 'Evento' :
                        stage === 'desmontagem' ? 'Desmontagem' : stage
                const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno'

                toast.success(
                    `✅ ${successCount} duplicata(s) removida(s) do turno ${dateFormatted} (${stageLabel} - ${periodLabel})!`
                )
            }

            if (errorCount > 0) {
                toast.error(`❌ ${errorCount} erro(s) durante a remoção de duplicatas`)
            }

            setShowDuplicatesManagerModal(false)
            setSelectedDuplicatesForRemoval(new Set())
        } catch (error) {
            console.error('Erro geral na remoção de duplicatas:', error)
            toast.error('Erro ao remover duplicatas')
        }

        setDuplicatesManagerLoading(false)
    }, [
        selectedDuplicatesForRemoval,
        participantesDoDia,
        params.id,
        currentSelectedDay,
        deleteFromShift,
        parseShiftId
    ])

    // Handlers memoizados
    const handleDeleteParticipant = useCallback(
        (participant: EventParticipant) => {
            // Definir hash do participante
            const hash = participant.participantHash || `${participant.cpf}_${params.id}`

            // Verificar se o participante tem outros turnos no modo agrupado
            if (viewMode === 'grouped') {
                const group = groupedParticipantsData.find(g => g.participantHash === hash)
                if (group && group.shifts.length > 1) {
                    setDeleteMode('shift') // Por padrão, remover apenas do turno atual
                } else {
                    setDeleteMode('all') // Se só tem um turno, remover completamente
                }
            } else {
                setDeleteMode('shift') // No modo shift, sempre remover do turno
            }

            setDeletingParticipant(participant)
            setDeletingParticipantHash(hash)
        },
        [viewMode, groupedParticipantsData, params.id],
    )

    const confirmDeleteParticipant = () => {
        if (!deletingParticipant || !deletingParticipantHash) return

        if (deleteMode === 'shift') {
            // Remover apenas do turno atual
            console.log('🔄 Removendo participante apenas do turno atual:', currentSelectedDay);

            deleteFromShift(
                {
                    eventId: String(params.id),
                    participantHash: deletingParticipantHash,
                    shiftId: currentSelectedDay,
                    performedBy: 'current-user',
                },
                {
                    onSuccess: (data) => {
                        const { dateFormatted, period, stage } = parseShiftId(currentSelectedDay);

                        if (data.remainingShifts > 0) {
                            toast.success(`Participante removido do turno ${dateFormatted} (${stage} - ${period === 'diurno' ? 'Diurno' : 'Noturno'})! ${data.remainingShifts} turno(s) restante(s).`);
                        } else {
                            toast.success(`Participante removido do turno ${dateFormatted} (${stage} - ${period === 'diurno' ? 'Diurno' : 'Noturno'})! Era o último turno.`);
                        }

                        setDeletingParticipant(null);
                        setDeletingParticipantHash(null);
                    },
                    onError: error => {
                        console.error('Erro ao remover participante do turno:', error);
                        toast.error('Erro ao remover participante do turno. Tente novamente.');
                    },
                }
            );
        } else {
            // Remover de todos os turnos
            console.log('🗑️ Removendo participante de todos os turnos');

            deleteAllShifts(
                {
                    eventId: String(params.id),
                    participantHash: deletingParticipantHash,
                    performedBy: 'current-user',
                },
                {
                    onSuccess: (data) => {
                        toast.success(`Participante removido de todos os ${data.deletedCount} turno(s)!`);
                        setDeletingParticipant(null);
                        setDeletingParticipantHash(null);
                    },
                    onError: error => {
                        console.error('Erro ao remover participante de todos os turnos:', error);
                        toast.error('Erro ao remover participante de todos os turnos. Tente novamente.');
                    },
                }
            );
        }
    }

    // Handlers para editar staff
    const handleEditParticipant = useCallback(
        (participant: EventParticipant) => {
            setParticipantToEdit(participant)
            setShowEditarStaffModal(true)
        },
        []
    )

    const handleEditSuccess = useCallback(() => {
        console.log('Staff editado com sucesso!')
        setShowEditarStaffModal(false)
        setParticipantToEdit(null)
        // Refazer query para atualizar dados
    }, [])

    // ========== HANDLERS E FUNÇÕES ==========

    // OTIMIZAÇÕES APLICADAS:
    // 1. Queries memoizadas e reduzidas (TODO: implementar useEventById)
    // 2. Cálculos custosos memoizados (eventDays, participantesDoDia, duplicates)
    // 3. KPIs e estatísticas memoizadas (kpiStats, credentialStats)
    // 4. Funções memoizadas com useCallback
    // 5. Renderização condicional otimizada
    // 6. Funções não utilizadas removidas (getCredencial, getBotaoAcao, getInitials)

    // Função para abrir popup de check-in (memoizada)
    const abrirCheckin = useCallback(
        async (participant: EventParticipant) => {
            const attendanceRecord = getAttendanceRecord(participant.id, selectedDay)

            if (attendanceRecord && attendanceRecord.checkIn) {
                // Se já fez check-in, abrir em modo de edição
                setIsEditingAttendance(true)
                setCurrentAttendanceId(attendanceRecord.id)

                // Pré-preencher os campos com os dados existentes
                const checkinDateTime = new Date(attendanceRecord.checkIn)
                setEditCheckinDate(checkinDateTime.toISOString().split('T')[0])
                setEditCheckinTime(checkinDateTime.toTimeString().split(' ')[0].slice(0, 5))

                if (attendanceRecord.checkOut) {
                    const checkoutDateTime = new Date(attendanceRecord.checkOut)
                    setEditCheckoutDate(checkoutDateTime.toISOString().split('T')[0])
                    setEditCheckoutTime(checkoutDateTime.toTimeString().split(' ')[0].slice(0, 5))
                } else {
                    setEditCheckoutDate('')
                    setEditCheckoutTime('')
                }

                // Buscar código da pulseira atual
                try {
                    const movementCredential = await getMovementCredentialByParticipant(String(params.id), participant.id)
                    if (movementCredential?.data?.code) {
                        setCodigoPulseira(movementCredential.data.code)
                    } else {
                        setCodigoPulseira('')
                    }
                } catch (error) {
                    console.error('Erro ao buscar código da pulseira:', error)
                    setCodigoPulseira('')
                }
            } else {
                // Novo check-in
                setIsEditingAttendance(false)
                setCurrentAttendanceId('')
                setEditCheckinDate('')
                setEditCheckinTime('')
                setEditCheckoutDate('')
                setEditCheckoutTime('')
                setCodigoPulseira('')
            }

            setParticipantAction(participant)
            setSelectedDateForAction(selectedDay)
            setPopupCheckin(true)
        },
        [hasCheckIn, selectedDay, getAttendanceRecord, params.id],
    )

    // Função para abrir popup de check-out (memoizada)
    const abrirCheckout = useCallback(
        async (participant: EventParticipant) => {
            const attendanceRecord = getAttendanceRecord(participant.id, selectedDay)

            // Verificar se fez check-in antes de fazer check-out
            if (!hasCheckIn(participant.id, selectedDay)) {
                toast.error(
                    'Este participante precisa fazer check-in antes do check-out!',
                )
                return
            }

            if (attendanceRecord && attendanceRecord.checkOut) {
                // Se já fez check-out, abrir em modo de edição usando o mesmo modal
                setIsEditingAttendance(true)
                setCurrentAttendanceId(attendanceRecord.id)

                // Pré-preencher os campos com os dados existentes
                const checkinDateTime = new Date(attendanceRecord.checkIn!)
                setEditCheckinDate(checkinDateTime.toISOString().split('T')[0])
                setEditCheckinTime(checkinDateTime.toTimeString().split(' ')[0].slice(0, 5))

                const checkoutDateTime = new Date(attendanceRecord.checkOut)
                setEditCheckoutDate(checkoutDateTime.toISOString().split('T')[0])
                setEditCheckoutTime(checkoutDateTime.toTimeString().split(' ')[0].slice(0, 5))

                // Buscar código da pulseira atual
                try {
                    const movementCredential = await getMovementCredentialByParticipant(String(params.id), participant.id)
                    if (movementCredential?.data?.code) {
                        setCodigoPulseira(movementCredential.data.code)
                    } else {
                        setCodigoPulseira('')
                    }
                } catch (error) {
                    console.error('Erro ao buscar código da pulseira:', error)
                    setCodigoPulseira('')
                }

                setParticipantAction(participant)
                setSelectedDateForAction(selectedDay)
                setPopupCheckin(true) // Usar o mesmo modal para edição
                return
            }

            setParticipantAction(participant)
            setSelectedDateForAction(selectedDay)
            setPopupCheckout(true)
        },
        [hasCheckIn, hasCheckOut, selectedDay, getAttendanceRecord, params.id],
    )

    // Função para abrir popup de reset check-in (memoizada)
    const abrirResetCheckin = useCallback((participant: EventParticipant) => {
        setParticipantAction(participant)
        setPopupResetCheckin(true)
    }, [])

    // Função para confirmar check-in (novo ou edição)
    const confirmarCheckin = async () => {
        if (!participantAction) {
            toast.error('Participante não selecionado')
            return
        }

        setLoading(true)
        try {
            if (isEditingAttendance && currentAttendanceId) {
                // Editar attendance existente
                let checkInDateTime = null
                let checkOutDateTime = null

                if (editCheckinDate && editCheckinTime) {
                    checkInDateTime = new Date(`${editCheckinDate}T${editCheckinTime}:00`).toISOString()
                }

                if (editCheckoutDate && editCheckoutTime) {
                    checkOutDateTime = new Date(`${editCheckoutDate}T${editCheckoutTime}:00`).toISOString()
                }

                await editAttendanceMutation.mutateAsync({
                    attendanceId: currentAttendanceId,
                    checkIn: checkInDateTime,
                    checkOut: checkOutDateTime,
                    notes: `Editado via painel de eventos${codigoPulseira.trim() ? ` - Pulseira: ${codigoPulseira.trim()}` : ''}`,
                    performedBy: 'Sistema-Edição',
                    validatedBy: 'Sistema',
                })

                // Salvar pulseira no sistema de movement_credentials (apenas se foi informada)
                if (codigoPulseira.trim()) {
                    try {
                        await changeCredentialCode(
                            String(params.id),
                            participantAction.id,
                            codigoPulseira.trim(),
                        )
                    } catch (error) {
                        console.error('⚠️ Erro ao salvar pulseira no sistema:', error)
                    }
                }

                toast.success('Dados de presença editados com sucesso!')
            } else {
                // Novo check-in
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
                    validatedBy: 'Sistema',
                    performedBy: 'Sistema',
                    notes: `Check-in realizado via painel de eventos${codigoPulseira.trim() ? ` - Pulseira: ${codigoPulseira.trim()}` : ''}`,
                    workPeriod: period,
                    workStage: stage,
                })

                // Salvar pulseira no sistema de movement_credentials (apenas se foi informada)
                if (codigoPulseira.trim()) {
                    try {
                        await changeCredentialCode(
                            String(params.id),
                            participantAction.id,
                            codigoPulseira.trim(),
                        )
                    } catch (error) {
                        console.error('⚠️ Erro ao salvar pulseira no sistema:', error)
                    }
                }

                toast.success('Check-in realizado com sucesso!')
            }

            // Forçar atualização dos dados de attendance
            await queryClient.invalidateQueries({
                queryKey: [
                    'event-attendance-by-event-date',
                    String(params.id),
                    formatDateForAPI(selectedDay),
                ],
            })

            setPopupCheckin(false)
            setParticipantAction(null)
            setCodigoPulseira('')
            setSelectedDateForAction('')
            setIsEditingAttendance(false)
            setCurrentAttendanceId('')
            setEditCheckinDate('')
            setEditCheckinTime('')
            setEditCheckoutDate('')
            setEditCheckoutTime('')
        } catch (error) {
            console.error('❌ Erro ao processar check-in:', error)
            const errorMessage =
                error instanceof Error ? error.message : 'Erro desconhecido'
            toast.error(`Erro ao processar: ${errorMessage}`)
        }
        setLoading(false)
    }

    // Função para confirmar check-out
    const confirmarCheckout = async () => {
        if (!participantAction) {
            toast.error('Participante não selecionado')
            return
        }

        // Verificar se já fez check-out no dia selecionado
        const dateToCheck = selectedDateForAction || selectedDay
        if (hasCheckOut(participantAction.id, dateToCheck)) {
            toast.error('Este participante já fez check-out neste dia!')
            setPopupCheckout(false)
            setParticipantAction(null)
            setSelectedDateForAction('')
            return
        }

        // Verificar se fez check-in antes de fazer check-out
        if (!hasCheckIn(participantAction.id, dateToCheck)) {
            toast.error(
                'Este participante precisa fazer check-in antes do check-out!',
            )
            setPopupCheckout(false)
            setParticipantAction(null)
            setSelectedDateForAction('')
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
                validatedBy: 'Sistema',
                performedBy: 'Sistema',
                notes: 'Check-out realizado via painel de eventos',
                workPeriod: period,
                workStage: stage,
            })

            toast.success('Check-out realizado com sucesso!')

            // Forçar atualização dos dados de attendance
            await queryClient.invalidateQueries({
                queryKey: [
                    'event-attendance-by-event-date',
                    String(params.id),
                    formatDateForAPI(selectedDay),
                ],
            })

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

    // Funções para seleção múltipla (memoizadas)
    const toggleParticipantSelection = useCallback((participantId: string) => {
        setSelectedParticipants(prev => {
            const newSet = new Set(prev)
            if (newSet.has(participantId)) {
                newSet.delete(participantId)
            } else {
                newSet.add(participantId)
            }
            return newSet
        })
    }, [])

    const selectAllParticipants = useCallback(() => {
        if (selectedParticipants.size === filteredParticipants.length) {
            setSelectedParticipants(new Set())
        } else {
            setSelectedParticipants(new Set(filteredParticipants.map(p => p.id)))
        }
    }, [selectedParticipants.size, filteredParticipants])

    const clearSelection = useCallback(() => {
        setSelectedParticipants(new Set())
    }, [])

    // Função para edição em massa
    const handleBulkEdit = async () => {
        if (selectedParticipants.size === 0) {
            toast.error('Nenhum participante selecionado')
            return
        }

        setBulkEditLoading(true)
        let successCount = 0
        let errorCount = 0

        try {
            for (const participantId of Array.from(selectedParticipants)) {
                try {
                    const updateData: any = {}

                    if (
                        bulkEditData.credentialId &&
                        bulkEditData.credentialId !== 'no-change'
                    ) {
                        await updateParticipantCredential(
                            participantId,
                            bulkEditData.credentialId,
                        )
                        successCount++
                    }

                    if (bulkEditData.role) {
                        updateData.role = bulkEditData.role
                    }

                    if (bulkEditData.company && bulkEditData.company !== 'no-change') {
                        updateData.company = bulkEditData.company
                    }

                    if (Object.keys(updateData).length > 0) {
                        await updateParticipant(
                            { id: participantId, ...updateData },
                            {
                                onSuccess: () => successCount++,
                                onError: () => errorCount++,
                            },
                        )
                    }
                } catch (error) {
                    console.error(
                        `Erro ao atualizar participante ${participantId}:`,
                        error,
                    )
                    errorCount++
                }
            }

            // Exibir contexto do turno na mensagem de sucesso
            const { dateFormatted, stage, period } = parseShiftId(currentSelectedDay);
            const stageLabel = stage === 'montagem' ? 'Montagem' :
                stage === 'evento' ? 'Evento' :
                    stage === 'desmontagem' ? 'Desmontagem' : stage;
            const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno';

            toast.success(
                `Edição em massa concluída para ${dateFormatted} (${stageLabel} - ${periodLabel}): ${successCount} sucessos${errorCount > 0 ? `, ${errorCount} erros` : ''}`,
            )
            setShowBulkEditModal(false)
            setBulkEditData({
                credentialId: 'no-change',
                role: '',
                company: 'no-change',
            })
            clearSelection()
        } catch (error) {
            toast.error('Erro na edição em massa')
        }

        setBulkEditLoading(false)
    }

    // Função para exclusão em massa
    const handleBulkDelete = async () => {
        if (selectedParticipants.size === 0) {
            toast.error('Nenhum participante selecionado')
            return
        }

        setBulkDeleteLoading(true)
        let successCount = 0
        let errorCount = 0

        try {
            for (const participantId of Array.from(selectedParticipants)) {
                try {
                    await new Promise((resolve, reject) => {
                        deleteParticipant(
                            {
                                id: participantId,
                                performedBy: 'exclusao-em-massa',
                            },
                            {
                                onSuccess: () => {
                                    successCount++
                                    resolve(true)
                                },
                                onError: error => {
                                    console.error(
                                        `Erro ao excluir participante ${participantId}:`,
                                        error,
                                    )
                                    errorCount++
                                    reject(error)
                                },
                            },
                        )
                    })

                    // Delay pequeno entre exclusões para evitar sobrecarga
                    await new Promise(resolve => setTimeout(resolve, 100))
                } catch (error) {
                    console.error(
                        `Erro ao processar exclusão ${participantId}:`,
                        error,
                    )
                    errorCount++
                }
            }

            if (successCount > 0) {
                // Exibir contexto do turno na mensagem de sucesso
                const { dateFormatted, stage, period } = parseShiftId(currentSelectedDay);
                const stageLabel = stage === 'montagem' ? 'Montagem' :
                    stage === 'evento' ? 'Evento' :
                        stage === 'desmontagem' ? 'Desmontagem' : stage;
                const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno';

                toast.success(
                    `${successCount} participantes excluídos do turno ${dateFormatted} (${stageLabel} - ${periodLabel})!`,
                )
            }
            if (errorCount > 0) {
                toast.error(`${errorCount} erros durante a exclusão`)
            }

            setShowBulkDeleteModal(false)
            clearSelection()
        } catch (error) {
            console.error('Erro geral na exclusão em massa:', error)
            toast.error('Erro ao excluir participantes')
        }

        setBulkDeleteLoading(false)
    }

    // Função para reset de check-in em massa
    const handleBulkReset = async () => {
        if (selectedParticipants.size === 0) {
            toast.error('Nenhum participante selecionado')
            return
        }

        setBulkResetLoading(true)
        let successCount = 0
        let errorCount = 0

        try {
            for (const participantId of Array.from(selectedParticipants)) {
                try {
                    await deleteAttendanceMutation.mutateAsync({
                        participantId: participantId,
                    })
                    successCount++

                    // Delay pequeno entre operações para evitar sobrecarga
                    await new Promise(resolve => setTimeout(resolve, 100))
                } catch (error) {
                    console.error(
                        `Erro ao resetar check-in do participante ${participantId}:`,
                        error,
                    )
                    errorCount++
                }
            }

            if (successCount > 0) {
                // Exibir contexto do turno na mensagem de sucesso
                const { dateFormatted, stage, period } = parseShiftId(currentSelectedDay);
                const stageLabel = stage === 'montagem' ? 'Montagem' :
                    stage === 'evento' ? 'Evento' :
                        stage === 'desmontagem' ? 'Desmontagem' : stage;
                const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno';

                toast.success(
                    `Check-in resetado para ${successCount} participantes do turno ${dateFormatted} (${stageLabel} - ${periodLabel})!`,
                )

                // Forçar atualização dos dados de attendance
                await queryClient.invalidateQueries({
                    queryKey: [
                        'event-attendance-by-event-date',
                        String(params.id),
                        formatDateForAPI(selectedDay),
                    ],
                })
            }
            if (errorCount > 0) {
                toast.error(`${errorCount} erros durante o reset de check-in`)
            }

            setShowBulkResetModal(false)
            clearSelection()
        } catch (error) {
            console.error('Erro geral no reset de check-in em massa:', error)
            toast.error('Erro ao resetar check-in dos participantes')
        }

        setBulkResetLoading(false)
    }

    // Função para remover duplicados
    const handleRemoveDuplicates = async () => {
        setDuplicatesLoading(true)
        let removedCount = 0
        let errorCount = 0

        try {
            for (const duplicate of duplicates) {
                // Para cada grupo de duplicados, manter apenas o primeiro e remover os demais
                const participantsToRemove = duplicate.participants.slice(1) // Remove o primeiro, mantém os outros

                for (const participant of participantsToRemove) {
                    try {
                        await new Promise((resolve, reject) => {
                            deleteParticipant(
                                {
                                    id: participant.id,
                                    performedBy: 'sistema-remocao-duplicados',
                                },
                                {
                                    onSuccess: () => {
                                        removedCount++
                                        resolve(true)
                                    },
                                    onError: error => {
                                        console.error(
                                            `Erro ao remover duplicado ${participant.id}:`,
                                            error,
                                        )
                                        errorCount++
                                        reject(error)
                                    },
                                },
                            )
                        })

                        // Delay pequeno entre remoções para evitar sobrecarga
                        await new Promise(resolve => setTimeout(resolve, 200))
                    } catch (error) {
                        console.error(
                            `Erro ao processar duplicado ${participant.id}:`,
                            error,
                        )
                        errorCount++
                    }
                }
            }

            if (removedCount > 0) {
                toast.success(
                    `${removedCount} participantes duplicados removidos com sucesso!`,
                )
            }
            if (errorCount > 0) {
                toast.error(`${errorCount} erros durante a remoção`)
            }

            setShowDuplicatesModal(false)
        } catch (error) {
            console.error('Erro geral na remoção de duplicados:', error)
            toast.error('Erro ao remover duplicados')
        }

        setDuplicatesLoading(false)
    }

    // Função para resetar check-in - deleta todos os registros de attendance
    const handleResetCheckin = async () => {
        if (!participantAction) return

        setLoading(true)
        try {
            await deleteAttendanceMutation.mutateAsync({
                participantId: participantAction.id,
            })

            toast.success('Check-in resetado com sucesso!')

            // Forçar atualização dos dados de attendance
            await queryClient.invalidateQueries({
                queryKey: [
                    'event-attendance-by-event-date',
                    String(params.id),
                    formatDateForAPI(selectedDay),
                ],
            })

            setPopupResetCheckin(false)
            setParticipantAction(null)
        } catch (error) {
            console.error('Erro ao resetar check-in:', error)
            toast.error('Erro ao resetar check-in')
        }
        setLoading(false)
    }

    // Função para abrir popup de replicação de staff
    const handleOpenReplicateDialog = (sourceDay: string) => {
        setReplicateSourceDay(sourceDay)
        setShowReplicateDialog(true)
    }

    // Função para abrir replicação em etapas
    const handleOpenStepReplication = (sourceDay: string) => {
        // Resetar dados e inicializar Etapa 1
        setReplicationData({
            sourceDay: sourceDay,
            targetDay: '',
            sourceParticipants: [],
            targetParticipants: [],
            participantsToReplicate: [],
            companiesAnalysis: {
                existing: [],
                missing: [],
                needingCreation: []
            },
            credentialsAnalysis: {
                existing: [],
                missing: [],
                needingCreation: []
            },
            processingSummary: {
                companiesProcessed: 0,
                credentialsProcessed: 0,
                participantsProcessed: 0
            },
            rateLimiting: {
                estimatedTime: 0,
                operationsCount: 0,
                windowStart: 0
            }
        })

        // Resetar estados de progresso
        setCompanyCreationProgress({
            current: 0,
            total: 0,
            currentItem: '',
            completed: false
        })

        setCredentialCreationProgress({
            current: 0,
            total: 0,
            currentItem: '',
            completed: false
        })
        setCurrentReplicationStep(1)
        setIsProcessingStep(false)
        setShowStepReplicationModal(true)
    }

    // ETAPA 1: Seleção de dias origem e destino
    const handleStep1Selection = async (targetDay: string) => {
        if (!targetDay || targetDay === replicationData.sourceDay) {
            toast.error('Selecione um turno de destino válido')
            return
        }

        setIsProcessingStep(true)

        try {
            console.log('📋 ETAPA 1: Analisando participantes dos turnos...')

            // Buscar participantes do turno de origem
            const sourceParticipants = participantesDoDia

            // Buscar participantes do turno de destino
            const targetParticipants = await queryClient.fetchQuery<EventParticipant[]>({
                queryKey: [
                    "event-participants-by-shift",
                    { eventId: String(params.id), shiftId: targetDay, search: undefined, sortBy: "name", sortOrder: "asc" }
                ],
                queryFn: async () => {
                    const { data } = await apiClient.get<{
                        data: EventParticipant[];
                        total: number;
                    }>(`/event-participants/event/${String(params.id)}/shift/${encodeURIComponent(targetDay)}`);

                    if (data && typeof data === "object" && "data" in data) {
                        return Array.isArray(data.data) ? data.data : [];
                    }
                    return Array.isArray(data) ? data : [];
                },
                staleTime: 0
            })

            // Filtrar participantes que não existem no destino
            const participantsToReplicate = sourceParticipants.filter(participant => {
                return !participantExistsInTarget(participant, targetParticipants)
            })

            // Atualizar dados da replicação
            setReplicationData(prev => ({
                ...prev,
                targetDay,
                sourceParticipants,
                targetParticipants,
                participantsToReplicate
            }))

            console.log(`✅ ETAPA 1 CONCLUÍDA:`, {
                origem: sourceParticipants.length,
                destino: targetParticipants.length,
                paraReplicar: participantsToReplicate.length
            })

            // Avançar para Etapa 2
            setCurrentReplicationStep(2)

        } catch (error) {
            console.error('❌ Erro na Etapa 1:', error)
            toast.error('Erro ao analisar participantes dos turnos')
        } finally {
            setIsProcessingStep(false)
        }
    }

    // ETAPA 2: Verificação de empresas por data/estágio/período específico
    const handleStep2CompaniesAnalysis = async () => {
        setIsProcessingStep(true)

        try {
            console.log('🏢 ETAPA 2: Analisando empresas por data/estágio/período específico...')

            const { participantsToReplicate, targetDay } = replicationData
            const targetShiftInfo = parseShiftId(targetDay)

            console.log(`🎯 Verificando empresas para TURNO DE DESTINO:`, {
                targetDay,
                date: targetShiftInfo.dateISO,
                stage: targetShiftInfo.stage,
                period: targetShiftInfo.period
            })

            // Primeiro: buscar todas as empresas que JÁ TRABALHAM no turno de destino
            // USANDO APENAS os campos workDate, workStage, workPeriod (ignorando array days)
            const empresasJaNoTurnoDestino = empresasArray.filter(emp => {
                const worksInTargetShift = (
                    emp.workDate === targetShiftInfo.dateISO &&
                    emp.workStage === targetShiftInfo.stage &&
                    emp.workPeriod === targetShiftInfo.period
                )

                console.log(`  🔍 Empresa "${emp.nome}":`, {
                    workDate: emp.workDate,
                    workStage: emp.workStage,
                    workPeriod: emp.workPeriod,
                    target: targetShiftInfo,
                    match: worksInTargetShift
                })

                return worksInTargetShift
            })

            console.log(`📋 Empresas que JÁ TRABALHAM no turno de destino ${targetDay}:`,
                empresasJaNoTurnoDestino.map(emp => emp.nome))

            // Segundo: extrair empresas únicas dos participantes que queremos replicar
            const uniqueCompanies = new Set<string>()
            participantsToReplicate.forEach(participant => {
                if (participant.company && participant.company.trim()) {
                    uniqueCompanies.add(participant.company.trim())
                }
            })

            console.log(`📋 Empresas necessárias pelos participantes:`, Array.from(uniqueCompanies))

            const existingCompanies: string[] = []
            const needingCreationCompanies: string[] = []

            // Terceiro: verificar quais empresas dos participantes já existem no turno de destino
            for (const companyName of uniqueCompanies) {
                console.log(`\n🔍 Empresa "${companyName}": verificando se JÁ TRABALHA no turno destino...`)

                // Buscar se esta empresa já trabalha no turno de destino
                const empresaJaTrabalhaNoDestino = empresasJaNoTurnoDestino.find(emp => emp.nome === companyName)

                if (empresaJaTrabalhaNoDestino) {
                    console.log(`✅ Empresa "${companyName}" JÁ TRABALHA no turno destino - NÃO precisa criar`)
                    existingCompanies.push(companyName)
                } else {
                    console.log(`❌ Empresa "${companyName}" NÃO TRABALHA no turno destino - PRECISA CRIAR`)
                    needingCreationCompanies.push(companyName)
                }
            }

            // Atualizar análise (removendo o campo missing que estava causando confusão)
            setReplicationData(prev => ({
                ...prev,
                companiesAnalysis: {
                    existing: existingCompanies,
                    missing: [], // Array vazio para manter compatibilidade
                    needingCreation: needingCreationCompanies
                }
            }))

            console.log(`✅ ETAPA 2 CONCLUÍDA:`, {
                existentes: existingCompanies.length,
                paracriar: needingCreationCompanies.length
            })

            console.log(`📊 RESUMO EMPRESAS:`, {
                existentes: existingCompanies,
                paracriar: needingCreationCompanies
            })

            // Avançar para Etapa 3
            setCurrentReplicationStep(3)

        } catch (error) {
            console.error('❌ Erro na Etapa 2:', error)
            toast.error('Erro ao analisar empresas')
        } finally {
            setIsProcessingStep(false)
        }
    }

    // ETAPA 3: Criação de empresas para o dia específico
    const handleStep3ProcessCompanies = async () => {
        setIsProcessingStep(true)

        try {
            console.log('⚙️ ETAPA 3: Criando empresas para o dia específico...')

            const { companiesAnalysis, targetDay } = replicationData
            const { needingCreation } = companiesAnalysis
            const targetShiftInfo = parseShiftId(targetDay)

            let processedCount = 0

            // Inicializar progresso de criação de empresas
            setCompanyCreationProgress({
                current: 0,
                total: needingCreation.length,
                currentItem: needingCreation[0] || '',
                completed: false
            })

            // Criar apenas as empresas que precisam ser criadas para este dia específico
            for (const companyName of needingCreation) {
                try {
                    console.log(`🔧 Criando empresa: ${companyName} para o dia ${targetDay}`)

                    await new Promise<void>((resolve, reject) => {
                        createEmpresa(
                            {
                                nome: companyName,
                                id_evento: String(params.id),
                                days: [targetDay],
                                shiftId: targetDay,
                                workDate: targetShiftInfo.dateISO,
                                workStage: targetShiftInfo.stage as "evento" | "montagem" | "desmontagem" | undefined,
                                workPeriod: targetShiftInfo.period as "diurno" | "noturno" | "dia_inteiro" | undefined,
                            },
                            {
                                onSuccess: () => {
                                    console.log(`✅ Empresa ${companyName} criada com sucesso`)
                                    processedCount++

                                    // Atualizar progresso
                                    setCompanyCreationProgress(prev => ({
                                        ...prev,
                                        current: processedCount,
                                        currentItem: processedCount < needingCreation.length ? needingCreation[processedCount] : 'Finalizando...'
                                    }))

                                    resolve()
                                },
                                onError: (error) => {
                                    console.error(`❌ Erro ao criar empresa ${companyName}:`, error)
                                    reject(error)
                                }
                            }
                        )
                    })
                } catch (error) {
                    console.error(`❌ Erro ao criar empresa ${companyName}:`, error)
                    // Não usar toast aqui, o erro será mostrado no progresso visual
                }
                // Rate limiting inteligente para empresas
                await waitForRateLimit(needingCreation.length - processedCount)
            }

            // Atualizar resumo
            setReplicationData(prev => ({
                ...prev,
                processingSummary: {
                    ...prev.processingSummary,
                    companiesProcessed: processedCount
                }
            }))

            console.log(`✅ ETAPA 3 CONCLUÍDA: ${processedCount} empresas criadas para o dia específico`)

            // Marcar progresso como concluído
            setCompanyCreationProgress(prev => ({
                ...prev,
                completed: true,
                current: processedCount,
                currentItem: 'Concluído'
            }))

            // Avançar para Etapa 4
            setCurrentReplicationStep(4)

        } catch (error) {
            console.error('❌ Erro na Etapa 3:', error)
            // Marcar progresso como com erro
            setCompanyCreationProgress(prev => ({
                ...prev,
                completed: true,
                currentItem: 'Erro durante o processo'
            }))
        } finally {
            setIsProcessingStep(false)
        }
    }

    // ETAPA 4: Verificação de credenciais por data/estágio/período específico
    const handleStep4CredentialsAnalysis = async () => {
        setIsProcessingStep(true)

        try {
            console.log('🎫 ETAPA 4: Analisando credenciais por data/estágio/período específico...')

            const { participantsToReplicate, targetDay } = replicationData
            const targetShiftInfo = parseShiftId(targetDay)

            console.log(`🎯 Verificando credenciais para TURNO DE DESTINO:`, {
                targetDay,
                date: targetShiftInfo.dateISO,
                stage: targetShiftInfo.stage,
                period: targetShiftInfo.period
            })

            // Primeiro: buscar todas as credenciais que JÁ TRABALHAM no turno de destino
            // USANDO APENAS os campos workDate, workStage, workPeriod (ignorando array days_works)
            const credenciaisJaNoTurnoDestino = credentialsArray.filter(cred => {
                const worksInTargetShift = (
                    cred.workDate === targetShiftInfo.dateISO &&
                    cred.workStage === targetShiftInfo.stage &&
                    cred.workPeriod === targetShiftInfo.period
                )

                console.log(`  🔍 Credencial "${cred.nome}":`, {
                    workDate: cred.workDate,
                    workStage: cred.workStage,
                    workPeriod: cred.workPeriod,
                    target: targetShiftInfo,
                    match: worksInTargetShift
                })

                return worksInTargetShift
            })

            console.log(`📋 Credenciais que JÁ TRABALHAM no turno de destino ${targetDay}:`,
                credenciaisJaNoTurnoDestino.map(cred => cred.nome))

            // Segundo: extrair credenciais únicas dos participantes que queremos replicar
            const uniqueCredentials = new Set<string>()
            participantsToReplicate.forEach(participant => {
                // Usar o credentialId do participante para buscar o nome da credencial
                if (participant.credentialId) {
                    // Buscar a credencial pelo ID para obter o nome correto
                    const credencial = credentialsArray.find(cred => cred.id === participant.credentialId)
                    if (credencial) {
                        uniqueCredentials.add(credencial.nome)
                    } else {
                        console.warn(`⚠️ Credencial não encontrada para ID: ${participant.credentialId}`)
                    }
                } else {
                    console.warn(`⚠️ Participante sem credentialId: ${participant.name}`)
                }
            })

            console.log(`📋 Credenciais necessárias pelos participantes:`, Array.from(uniqueCredentials))

            const existingCredentials: string[] = []
            const needingCreationCredentials: string[] = []

            // Terceiro: verificar quais credenciais dos participantes já existem no turno de destino
            for (const credentialName of uniqueCredentials) {
                console.log(`\n🔍 Credencial "${credentialName}": verificando se JÁ TRABALHA no turno destino...`)

                // Buscar se esta credencial já trabalha no turno de destino
                const credencialJaTrabalhaNoDestino = credenciaisJaNoTurnoDestino.find(cred =>
                    cred.nome === credentialName || cred.id === credentialName)

                if (credencialJaTrabalhaNoDestino) {
                    console.log(`✅ Credencial "${credentialName}" JÁ TRABALHA no turno destino - NÃO precisa criar`)
                    existingCredentials.push(credentialName)
                } else {
                    console.log(`❌ Credencial "${credentialName}" NÃO TRABALHA no turno destino - PRECISA CRIAR`)
                    needingCreationCredentials.push(credentialName)
                }
            }

            // Atualizar análise (removendo o campo missing que estava causando confusão)
            setReplicationData(prev => ({
                ...prev,
                credentialsAnalysis: {
                    existing: existingCredentials,
                    missing: [], // Array vazio para manter compatibilidade
                    needingCreation: needingCreationCredentials
                }
            }))

            console.log(`✅ ETAPA 4 CONCLUÍDA:`, {
                existentes: existingCredentials.length,
                paracriar: needingCreationCredentials.length
            })

            console.log(`📊 RESUMO CREDENCIAIS:`, {
                existentes: existingCredentials,
                paracriar: needingCreationCredentials
            })

            // Avançar para Etapa 5
            setCurrentReplicationStep(5)

        } catch (error) {
            console.error('❌ Erro na Etapa 4:', error)
            toast.error('Erro ao analisar credenciais')
        } finally {
            setIsProcessingStep(false)
        }
    }

    // ETAPA 5: Criação de credenciais para o dia específico
    const handleStep5ProcessCredentials = async () => {
        setIsProcessingStep(true)

        try {
            console.log('⚙️ ETAPA 5: Criando credenciais para o dia específico...')

            const { credentialsAnalysis, targetDay, participantsToReplicate } = replicationData
            const { needingCreation } = credentialsAnalysis
            const targetShiftInfo = parseShiftId(targetDay)

            let processedCount = 0

            // Criar apenas as credenciais que precisam ser criadas para este dia específico
            // Identificar credenciais únicas dos participantes que precisam ser criadas
            const uniqueCredentials = [...new Set(needingCreation)]

            // Inicializar progresso de criação de credenciais
            setCredentialCreationProgress({
                current: 0,
                total: uniqueCredentials.length,
                currentItem: uniqueCredentials[0] || '',
                completed: false
            })

            for (const credentialName of uniqueCredentials) {
                try {
                    console.log(`🔧 Criando credencial: ${credentialName} para o dia ${targetDay}`)

                    // Encontrar um participante que use esta credencial para definir cor/propriedades
                    const sampleParticipant = participantsToReplicate.find(p => p.role === credentialName ||
                        (p.credentialId && needingCreation.includes(p.credentialId)))

                    // Gerar cor baseada no nome da credencial para consistência
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']
                    const colorIndex = credentialName.length % colors.length
                    const credentialColor = colors[colorIndex]

                    await new Promise<void>((resolve, reject) => {
                        createCredential(
                            {
                                nome: credentialName,
                                cor: credentialColor,
                                id_events: String(params.id),
                                days_works: [targetDay],
                                shiftId: targetDay,
                                workDate: targetShiftInfo.dateISO,
                                workStage: targetShiftInfo.stage as "evento" | "montagem" | "desmontagem",
                                workPeriod: targetShiftInfo.period as "diurno" | "noturno" | "dia_inteiro",
                                isActive: true,
                                isDistributed: false,
                            },
                            {
                                onSuccess: () => {
                                    console.log(`✅ Credencial ${credentialName} criada com sucesso`)
                                    processedCount++

                                    // Atualizar progresso
                                    setCredentialCreationProgress(prev => ({
                                        ...prev,
                                        current: processedCount,
                                        currentItem: processedCount < uniqueCredentials.length ? uniqueCredentials[processedCount] : 'Finalizando...'
                                    }))

                                    resolve()
                                },
                                onError: (error) => {
                                    console.error(`❌ Erro ao criar credencial ${credentialName}:`, error)
                                    reject(error)
                                }
                            }
                        )
                    })
                } catch (error) {
                    console.error(`❌ Erro ao criar credencial ${credentialName}:`, error)
                    // Não usar toast aqui, o erro será mostrado no progresso visual
                }
                // Rate limiting inteligente para credenciais
                await waitForRateLimit(uniqueCredentials.length - processedCount)
            }

            // Atualizar resumo
            setReplicationData(prev => ({
                ...prev,
                processingSummary: {
                    ...prev.processingSummary,
                    credentialsProcessed: processedCount
                }
            }))

            console.log(`✅ ETAPA 5 CONCLUÍDA: ${processedCount} credenciais criadas para o dia específico`)

            // Marcar progresso como concluído
            setCredentialCreationProgress(prev => ({
                ...prev,
                completed: true,
                current: processedCount,
                currentItem: 'Concluído'
            }))

            // Avançar para Etapa 6
            setCurrentReplicationStep(6)

        } catch (error) {
            console.error('❌ Erro na Etapa 5:', error)
            // Marcar progresso como com erro
            setCredentialCreationProgress(prev => ({
                ...prev,
                completed: true,
                currentItem: 'Erro durante o processo'
            }))
        } finally {
            setIsProcessingStep(false)
        }
    }

    // ETAPA 6: Replicação final dos participantes
    const handleStep6FinalReplication = async () => {
        setIsProcessingStep(true)

        try {
            console.log('🚀 ETAPA 6: Replicando participantes...')

            const { participantsToReplicate, targetDay } = replicationData
            const targetShiftInfo = parseShiftId(targetDay)

            let processedCount = 0
            let successCount = 0

            // Replicar cada participante
            for (let i = 0; i < participantsToReplicate.length; i++) {
                const participant = participantsToReplicate[i]

                try {
                    const newParticipantData = {
                        eventId: participant.eventId || String(params.id),
                        name: participant.name || '',
                        cpf: participant.cpf || '',
                        role: participant.role || '',
                        company: participant.company || '',
                        email: participant.email || undefined,
                        phone: participant.phone || undefined,
                        credentialId: participant.credentialId || undefined,
                        shirtSize: participant.shirtSize || undefined,
                        notes: participant.notes || undefined,
                        daysWork: [targetDay],
                        shiftId: targetDay,
                        workDate: targetShiftInfo.dateISO,
                        workStage: targetShiftInfo.stage,
                        workPeriod: targetShiftInfo.period,
                        performedBy: 'replicacao-staff-etapas'
                    }

                    // Criar novo participante
                    await new Promise((resolve, reject) => {
                        createParticipant(newParticipantData, {
                            onSuccess: () => {
                                successCount++
                                processedCount++
                                resolve(true)
                            },
                            onError: (error) => {
                                console.error(`❌ Erro ao replicar ${participant.name}:`, error)
                                processedCount++
                                reject(error)
                            }
                        })
                    })

                    await new Promise(resolve => setTimeout(resolve, 250))
                } catch (error) {
                    console.error(`❌ Erro ao processar ${participant.name}:`, error)
                    processedCount++
                }
            }

            // Atualizar resumo final
            setReplicationData(prev => ({
                ...prev,
                processingSummary: {
                    ...prev.processingSummary,
                    participantsProcessed: successCount
                }
            }))

            console.log(`✅ ETAPA 6 CONCLUÍDA: ${successCount}/${participantsToReplicate.length} participantes replicados`)

            // Invalidar queries para atualizar dados
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['event-participants-by-event', String(params.id)] }),
                queryClient.invalidateQueries({ queryKey: ['event-participants-grouped', String(params.id)] }),
                queryClient.invalidateQueries({ queryKey: ['event-participants-by-shift', String(params.id), targetDay] }),
                queryClient.invalidateQueries({ queryKey: ['empresas-by-event', String(params.id)] }),
                queryClient.invalidateQueries({ queryKey: ['credentials', String(params.id)] })
            ])

            // Mostrar resultado final
            const { companiesProcessed, credentialsProcessed } = replicationData.processingSummary

            toast.success(
                `🎉 Replicação concluída com sucesso!\n` +
                `✅ ${successCount} participantes replicados\n` +
                `🏢 ${companiesProcessed} empresas processadas\n` +
                `🎫 ${credentialsProcessed} credenciais processadas`
            )

            // Fechar modal após pequeno delay
            setTimeout(() => {
                setShowStepReplicationModal(false)
                setCurrentReplicationStep(1)
            }, 2000)

        } catch (error) {
            console.error('❌ Erro na Etapa 6:', error)
            toast.error('Erro na replicação final dos participantes')
        } finally {
            setIsProcessingStep(false)
        }
    }

    // Função para verificar se participante já existe no turno de destino
    const participantExistsInTarget = useCallback((participant: EventParticipant, targetParticipants: EventParticipant[]): boolean => {
        const sourceCpf = normalizeCpf(participant.cpf || '')
        const sourceName = normalizeName(participant.name || '')

        return targetParticipants.some(target => {
            const targetCpf = normalizeCpf(target.cpf || '')
            const targetName = normalizeName(target.name || '')

            // Verifica por CPF primeiro (mais confiável)
            if (sourceCpf && targetCpf && sourceCpf === targetCpf) {
                return true
            }

            // Se não tem CPF ou não bateu, verifica por nome
            if (sourceName && targetName && sourceName === targetName) {
                return true
            }

            return false
        })
    }, [normalizeCpf, normalizeName])

    // Função para replicar empresas no turno destino
    const replicateCompaniesForShift = useCallback(async (participantsToReplicate: EventParticipant[], targetShiftId: string, targetDateISO: string, targetStage: string, targetPeriod: string) => {
        const uniqueCompanies = new Set<string>()
        const companiesNeedingReplication: { name: string; empresa?: any; needsCreation?: boolean }[] = []

        // Extrair empresas únicas dos participantes que serão replicados
        participantsToReplicate.forEach(participant => {
            if (participant.company && participant.company.trim()) {
                uniqueCompanies.add(participant.company.trim())
            }
        })

        if (uniqueCompanies.size === 0) {
            console.log('📋 Nenhuma empresa para replicar')
            return { replicatedCount: 0, skippedCount: 0, createdCount: 0 }
        }

        console.log(`🏢 Analisando ${uniqueCompanies.size} empresas únicas para replicação`)

        // Para cada empresa única, verificar se já existe no turno destino
        for (const companyName of uniqueCompanies) {
            // Encontrar a empresa completa no array de empresas
            const empresa = empresasArray.find(emp => emp.nome === companyName)

            if (empresa) {
                // Verificar se já trabalha no turno destino (usar shiftId completo)
                const alreadyWorksInTargetShift = Array.isArray(empresa.days) && empresa.days.includes(targetShiftId)

                if (!alreadyWorksInTargetShift) {
                    companiesNeedingReplication.push({ name: companyName, empresa, needsCreation: false })
                    console.log(`➕ Empresa "${companyName}" precisa ser adicionada ao turno de destino`)
                } else {
                    console.log(`✅ Empresa "${companyName}" já trabalha no turno de destino`)
                }
            } else {
                // Empresa não existe no sistema - precisa ser criada
                companiesNeedingReplication.push({ name: companyName, needsCreation: true })
                console.log(`🆕 Empresa "${companyName}" não encontrada - será criada`)
            }
        }

        // Processar empresas que precisam de ação
        let replicatedCompaniesCount = 0
        let createdCompaniesCount = 0
        const skippedCompaniesCount = uniqueCompanies.size - companiesNeedingReplication.length

        for (const { name, empresa, needsCreation } of companiesNeedingReplication) {
            try {
                if (needsCreation) {
                    // Criar nova empresa
                    console.log(`🆕 Criando empresa "${name}" no sistema`)

                    await new Promise<void>((resolve, reject) => {
                        createEmpresa(
                            {
                                nome: name,
                                id_evento: String(params.id),
                                days: [targetShiftId],  // ✅ ShiftId completo 
                                shiftId: targetShiftId, // ✅ Campo necessário para exibição
                                workDate: targetDateISO, // ✅ Data ISO
                                workStage: targetStage as "evento" | "montagem" | "desmontagem" | undefined,  // ✅ Stage
                                workPeriod: targetPeriod as "diurno" | "noturno" | "dia_inteiro" | undefined, // ✅ Período

                            },
                            {
                                onSuccess: () => {
                                    console.log(`✅ Empresa "${name}" criada com sucesso`)
                                    createdCompaniesCount++
                                    resolve()
                                },
                                onError: (error) => {
                                    console.error(`❌ Erro ao criar empresa "${name}":`, error)
                                    reject(error)
                                }
                            }
                        )
                    })
                } else if (empresa) {
                    // Adicionar ao turno destino
                    console.log(`🔄 Adicionando "${name}" ao turno de destino`)

                    // Criar nova lista de dias incluindo o turno destino (usar shiftId completo)
                    const updatedDays = Array.isArray(empresa.days) ? [...empresa.days, targetShiftId] : [targetShiftId]

                    await new Promise<void>((resolve, reject) => {
                        updateEmpresa(
                            {
                                id: empresa.id,
                                data: {
                                    days: updatedDays
                                }
                            },
                            {
                                onSuccess: () => {
                                    console.log(`✅ Empresa "${name}" adicionada ao turno de destino`)
                                    replicatedCompaniesCount++
                                    resolve()
                                },
                                onError: (error) => {
                                    console.error(`❌ Erro ao replicar empresa "${name}":`, error)
                                    reject(error)
                                }
                            }
                        )
                    })
                }

                // Rate limiting inteligente para empresas
                await waitForRateLimit(companiesNeedingReplication.length - replicatedCompaniesCount - createdCompaniesCount)
            } catch (error) {
                console.error(`💥 Erro ao processar empresa "${name}":`, error)
            }
        }

        return {
            replicatedCount: replicatedCompaniesCount,
            skippedCount: skippedCompaniesCount,
            createdCount: createdCompaniesCount
        }
    }, [empresasArray, updateEmpresa, createEmpresa, params.id])

    // Função para replicar credenciais no turno destino
    const replicateCredentialsForShift = useCallback(async (participantsToReplicate: EventParticipant[], targetShiftId: string, targetDateISO: string, targetStage: string, targetPeriod: string) => {
        const uniqueCredentials = new Set<string>()
        const credentialsNeedingReplication: { id: string; credential: any }[] = []

        // Extrair credenciais únicas dos participantes que serão replicados
        participantsToReplicate.forEach(participant => {
            if (participant.credentialId) {
                uniqueCredentials.add(participant.credentialId)
            }
        })

        if (uniqueCredentials.size === 0) {
            console.log('🎫 Nenhuma credencial para replicar')
            return { replicatedCount: 0, skippedCount: 0 }
        }

        console.log(`🎫 Analisando ${uniqueCredentials.size} credenciais únicas para replicação`)

        // Para cada credencial única, verificar se já existe no turno destino
        for (const credentialId of uniqueCredentials) {
            // Encontrar a credencial completa no array de credenciais
            const credential = credentialsArray.find(cred => cred.id === credentialId)

            if (credential) {
                // Verificar se já trabalha no turno destino
                const alreadyWorksInTargetShift = Array.isArray(credential.days_works) && credential.days_works.includes(targetShiftId)

                if (!alreadyWorksInTargetShift) {
                    credentialsNeedingReplication.push({ id: credentialId, credential })
                    console.log(`➕ Credencial "${credential.nome}" precisa ser adicionada ao turno de destino`)
                } else {
                    console.log(`✅ Credencial "${credential.nome}" já trabalha no turno de destino`)
                }
            } else {
                console.log(`⚠️ Credencial ID "${credentialId}" não encontrada no sistema`)
            }
        }

        // Replicar credenciais que precisam
        let replicatedCredentialsCount = 0
        const skippedCredentialsCount = uniqueCredentials.size - credentialsNeedingReplication.length

        for (const { id, credential } of credentialsNeedingReplication) {
            try {
                console.log(`🔄 Adicionando credencial "${credential.nome}" ao turno de destino`)

                // Criar nova lista de dias incluindo o turno destino
                const updatedDaysWorks = Array.isArray(credential.days_works) ? [...credential.days_works, targetShiftId] : [targetShiftId]

                await new Promise<void>((resolve, reject) => {
                    updateCredential(
                        {
                            id: credential.id,
                            data: {
                                days_works: updatedDaysWorks
                            }
                        },
                        {
                            onSuccess: () => {
                                console.log(`✅ Credencial "${credential.nome}" adicionada ao turno de destino`)
                                replicatedCredentialsCount++
                                resolve()
                            },
                            onError: (error) => {
                                console.error(`❌ Erro ao replicar credencial "${credential.nome}":`, error)
                                reject(error)
                            }
                        }
                    )
                })

                // Rate limiting inteligente para credenciais
                await waitForRateLimit(credentialsNeedingReplication.length - replicatedCredentialsCount)
            } catch (error) {
                console.error(`💥 Erro ao replicar credencial "${credential.nome}":`, error)
            }
        }

        return {
            replicatedCount: replicatedCredentialsCount,
            skippedCount: skippedCredentialsCount
        }
    }, [credentialsArray, updateCredential])

    // Função para replicar staff rapidamente - versão corrigida com verificação de duplicatas
    const handleReplicateStaff = async () => {
        if (!replicateSourceDay || !selectedDay) return

        console.log('🚀 INICIANDO REPLICAÇÃO DE STAFF');
        console.log('📋 Parâmetros iniciais:', {
            turnoAtual: selectedDay,
            turnoDestino: replicateSourceDay,
            eventoId: params.id
        });

        setReplicatingStaff(replicateSourceDay)
        setShowReplicateDialog(false)

        try {
            // Extrair informações detalhadas do turno de origem e destino
            const sourceShiftInfo = parseShiftId(selectedDay) // Turno atual (origem)
            const targetShiftInfo = parseShiftId(replicateSourceDay) // Turno para replicar (destino)

            // Validar se os turnos são válidos
            if (!sourceShiftInfo.dateISO || !targetShiftInfo.dateISO) {
                toast.error('Formato de turno inválido. Verifique as datas selecionadas.')
                setReplicatingStaff(null)
                return
            }

            // Buscar todos os participantes que trabalham no turno atual (origem específica)
            const participantsFromCurrentShift = participantesDoDia

            console.log('🔄 Iniciando replicação de turno:')
            console.log('📅 Turno de origem:', {
                shiftId: selectedDay,
                data: sourceShiftInfo.dateFormatted,
                estágio: sourceShiftInfo.stage,
                período: sourceShiftInfo.period
            })
            console.log('🎯 Turno de destino:', {
                shiftId: replicateSourceDay,
                data: targetShiftInfo.dateFormatted,
                estágio: targetShiftInfo.stage,
                período: targetShiftInfo.period
            })
            console.log('👥 Participantes encontrados:', participantsFromCurrentShift.length)

            if (participantsFromCurrentShift.length === 0) {
                toast.warning('Nenhum participante encontrado no turno de origem.')
                setReplicatingStaff(null)
                return
            }

            // 🆕 BUSCAR PARTICIPANTES JÁ EXISTENTES NO TURNO DE DESTINO (BUSCA ATIVA)
            console.log('🔍 Fazendo busca ATIVA de participantes já existentes no turno de destino...')

            // Fazer busca ativa via API para garantir dados atualizados
            const targetShiftParticipants = await queryClient.fetchQuery<EventParticipant[]>({
                queryKey: [
                    "event-participants-by-shift",
                    { eventId: String(params.id), shiftId: replicateSourceDay, search: undefined, sortBy: "name", sortOrder: "asc" }
                ],
                queryFn: async () => {
                    try {
                        console.log('📡 Fazendo requisição API para turno de destino:', replicateSourceDay)

                        const { data } = await apiClient.get<{
                            data: EventParticipant[];
                            total: number;
                        }>(
                            `/event-participants/event/${String(params.id)}/shift/${encodeURIComponent(replicateSourceDay)}`
                        );

                        console.log(`✅ Resposta API recebida para turno destino:`, {
                            shiftId: replicateSourceDay,
                            participantesEncontrados: data?.data?.length || 0,
                            estruturaData: !!data?.data,
                            tipoResposta: typeof data
                        });

                        // Verificar se a resposta tem a estrutura esperada
                        if (data && typeof data === "object" && "data" in data) {
                            return Array.isArray(data.data) ? data.data : [];
                        }

                        // Fallback para resposta direta (compatibilidade)
                        if (Array.isArray(data)) {
                            return data;
                        }

                        return [];
                    } catch (error: any) {
                        if (error?.status === 404) {
                            console.log(`📋 Nenhum participante encontrado para o turno ${replicateSourceDay} (turno vazio)`);
                            return [];
                        }
                        console.error("❌ Erro ao buscar participantes do turno de destino:", error);
                        throw new Error("Erro ao buscar participantes do turno de destino");
                    }
                },
                staleTime: 0 // Forçar busca ativa, ignorar cache
            })

            console.log('📊 Participantes encontrados no turno de destino:', {
                turnoDestino: replicateSourceDay,
                totalParticipantes: targetShiftParticipants.length,
                todosParticipantes: targetShiftParticipants.map(p => ({
                    id: p.id,
                    name: p.name,
                    cpf: p.cpf,
                    company: p.company
                }))
            })

            console.log('📊 Análise de duplicatas:', {
                participantesOrigem: participantsFromCurrentShift.length,
                participantesDestino: targetShiftParticipants.length
            })

            // Filtrar participantes que NÃO existem no destino
            const participantsToReplicate = participantsFromCurrentShift.filter(participant => {
                const exists = participantExistsInTarget(participant, targetShiftParticipants)
                if (exists) {
                    console.log(`⏭️ PULANDO ${participant.name} (CPF: ${participant.cpf}) - já existe no turno de destino`)
                }
                return !exists
            })

            const skippedCount = participantsFromCurrentShift.length - participantsToReplicate.length

            console.log('📈 Resultado da análise:', {
                totalOrigem: participantsFromCurrentShift.length,
                jaExistem: skippedCount,
                paraReplicar: participantsToReplicate.length
            })

            if (participantsToReplicate.length === 0) {
                toast.info('Todos os participantes já existem no turno de destino. Nada para replicar.')
                setReplicatingStaff(null)
                return
            }

            // 🆕 REPLICAR EMPRESAS E CREDENCIAIS PRIMEIRO
            console.log('🏢 Iniciando replicação de empresas e credenciais...')

            let companiesResult = { replicatedCount: 0, skippedCount: 0, createdCount: 0 }
            let credentialsResult = { replicatedCount: 0, skippedCount: 0 }

            try {
                // Replicar empresas
                companiesResult = await replicateCompaniesForShift(
                    participantsToReplicate,
                    replicateSourceDay,
                    targetShiftInfo.dateISO,
                    targetShiftInfo.stage,
                    targetShiftInfo.period
                )
                console.log('🏢 Resultado empresas:', companiesResult)

                // Replicar credenciais  
                credentialsResult = await replicateCredentialsForShift(
                    participantsToReplicate,
                    replicateSourceDay,
                    targetShiftInfo.dateISO,
                    targetShiftInfo.stage,
                    targetShiftInfo.period
                )
                console.log('🎫 Resultado credenciais:', credentialsResult)
            } catch (error) {
                console.error('❌ Erro ao replicar empresas/credenciais:', error)
                toast.error('Erro ao replicar empresas ou credenciais. Continuando com participantes...')
            }

            // Calcular tempo estimado
            const totalOperations = participantsToReplicate.length + companiesResult.replicatedCount + companiesResult.createdCount + credentialsResult.replicatedCount
            const estimatedTime = estimateOperationTime(totalOperations)

            const totalBatches = Math.ceil(participantsToReplicate.length / BATCH_SIZE)
            console.log(`⏱️ Estimativa de tempo: ${Math.ceil(estimatedTime / 60000)} minutos para ${totalOperations} operações`)
            console.log(`📦 Processamento em ${totalBatches} lotes de ${BATCH_SIZE} itens`)
            toast.info(`Processamento otimizado: ${totalBatches} lotes, ~${Math.ceil(estimatedTime / 60000)} min`)

            // Inicializar dados de progresso com mais detalhes
            const startTime = Date.now()
            setProgressData({
                total: participantsToReplicate.length,
                current: 0,
                processed: 0,
                currentParticipant: '',
                estimatedTimeRemaining: estimatedTime,
                startTime,
                currentBatch: 0,
                totalBatches,
                operationsPerMinute: MAX_SAFE_OPS_PER_MINUTE
            })
            setShowProgressDialog(true)

            // Processar participantes usando batching inteligente
            const { success: successCount, errors: errorCount } = await processBatch(
                participantsToReplicate,
                async (participant: any, index: any) => {
                    const currentParticipantName = participant.name || 'Participante sem nome'

                    // Esta lógica foi movida para o callback de progresso

                    console.log(`➕ Replicando ${participant.name} (CPF: ${participant.cpf}) para o turno de destino`)


                    // Criar dados para novo participante (cópia) no turno de destino
                    const newParticipantData = {
                        eventId: participant.eventId || String(params.id),
                        name: participant.name || '',
                        cpf: participant.cpf || '',
                        role: participant.role || '',
                        company: participant.company || '',
                        email: participant.email || undefined,
                        phone: participant.phone || undefined,
                        credentialId: participant.credentialId || undefined,
                        shirtSize: participant.shirtSize || undefined,
                        notes: participant.notes || undefined,
                        daysWork: [replicateSourceDay],
                        shiftId: replicateSourceDay,
                        workDate: targetShiftInfo.dateISO,
                        workStage: targetShiftInfo.stage,
                        workPeriod: targetShiftInfo.period,
                        performedBy: 'replicacao-staff-batch'
                    }

                    // Criar novo participante via API com rate limiting automático
                    return new Promise<boolean>((resolve) => {
                        createParticipant(newParticipantData, {
                            onSuccess: () => {
                                console.log(`✅ ${participant.name} replicado com sucesso`)
                                resolve(true)
                            },
                            onError: (error) => {
                                console.error(`❌ Erro ao replicar ${participant.name}:`, error)
                                resolve(false)
                            },
                        })
                    })
                },
                (processed, total, current) => {
                    // Calcular progresso e tempo restante dinamicamente
                    const timeRemaining = calculateTimeRemaining(processed, total, startTime)
                    const currentBatch = Math.floor((processed - 1) / BATCH_SIZE) + 1
                    const opsPerMinute = processed > 0 ? Math.round((processed / (Date.now() - startTime)) * 60000) : 0

                    // Atualizar progresso em tempo real com estimativas precisas
                    setProgressData(prev => ({
                        ...prev,
                        current: processed,
                        processed,
                        currentParticipant: current,
                        estimatedTimeRemaining: timeRemaining,
                        currentBatch: Math.min(currentBatch, totalBatches),
                        operationsPerMinute: opsPerMinute
                    }))

                    // Log de progresso a cada 5 itens para não poluir console
                    if (processed % 5 === 0) {
                        console.log(`📊 Progresso: ${processed}/${total} (${Math.round(processed / total * 100)}%) - Lote ${currentBatch}/${totalBatches} - Restam ~${formatTime(timeRemaining)} - ${opsPerMinute} ops/min`)
                    }
                }
            )

            // Finalizar processo com relatório detalhado
            setTimeout(() => {
                setShowProgressDialog(false)
                setReplicatingStaff(null)

                // Exibir resultado detalhado
                const sourceDescription = `${sourceShiftInfo.dateFormatted} (${sourceShiftInfo.stage.toUpperCase()} - ${sourceShiftInfo.period === 'diurno' ? 'Diurno' : 'Noturno'})`
                const targetDescription = `${targetShiftInfo.dateFormatted} (${targetShiftInfo.stage.toUpperCase()} - ${targetShiftInfo.period === 'diurno' ? 'Diurno' : 'Noturno'})`

                // Construir mensagem com detalhes completos sobre replicação
                let message = `🎉 Replicação concluída!\n`
                message += `📊 Participantes:\n`
                message += `✅ ${successCount} criados\n`

                if (skippedCount > 0) {
                    message += `⏭️ ${skippedCount} pulados (já existiam)\n`
                }

                // Adicionar informações sobre empresas
                if (companiesResult.replicatedCount > 0 || companiesResult.skippedCount > 0 || companiesResult.createdCount > 0) {
                    message += `🏢 Empresas:\n`
                    if (companiesResult.createdCount > 0) {
                        message += `🆕 ${companiesResult.createdCount} criadas no sistema\n`
                    }
                    if (companiesResult.replicatedCount > 0) {
                        message += `✅ ${companiesResult.replicatedCount} adicionadas ao turno\n`
                    }
                    if (companiesResult.skippedCount > 0) {
                        message += `⏭️ ${companiesResult.skippedCount} já trabalhavam no turno\n`
                    }
                }

                // Adicionar informações sobre credenciais
                if (credentialsResult.replicatedCount > 0 || credentialsResult.skippedCount > 0) {
                    message += `🎫 Credenciais:\n`
                    if (credentialsResult.replicatedCount > 0) {
                        message += `✅ ${credentialsResult.replicatedCount} adicionadas ao turno\n`
                    }
                    if (credentialsResult.skippedCount > 0) {
                        message += `⏭️ ${credentialsResult.skippedCount} já trabalhavam no turno\n`
                    }
                }

                message += `📈 Total processado: ${participantsFromCurrentShift.length} participantes\n`
                message += `📅 De: ${sourceDescription}\n`
                message += `🎯 Para: ${targetDescription}`

                if (successCount > 0 || skippedCount > 0) {
                    if (successCount > 0) {
                        toast.success(message)
                    } else {
                        toast.info(
                            `ℹ️ Replicação concluída!\n` +
                            `⏭️ Todos os ${skippedCount} participantes já existiam no turno de destino.\n` +
                            `📅 De: ${sourceDescription}\n` +
                            `🎯 Para: ${targetDescription}`
                        )
                    }
                } else {
                    toast.warning('Nenhuma cópia de participante foi criada. Verifique os dados.')
                }

                // Invalidar queries para atualizar todas as visualizações
                queryClient.invalidateQueries({
                    queryKey: ['event-participants-by-event', String(params.id)]
                })
                queryClient.invalidateQueries({
                    queryKey: ['event-participants-grouped', String(params.id)]
                })
                queryClient.invalidateQueries({
                    queryKey: ['event-participants-by-shift', String(params.id), replicateSourceDay]
                })
                queryClient.invalidateQueries({
                    queryKey: ['event-participants-by-shift', String(params.id), selectedDay]
                })

                // Invalidar queries de empresas e credenciais
                queryClient.invalidateQueries({
                    queryKey: ['empresas-by-event', String(params.id)]
                })
                queryClient.invalidateQueries({
                    queryKey: ['credentials', String(params.id)]
                })

            }, 800)
        } catch (error) {
            console.error('💥 Erro geral na replicação:', error)
            setShowProgressDialog(false)
            setReplicatingStaff(null)

            // Mensagem de erro mais descritiva
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
            toast.error(`Erro ao replicar participantes: ${errorMessage}`)
        }
    }

    // Estados calculados memoizados
    const isLoading = useMemo(
        () =>
            eventosLoading ||
            participantsLoading ||
            (viewMode === 'grouped' ? groupedParticipantsLoading : shiftParticipantsLoading) ||
            coordenadoresLoading ||
            vagasLoading ||
            empresasLoading ||
            attendanceLoading,
        [
            eventosLoading,
            participantsLoading,
            groupedParticipantsLoading,
            shiftParticipantsLoading,
            viewMode,
            coordenadoresLoading,
            vagasLoading,
            empresasLoading,
            attendanceLoading,
        ],
    )

    // Estados separados para loading da página inicial e da tabela
    const isInitialLoading = useMemo(() => {
        return eventosLoading || (!evento && !eventosLoading)
    }, [eventosLoading, evento])

    const isTableLoading = useMemo(() => {
        return participantsLoading ||
            (viewMode === 'grouped' ? groupedParticipantsLoading : shiftParticipantsLoading) ||
            attendanceLoading
    }, [participantsLoading, groupedParticipantsLoading, shiftParticipantsLoading, viewMode, attendanceLoading])

    // Função para atualizar apenas a tabela
    const refreshTable = useCallback(async () => {
        if (!currentSelectedDay) {
            toast.error('Selecione um turno primeiro')
            return
        }

        setIsRefreshingTable(true)
        try {
            console.log('🔄 Iniciando atualização completa da tabela...', {
                eventId: params.id,
                currentSelectedDay,
                viewMode
            })

            // Invalidar TODAS as queries de participantes para forçar nova requisição
            console.log('🔄 Invalidando queries de participantes...')
            await Promise.all([
                // Query principal de participantes por evento
                queryClient.invalidateQueries({
                    queryKey: ['event-participants-by-event', String(params.id)]
                }),

                // Query de participantes agrupados
                queryClient.invalidateQueries({
                    queryKey: ['event-participants-grouped', String(params.id)]
                }),

                // Query de participantes por turno específico
                queryClient.invalidateQueries({
                    queryKey: ['event-participants-by-shift', String(params.id), currentSelectedDay]
                }),

                // Invalidar dados de attendance para a data atual
                queryClient.invalidateQueries({
                    queryKey: [
                        'event-attendance-by-event-date',
                        String(params.id),
                        formatDateForAPI(currentSelectedDay),
                    ]
                }),

                // Invalidar credenciais
                queryClient.invalidateQueries({
                    queryKey: ['credentials', String(params.id)]
                }),

                // Invalidar empresas
                queryClient.invalidateQueries({
                    queryKey: ['empresas-by-event', String(params.id)]
                }),

                // Invalidar coordenadores
                queryClient.invalidateQueries({
                    queryKey: ['coordenadores-by-event', String(params.id)]
                }),

                // Invalidar veículos
                queryClient.invalidateQueries({
                    queryKey: ['event-vehicles', String(params.id)]
                })
            ])

            // Remover todas as queries do cache e refetch
            console.log('🔄 Removendo cache e forçando refetch...')
            queryClient.removeQueries({
                queryKey: ['event-participants-by-event', String(params.id)]
            })

            if (viewMode === 'grouped') {
                queryClient.removeQueries({
                    queryKey: ['event-participants-grouped', String(params.id)]
                })
            } else {
                queryClient.removeQueries({
                    queryKey: ['event-participants-by-shift', String(params.id), currentSelectedDay]
                })
            }

            // Aguardar para dar tempo das novas requisições
            await new Promise(resolve => setTimeout(resolve, 800))

            console.log('✅ Tabela atualizada com sucesso - todas as queries invalidadas e refetchadas')
            toast.success('Dados da tabela atualizados com sucesso!')

        } catch (error) {
            console.error('❌ Erro ao atualizar tabela:', error)
            toast.error('Erro ao atualizar a tabela. Tente novamente.')
        } finally {
            setIsRefreshingTable(false)
        }
    }, [queryClient, params.id, viewMode, currentSelectedDay, formatDateForAPI])

    // Loading inicial da página
    if (isInitialLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8">
                    <div className="mb-6">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Carregando evento...</h2>
                    <p className="text-gray-500 text-sm">Aguarde enquanto carregamos os dados</p>
                </div>
            </div>
        )
    }

    // Early return se evento não existir após carregamento
    if (!evento && !eventosLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X className="w-8 h-8 text-red-500" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Evento não encontrado</h2>
                    <p className="text-gray-600 mb-6">O evento solicitado não existe ou foi removido.</p>
                    <Button onClick={() => router.back()} variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={evento?.name}>
            <div className="p-8">
                {/* Action Bar */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <Button

                                size="sm"
                                className="btn-brand-green"
                                onClick={() =>
                                    window.open(`/eventos/${params.id}/import-export`, '_blank')
                                }
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Importar/Exportar
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300 bg-white shadow-sm transition-all duration-200"
                                onClick={() => router.push(`/eventos/${params.id}/dashboard`)}
                            >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Análises
                            </Button>

                            {/* 🆕 Botão de duplicatas do turno atual */}
                            {currentShiftDuplicates.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-white shadow-sm transition-all duration-200"
                                    onClick={() => setShowDuplicatesManagerModal(true)}
                                    disabled={isLoading}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Duplicatas no Turno ({currentShiftDuplicates.length})
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Toggle para modo de visualização */}
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">

                                <button
                                    onClick={() => setViewMode('shift')}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${viewMode === 'shift'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <Clock className="w-4 h-4 mr-1 inline" />
                                    Por Turno
                                </button>
                            </div>



                            <Button
                                onClick={() => setShowAdicionarStaffModal(true)}
                                disabled={isTableLoading}
                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Staff
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Search Bar - Estilo do credenciamento */}
                <div className="mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="relative max-w-md mb-4">
                            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${isFilteringInProgress ? 'text-orange-500 animate-pulse' :
                                hasActiveFilters ? 'text-blue-500' : 'text-gray-400'
                                }`} />
                            <Input
                                type="text"
                                placeholder="🔍 Busca inteligente: nome, iniciais, CPF, empresa, função..."
                                value={filters.searchTerm}
                                onChange={e => updateFilter('searchTerm', e.target.value)}
                                className={`pl-10 pr-10 text-gray-600 bg-white shadow-sm transition-all duration-200 ${isFilteringInProgress ? 'border-orange-300 ring-2 ring-orange-100' :
                                    hasActiveFilters ? 'border-blue-300 ring-2 ring-blue-100' :
                                        'border-gray-200 focus:border-purple-500 focus:ring-purple-500'
                                    }`}
                            />
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Limpar busca"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            {isFilteringInProgress && (
                                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* Resumo de filtros aplicados */}
                        {hasActiveFilters && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-900">
                                            Filtros aplicados: {filteredParticipants.length} de {participantesDoDia.length} participantes
                                            {isFilteringInProgress && (
                                                <span className="ml-2 text-blue-600">
                                                    <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin inline-block"></div>
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {filters.searchTerm && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Busca: &quot;{filters.searchTerm} &quot;
                                            </span>
                                        )}
                                        {filters.empresa && filters.empresa !== 'all' && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Empresa: {filters.empresa}
                                            </span>
                                        )}
                                        {filters.funcao && filters.funcao !== 'all' && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                Função: {filters.funcao}
                                            </span>
                                        )}
                                        {filters.checkedIn && filters.checkedIn !== 'all' && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                Status: {filters.checkedIn === 'checked-in' ? 'Check-in' :
                                                    filters.checkedIn === 'checked-out' ? 'Check-out' :
                                                        filters.checkedIn === 'not-checked-in' ? 'Não fez check-in' : filters.checkedIn}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filtros Otimizados - Renderizar apenas quando há participantes */}
                {currentSelectedDay && participantesDoDia.length > 0 && (
                    <OptimizedFilters
                        filters={filters}
                        popoverStates={popoverStates}
                        dayStats={dayStats}
                        uniqueEmpresas={uniqueEmpresasFiltered}
                        uniqueFuncoes={uniqueFuncoes}
                        uniqueCredenciais={uniqueCredenciais}
                        participantesDoDia={participantesDoDia}
                        filteredParticipants={filteredParticipants}
                        hasActiveFilters={hasActiveFilters}
                        isFilteringInProgress={isFilteringInProgress}
                        onUpdateFilter={updateFilter}
                        onClearFilters={clearFilters}
                        onSetPopoverState={setPopoverState}
                    />
                )}

                <span></span>

                {/* Tabs dos dias do evento */}
                {eventDays.length > 0 && (
                    <div className="mb-8">
                        <div className="border-b border-gray-200 bg-white rounded-t-lg relative">
                            {/* Container dos tabs sem scroll horizontal */}
                            <nav className="-mb-px flex flex-wrap gap-1 px-4 py-2">
                                {eventDays.map(day => {
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
                                                            {day.type === 'montagem' ? 'MONTAGEM' :
                                                                day.type === 'evento' ? 'EVENTO' :
                                                                    day.type === 'desmontagem' ? 'DESMONTAGEM' :
                                                                        day.type.toUpperCase()}
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
                                            {isActive && (
                                                <div className="flex gap-1">

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`eventos/${evento?.id}/replicacao`)}

                                                        className="text-xs h-6 px-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                                    >

                                                        <Users className="w-3 h-3 mr-1" />
                                                        Replicar Participantes

                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </nav>
                        </div>
                    </div>
                )}

                {/* Barra de ações em massa */}
                {selectedParticipants.size > 0 && (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-blue-900">
                                    {selectedParticipants.size} participante(s) selecionado(s)
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearSelection}
                                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Limpar seleção
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => setShowBulkEditModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <UserCog className="w-4 h-4 mr-2" />
                                    Editar em massa
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowBulkResetModal(true)}
                                    className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 hover:border-yellow-400"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset check-in
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowBulkDeleteModal(true)}
                                    className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir em massa
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabela Virtualizada - Com loading overlay */}
                <div className="relative">
                    {currentSelectedDay && (
                        <VirtualizedParticipantsTable
                            participants={filteredParticipants}
                            selectedParticipants={selectedParticipants}
                            currentSelectedDay={currentSelectedDay}
                            hasCheckIn={hasCheckIn}
                            hasCheckOut={hasCheckOut}
                            onToggleParticipant={toggleParticipantSelection}
                            onSelectAll={selectAllParticipants}
                            onCheckIn={abrirCheckin}
                            onCheckOut={abrirCheckout}
                            onReset={abrirResetCheckin}
                            onDelete={handleDeleteParticipant}
                            onEdit={handleEditParticipant}
                            credentials={Array.isArray(credentials) ? credentials : []}
                            isLoading={isTableLoading}
                            loading={loading}
                        />
                    )}

                    {/* Loading overlay para tabela */}
                    {isTableLoading && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                            <div className="text-center p-6">
                                <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                                <p className="text-purple-600 font-medium text-sm">Atualizando dados...</p>
                                <p className="text-gray-500 text-xs mt-1">Carregando participantes</p>
                            </div>
                        </div>
                    )}

                    {/* Mensagem quando não há dados para mostrar */}
                    {!isTableLoading && currentSelectedDay && filteredParticipants.length === 0 && (
                        <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <User className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    {hasActiveFilters ? 'Nenhum resultado encontrado' : 'Nenhum participante neste turno'}
                                </h3>
                                <p className="text-gray-500 text-sm max-w-md">
                                    {hasActiveFilters
                                        ? 'Tente ajustar os filtros de busca para encontrar participantes.'
                                        : 'Não há participantes cadastrados para este turno. Adicione participantes ou selecione outro turno.'}
                                </p>
                                {hasActiveFilters && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="mt-4"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Limpar Filtros
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dialog de Confirmação de Exclusão de Participante */}
            <AlertDialog
                open={!!deletingParticipant}
                onOpenChange={open => !open && setDeletingParticipant(null)}
            >
                <AlertDialogContent className="bg-white text-black max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deletingParticipant && deletingParticipantHash && (() => {
                                const { dateFormatted, period, stage } = parseShiftId(currentSelectedDay);
                                const group = groupedParticipantsData.find(g => g.participantHash === deletingParticipantHash);
                                const totalShifts = group ? group.shifts.length : 1;

                                if (deleteMode === 'shift' && totalShifts > 1) {
                                    return (
                                        <div className="space-y-4">
                                            <p>
                                                Remover <strong>{deletingParticipant.name}</strong> apenas do turno atual:
                                            </p>
                                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                                <div className="flex items-center gap-2">
                                                    {getPeriodIcon(period)}
                                                    <span className="font-medium">
                                                        {dateFormatted} ({stage.toUpperCase()} - {period === 'diurno' ? 'Diurno' : 'Noturno'})
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                O participante continuará trabalhando em {totalShifts - 1} outro(s) turno(s).
                                            </p>

                                            {/* Opção de remover de todos os turnos */}
                                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(deleteMode as 'shift' | 'all') === 'all'}
                                                        onChange={(e) => setDeleteMode(e.target.checked ? 'all' as 'all' : 'shift' as 'shift')}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <span className="text-sm text-yellow-800">
                                                        Remover de <strong>todos os {totalShifts} turnos</strong> (exclusão completa)
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="space-y-3">
                                            <p>
                                                <strong>ATENÇÃO:</strong> {totalShifts === 1
                                                    ? `Esta é a única participação de ${deletingParticipant.name}.`
                                                    : `Removendo ${deletingParticipant.name} de todos os ${totalShifts} turnos.`
                                                }
                                            </p>
                                            <div className="bg-red-50 border border-red-200 rounded p-3">
                                                <div className="flex items-center gap-2">
                                                    {getPeriodIcon(period)}
                                                    <span className="font-medium text-red-800">
                                                        {totalShifts === 1
                                                            ? `${dateFormatted} (${stage.toUpperCase()} - ${period === 'diurno' ? 'Diurno' : 'Noturno'})`
                                                            : `Todos os ${totalShifts} turnos`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-red-600">
                                                O participante será <strong>completamente excluído</strong> do evento.
                                            </p>
                                        </div>
                                    );
                                }
                            })()}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteParticipant}
                            disabled={isDeleting || isDeletingFromShift || isDeletingAllShifts}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {(isDeleting || isDeletingFromShift || isDeletingAllShifts) ? 'Processando...' :
                                deleteMode === 'shift' ? 'Remover do Turno' : 'Excluir Completamente'
                            }
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Replicação de Staff */}
            <AlertDialog
                open={showReplicateDialog}
                onOpenChange={setShowReplicateDialog}
            >
                <AlertDialogContent className="bg-white text-black max-w-lg max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-green-600" />
                            Replicar Participantes por Turno
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Replique participantes do turno atual para outro turno específico, considerando data, período e estágio.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Informações do Turno Atual (Origem) */}
                        {selectedDay && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">
                                            Turno de Origem
                                        </span>
                                    </div>
                                    {(() => {
                                        const sourceInfo = parseShiftId(selectedDay)
                                        return getPeriodIcon(sourceInfo.period)
                                    })()}
                                </div>
                                {(() => {
                                    const sourceInfo = parseShiftId(selectedDay)
                                    return (
                                        <div className="space-y-1">
                                            <div className="text-xs text-blue-700 font-medium">
                                                📅 {sourceInfo.dateFormatted} • {sourceInfo.stage.toUpperCase()} • {sourceInfo.period === 'diurno' ? 'Turno Diurno' : 'Turno Noturno'}
                                            </div>
                                            <div className="text-xs text-blue-600">
                                                👥 {participantesDoDia.length} participante(s) serão replicados
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}

                        {/* Seleção do Turno de Destino */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Turno de Destino
                            </label>
                            <select
                                value={replicateSourceDay}
                                onChange={e => setReplicateSourceDay(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            >
                                <option value="">Selecione o turno de destino</option>
                                {getEventDays()
                                    .filter(day => day.id !== selectedDay) // Excluir o turno atual
                                    .map(day => {
                                        const dayInfo = parseShiftId(day.id)
                                        const participantCount = getParticipantsCountByShift(day.id)
                                        return (
                                            <option key={day.id} value={day.id}>
                                                {dayInfo.dateFormatted} • {dayInfo.stage.toUpperCase()} • {dayInfo.period === 'diurno' ? 'Diurno' : 'Noturno'} ({participantCount} participante(s) atuais)
                                            </option>
                                        )
                                    })}
                            </select>
                        </div>

                        {/* Preview do Turno de Destino */}
                        {replicateSourceDay && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4 text-green-600" />
                                        <span className="text-sm font-medium text-green-800">
                                            Turno de Destino
                                        </span>
                                    </div>
                                    {(() => {
                                        const targetInfo = parseShiftId(replicateSourceDay)
                                        return getPeriodIcon(targetInfo.period)
                                    })()}
                                </div>
                                {(() => {
                                    const targetInfo = parseShiftId(replicateSourceDay)
                                    const currentParticipants = getParticipantsCountByShift(replicateSourceDay)
                                    return (
                                        <div className="space-y-1">
                                            <div className="text-xs text-green-700 font-medium">
                                                🎯 {targetInfo.dateFormatted} • {targetInfo.stage.toUpperCase()} • {targetInfo.period === 'diurno' ? 'Turno Diurno' : 'Turno Noturno'}
                                            </div>
                                            <div className="text-xs text-green-600">
                                                📊 {currentParticipants} participante(s) já cadastrados neste turno
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}

                        {/* Informações sobre a replicação */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">
                                    Como funciona a replicação
                                </span>
                            </div>
                            <div className="text-xs text-yellow-700 space-y-1">
                                <div>✅ <strong>Copiado:</strong> Nome, CPF, função, empresa e credencial</div>
                                <div>🔄 <strong>Limpo:</strong> Dados de check-in/check-out (começam zerados)</div>
                                <div>⏭️ <strong>Duplicados:</strong> Participantes já no turno destino são ignorados</div>
                                <div>🎯 <strong>Precisão:</strong> Replicação específica por turno (data + período + estágio)</div>
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReplicateStaff}
                            disabled={!replicateSourceDay || participantesDoDia.length === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {replicatingStaff ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Replicando...
                                </>
                            ) : (
                                <>
                                    <Users className="w-4 h-4 mr-2" />
                                    Confirmar Replicação
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Popup de Progresso */}
            <AlertDialog
                open={showProgressDialog}
                onOpenChange={setShowProgressDialog}
            >
                <AlertDialogContent className="max-w-md bg-white text-black max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            Replicando Participantes
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Atualizando dias de trabalho...
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4">
                        {/* Barra de Progresso */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progresso</span>
                                <span>
                                    {progressData.current} / {progressData.total}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${progressData.total > 0
                                            ? (progressData.current / progressData.total) * 100
                                            : 0
                                            }%`,
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Participante Atual */}
                        {progressData.currentParticipant && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                        Processando: {progressData.currentParticipant}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Estatísticas */}
                        <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                            <div className="font-bold text-green-700 text-lg">
                                {progressData.processed}
                            </div>
                            <div className="text-sm text-green-600">
                                Participantes processados
                            </div>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* DIALOG DUPLICADOS */}
            {/* This section is no longer needed as the import/export system handles duplicates */}

            {/* DIALOG RESUMO IMPORTAÇÃO */}
            {/* This section is no longer needed as the import/export system handles resumo */}

            {/* Dialog de Check-in */}
            <AlertDialog open={popupCheckin} onOpenChange={setPopupCheckin}>
                <AlertDialogContent className="bg-white text-black max-w-lg max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-600" />
                            {isEditingAttendance ? 'Editar Presença' : 'Realizar Check-in'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isEditingAttendance
                                ? 'Edite os dados de presença do participante. Você pode alterar datas, horários e código da pulseira.'
                                : 'Realize o check-in do participante. O código da pulseira é opcional.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Debug: mostrar valor de isEditingAttendance */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs text-gray-500 mb-2">
                                Debug: isEditingAttendance = {String(isEditingAttendance)}
                            </div>
                        )}
                        {isEditingAttendance ? (
                            <>
                                {/* Campos para edição */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Data Check-in
                                        </label>
                                        <Input
                                            type="date"
                                            value={editCheckinDate}
                                            onChange={e => setEditCheckinDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hora Check-in
                                        </label>
                                        <Input
                                            type="time"
                                            value={editCheckinTime}
                                            onChange={e => setEditCheckinTime(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Data Check-out (opcional)
                                        </label>
                                        <Input
                                            type="date"
                                            value={editCheckoutDate}
                                            onChange={e => setEditCheckoutDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hora Check-out (opcional)
                                        </label>
                                        <Input
                                            type="time"
                                            value={editCheckoutTime}
                                            onChange={e => setEditCheckoutTime(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : null}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Código da Pulseira (opcional)
                            </label>
                            <Input
                                type="text"
                                value={codigoPulseira}
                                onChange={e => setCodigoPulseira(e.target.value)}
                                placeholder="Digite o código da pulseira (opcional)"
                                className="w-full"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        confirmarCheckin()
                                    }
                                }}
                            />
                        </div>

                        {participantAction && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                        {participantAction.name}
                                    </span>
                                </div>
                                <div className="text-xs text-blue-700 mt-1">
                                    CPF: {participantAction.cpf}
                                </div>
                                {isEditingAttendance && (
                                    <div className="text-xs text-amber-700 mt-1 font-medium">
                                        ⚠️ Modo de edição - Alterando dados existentes
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarCheckin}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {loading ? 'Processando...' : (isEditingAttendance ? 'Salvar Alterações' : 'Confirmar Check-in')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Check-out */}
            <AlertDialog open={popupCheckout} onOpenChange={setPopupCheckout}>
                <AlertDialogContent className="bg-white text-black max-w-md max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-red-600" />
                            Realizar Check-out
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Confirme o check-out do participante.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {participantAction && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-800">
                                        {participantAction.name}
                                    </span>
                                </div>
                                <div className="text-xs text-red-700 mt-1">
                                    CPF: {participantAction.cpf}
                                </div>
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarCheckout}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {loading ? 'Processando...' : 'Confirmar Check-out'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Reset Check-in */}
            <AlertDialog open={popupResetCheckin} onOpenChange={setPopupResetCheckin}>
                <AlertDialogContent className="bg-white text-black max-w-md max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-yellow-600" />
                            Resetar Check-in
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação irá remover o registro de check-in do participante. Você
                            tem certeza que deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {participantAction && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-yellow-600" />
                                    <span className="text-sm font-medium text-yellow-800">
                                        {participantAction.name}
                                    </span>
                                </div>
                                <div className="text-xs text-yellow-700 mt-1">
                                    CPF: {participantAction.cpf}
                                </div>
                            </div>
                        )}

                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <X className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-800">
                                    Atenção
                                </span>
                            </div>
                            <div className="text-xs text-red-700">
                                • O registro de check-in será removido permanentemente
                                <br />
                                • O participante ficará como &quot;não presente&quot; no dia
                                selecionado
                                <br />• Esta ação ficará registrada no histórico
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetCheckin}
                            disabled={loading}
                            className="bg-yellow-600 hover:bg-yellow-700"
                        >
                            {loading ? 'Processando...' : 'Resetar Check-in'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Adicionar Staff */}
            <ModalAdicionarStaff
                isOpen={showAdicionarStaffModal}
                onClose={() => setShowAdicionarStaffModal(false)}
                eventId={String(params.id)}
                selectedDay={selectedDay}
                evento={evento}
                onSuccess={() => {
                    // Recarregar dados se necessário
                    console.log('Staff adicionado com sucesso!')
                }}
            />

            {/* Modal de Editar Staff */}
            <ModalEditarStaff
                isOpen={showEditarStaffModal}
                onClose={() => setShowEditarStaffModal(false)}
                eventId={String(params.id)}
                participant={participantToEdit}
                selectedDay={selectedDay}
                evento={evento}
                onSuccess={handleEditSuccess}
            />

            {/* Modal de Edição em Massa */}
            <AlertDialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
                <AlertDialogContent className="bg-white text-black max-w-md max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-blue-600" />
                            Editar em Massa
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Edite {selectedParticipants.size} participante(s) selecionado(s).
                            Apenas os campos preenchidos serão atualizados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Seleção de Credencial */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Credencial
                            </label>
                            <Popover open={bulkCredentialPopoverOpen} onOpenChange={setBulkCredentialPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={bulkCredentialPopoverOpen}
                                        className="w-full justify-between bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        {bulkEditData.credentialId === 'no-change' ? (
                                            <span className="text-gray-500">Não alterar</span>
                                        ) : bulkEditData.credentialId ? (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full border-2 border-black"
                                                    style={{ backgroundColor: credentialsArray.find(c => c.id === bulkEditData.credentialId)?.cor }}
                                                />
                                                {credentialsArray.find(c => c.id === bulkEditData.credentialId)?.nome}
                                            </div>
                                        ) : (
                                            <span className="text-gray-500">Selecione uma credencial (opcional)</span>
                                        )}
                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0 bg-white" align="start">
                                    <Command>
                                        <CommandInput placeholder="Pesquisar credencial..." className="h-9" />
                                        <CommandEmpty>Nenhuma credencial encontrada.</CommandEmpty>
                                        <CommandList>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="no-change"
                                                    onSelect={() => {
                                                        setBulkEditData(prev => ({ ...prev, credentialId: 'no-change' }))
                                                        setBulkCredentialPopoverOpen(false)
                                                    }}
                                                    className="hover:bg-gray-100 hover:cursor-pointer"
                                                >
                                                    <Check
                                                        className={`mr-2 h-4 w-4 ${bulkEditData.credentialId === 'no-change' ? 'opacity-100' : 'opacity-0'
                                                            }`}
                                                    />
                                                    <span className="text-gray-600">Não alterar</span>
                                                </CommandItem>
                                                <CommandItem
                                                    value="remover-credencial"
                                                    onSelect={() => {
                                                        setBulkEditData(prev => ({ ...prev, credentialId: '' }))
                                                        setBulkCredentialPopoverOpen(false)
                                                    }}
                                                    className="hover:bg-gray-100 hover:cursor-pointer"
                                                >
                                                    <Check
                                                        className={`mr-2 h-4 w-4 ${bulkEditData.credentialId === '' ? 'opacity-100' : 'opacity-0'
                                                            }`}
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full border-2 border-gray-400 bg-gray-200" />
                                                        <span className="text-gray-600">SEM CREDENCIAL</span>
                                                    </div>
                                                </CommandItem>
                                                {credentialsArray
                                                    .filter(c => c.isActive !== false)
                                                    .map(credential => (
                                                        <CommandItem
                                                            key={credential.id}
                                                            value={credential.nome}
                                                            onSelect={() => {
                                                                setBulkEditData(prev => ({ ...prev, credentialId: credential.id }))
                                                                setBulkCredentialPopoverOpen(false)
                                                            }}
                                                            className="hover:bg-gray-100 hover:cursor-pointer"
                                                        >
                                                            <Check
                                                                className={`mr-2 h-4 w-4 ${bulkEditData.credentialId === credential.id ? 'opacity-100' : 'opacity-0'
                                                                    }`}
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full border-2 border-black"
                                                                    style={{ backgroundColor: credential.cor }}
                                                                />
                                                                {credential.nome}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Campo Função */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Função
                            </label>
                            <Input
                                type="text"
                                value={bulkEditData.role}
                                onChange={e =>
                                    setBulkEditData(prev => ({ ...prev, role: e.target.value }))
                                }
                                placeholder="Nova função (opcional)"
                                className="w-full"
                            />
                        </div>

                        {/* Campo Empresa */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Empresa
                            </label>
                            <Popover open={bulkEmpresaPopoverOpen} onOpenChange={setBulkEmpresaPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={bulkEmpresaPopoverOpen}
                                        className="w-full justify-between bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        style={{ textTransform: 'uppercase' }}
                                    >
                                        {bulkEditData.company === 'no-change' ? (
                                            <span className="text-gray-500">NÃO ALTERAR</span>
                                        ) : bulkEditData.company ? (
                                            <span>{bulkEditData.company}</span>
                                        ) : (
                                            <span className="text-gray-500">SELECIONE UMA EMPRESA (OPCIONAL)</span>
                                        )}
                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0 bg-white" align="start">
                                    <Command>
                                        <CommandInput placeholder="Pesquisar empresa..." className="h-9" />
                                        <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                                        <CommandList>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="no-change"
                                                    onSelect={() => {
                                                        setBulkEditData(prev => ({ ...prev, company: 'no-change' }))
                                                        setBulkEmpresaPopoverOpen(false)
                                                    }}
                                                    className="hover:bg-gray-100 hover:cursor-pointer"
                                                >
                                                    <Check
                                                        className={`mr-2 h-4 w-4 ${bulkEditData.company === 'no-change' ? 'opacity-100' : 'opacity-0'
                                                            }`}
                                                    />
                                                    <span className="text-gray-600" style={{ textTransform: 'uppercase' }}>NÃO ALTERAR</span>
                                                </CommandItem>
                                                {empresas?.map(empresa => (
                                                    <CommandItem
                                                        key={empresa.id}
                                                        value={empresa.nome}
                                                        onSelect={() => {
                                                            setBulkEditData(prev => ({ ...prev, company: empresa.nome }))
                                                            setBulkEmpresaPopoverOpen(false)
                                                        }}
                                                        className="hover:bg-gray-100 hover:cursor-pointer"
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${bulkEditData.company === empresa.nome ? 'opacity-100' : 'opacity-0'
                                                                }`}
                                                        />
                                                        <span style={{ textTransform: 'uppercase' }}>{empresa.nome.toUpperCase()}</span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Aviso */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <UserCog className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">
                                    Atenção
                                </span>
                            </div>
                            <div className="text-xs text-yellow-700">
                                Esta ação irá alterar os dados de {selectedParticipants.size}{' '}
                                participante(s). Apenas os campos preenchidos serão atualizados.
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setBulkEditData({
                                    credentialId: 'no-change',
                                    role: '',
                                    company: 'no-change',
                                })
                                setBulkCredentialPopoverOpen(false)
                                setBulkEmpresaPopoverOpen(false)
                            }}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkEdit}
                            disabled={
                                bulkEditLoading ||
                                ((!bulkEditData.credentialId ||
                                    bulkEditData.credentialId === 'no-change') &&
                                    !bulkEditData.role &&
                                    (!bulkEditData.company ||
                                        bulkEditData.company === 'no-change'))
                            }
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {bulkEditLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                'Atualizar Participantes'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Exclusão em Massa */}
            <AlertDialog open={showBulkDeleteModal} onOpenChange={setShowBulkDeleteModal}>
                <AlertDialogContent className="bg-white text-black max-w-md max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            Excluir Participantes em Massa
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a excluir {selectedParticipants.size} participante(s) selecionado(s).
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Trash2 className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-800">
                                    Atenção - Ação Irreversível
                                </span>
                            </div>
                            <div className="text-xs text-red-700 space-y-1">
                                <div>• {selectedParticipants.size} participante(s) serão permanentemente removidos</div>
                                <div>• Todos os dados de check-in/check-out serão perdidos</div>
                                <div>• Esta ação ficará registrada no histórico do sistema</div>
                                <div>• Esta operação não pode ser desfeita</div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">
                                    Participantes Selecionados
                                </span>
                            </div>
                            <div className="text-xs text-yellow-700">
                                {selectedParticipants.size} participante(s) do dia {currentSelectedDay} serão excluídos
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {bulkDeleteLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Confirmar Exclusão
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Reset de Check-in em Massa */}
            <AlertDialog open={showBulkResetModal} onOpenChange={setShowBulkResetModal}>
                <AlertDialogContent className="bg-white text-black max-w-md max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-yellow-600" />
                            Resetar Check-in em Massa
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a resetar o check-in de {selectedParticipants.size} participante(s) selecionado(s).
                            Todos os dados de presença deles serão removidos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <RotateCcw className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">
                                    Atenção - Reset de Presença
                                </span>
                            </div>
                            <div className="text-xs text-yellow-700 space-y-1">
                                <div>• {selectedParticipants.size} participante(s) terão check-in/check-out removidos</div>
                                <div>• Todos os dados de presença serão perdidos para estes participantes</div>
                                <div>• Os participantes ficarão com status &quot;pendente&quot; novamente</div>
                                <div>• Esta ação ficará registrada no histórico do sistema</div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                    Participantes Selecionados
                                </span>
                            </div>
                            <div className="text-xs text-blue-700">
                                {selectedParticipants.size} participante(s) do dia {currentSelectedDay} terão check-in resetado
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkReset}
                            disabled={bulkResetLoading}
                            className="bg-yellow-600 hover:bg-yellow-700"
                        >
                            {bulkResetLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Resetando...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Confirmar Reset
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Remoção de Duplicados */}
            <AlertDialog
                open={showDuplicatesModal}
                onOpenChange={setShowDuplicatesModal}
            >
                <AlertDialogContent className="bg-white text-black max-w-4xl max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            Remover Participantes Duplicados
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Foram encontrados {duplicates.length} grupos de participantes
                            duplicados. O primeiro de cada grupo será mantido, os demais serão
                            removidos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {duplicates.map((duplicate, index) => (
                            <div
                                key={index}
                                className="border border-red-200 rounded-lg p-4 bg-red-50"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-800">
                                        CPF: {duplicate.cpf} ({duplicate.reason})
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {duplicate.participants.map(
                                        (participant, participantIndex) => (
                                            <div
                                                key={participant.id}
                                                className={`p-3 rounded border ${participantIndex === 0
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-100 border-red-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium">
                                                        {participant.name}
                                                    </span>
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded ${participantIndex === 0
                                                            ? 'bg-green-200 text-green-800'
                                                            : 'bg-red-200 text-red-800'
                                                            }`}
                                                    >
                                                        {participantIndex === 0 ? 'MANTER' : 'REMOVER'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600 space-y-1">
                                                    <div>Função: {participant.role}</div>
                                                    <div>Empresa: {participant.company}</div>
                                                    {participant.daysWork && (
                                                        <div>Dias: {participant.daysWork.join(', ')}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">
                                    Atenção
                                </span>
                            </div>
                            <div className="text-xs text-yellow-700">
                                • Esta ação não pode ser desfeita
                                <br />• Serão removidos{' '}
                                {duplicates.reduce(
                                    (acc, d) => acc + (d.participants.length - 1),
                                    0,
                                )}{' '}
                                participantes duplicados
                                <br />• Os dados de check-in/check-out dos participantes
                                removidos serão perdidos
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveDuplicates}
                            disabled={duplicatesLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {duplicatesLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Removendo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remover{' '}
                                    {duplicates.reduce(
                                        (acc, d) => acc + (d.participants.length - 1),
                                        0,
                                    )}{' '}
                                    Duplicados
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 🆕 Modal de Gerenciamento de Duplicatas do Turno Atual */}
            <AlertDialog open={showDuplicatesManagerModal} onOpenChange={setShowDuplicatesManagerModal}>
                <AlertDialogContent className="bg-white text-black max-w-5xl max-h-[85vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-red-600" />
                            Gerenciar Duplicatas do Turno
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Foram encontradas {currentShiftDuplicates.length} duplicatas no turno atual.
                            Selecione quais participantes deseja remover.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Estatísticas */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">
                                            Turno Atual: {currentSelectedDay}
                                        </span>
                                    </div>
                                    <div className="text-xs text-blue-700">
                                        {currentShiftDuplicates.length} grupo(s) de duplicatas • {selectedDuplicatesForRemoval.size} selecionado(s) para remoção
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            // Manter apenas o primeiro participante de cada grupo
                                            const toRemove = new Set<string>()
                                            currentShiftDuplicates.forEach(duplicate => {
                                                // Selecionar todos exceto o primeiro (índice 0)
                                                duplicate.participants.slice(1).forEach(participant => {
                                                    toRemove.add(participant.id)
                                                })
                                            })
                                            setSelectedDuplicatesForRemoval(toRemove)
                                        }}
                                        disabled={duplicatesManagerLoading || currentShiftDuplicates.length === 0}
                                        className="bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                                    >
                                        Manter 1º para Todos
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearDuplicateSelection}
                                        disabled={duplicatesManagerLoading}
                                    >
                                        Limpar Seleção
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Lista de duplicatas */}
                        {currentShiftDuplicates.map((duplicate, index) => (
                            <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-red-600" />
                                        <span className="text-sm font-medium text-red-800">
                                            {duplicate.cpf ? `CPF: ${duplicate.cpf}` : `Nome: ${duplicate.name}`}
                                        </span>
                                        <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded">
                                            {duplicate.reason}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSelectAllDuplicatesInGroup(duplicate.participants, true)}
                                            disabled={duplicatesManagerLoading}
                                        >
                                            Manter 1º
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSelectAllDuplicatesInGroup(duplicate.participants, false)}
                                            disabled={duplicatesManagerLoading}
                                        >
                                            Selecionar Todos
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {duplicate.participants.map((participant, participantIndex) => {
                                        const isSelected = selectedDuplicatesForRemoval.has(participant.id)
                                        const isFirst = participantIndex === 0

                                        return (
                                            <div
                                                key={participant.id}
                                                className={`p-3 rounded border cursor-pointer transition-all ${isSelected
                                                    ? 'bg-red-100 border-red-400 ring-2 ring-red-200'
                                                    : isFirst
                                                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                onClick={() => handleToggleDuplicateSelection(participant.id)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium truncate">
                                                        {participant.name}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {isFirst && (
                                                            <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                                                PRIMEIRO
                                                            </span>
                                                        )}
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleDuplicateSelection(participant.id)}
                                                            className="w-4 h-4"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="text-xs text-gray-600 space-y-1">
                                                    {participant.cpf && <div>CPF: {participant.cpf}</div>}
                                                    <div>Função: {participant.role || 'N/A'}</div>
                                                    <div>Empresa: {participant.company || 'N/A'}</div>
                                                    <div>ID: {participant.id}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Aviso */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">
                                    ⚠️ Atenção - Remoção do Turno
                                </span>
                            </div>
                            <div className="text-xs text-yellow-700 space-y-1">
                                <div>• Os participantes selecionados serão removidos APENAS deste turno</div>
                                <div>• Se o participante trabalha em outros turnos, ele será mantido neles</div>
                                <div>• Dados de check-in/check-out deste turno serão perdidos</div>
                                <div>• Esta ação ficará registrada no histórico do sistema</div>
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={duplicatesManagerLoading}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveSelectedDuplicates}
                            disabled={duplicatesManagerLoading || selectedDuplicatesForRemoval.size === 0}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {duplicatesManagerLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Removendo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remover {selectedDuplicatesForRemoval.size} Selecionado(s)
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Replicação por Etapas */}
            <Dialog open={showStepReplicationModal} onOpenChange={setShowStepReplicationModal}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Replicação por Etapas - Etapa {currentReplicationStep} de 6
                        </DialogTitle>
                        <DialogDescription>
                            Processo guiado para replicação de staff com verificação de empresas e credenciais
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(currentReplicationStep / 6) * 100}%` }}
                            ></div>
                        </div>

                        {/* Step 1: Seleção de Dias */}
                        {currentReplicationStep === 1 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    📅 Etapa 1: Seleção de Dias de Origem e Destino
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Dia de Origem
                                        </label>
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            {(() => {
                                                const sourceInfo = parseShiftId(replicationData.sourceDay)
                                                return (
                                                    <div>
                                                        <div className="text-sm font-medium">
                                                            {sourceInfo.dateFormatted}
                                                        </div>
                                                        <div className="text-xs text-blue-600">
                                                            {sourceInfo.stage.toUpperCase()} • {sourceInfo.period === 'diurno' ? 'Diurno' : 'Noturno'}
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Dia de Destino
                                        </label>
                                        <select
                                            value={replicationData.targetDay}
                                            onChange={(e) => setReplicationData(prev => ({
                                                ...prev,
                                                targetDay: e.target.value
                                            }))}
                                            className="w-full p-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="">Selecione o dia de destino</option>
                                            {getEventDays()
                                                .filter(day => day.id !== replicationData.sourceDay)
                                                .map(day => {
                                                    const dayInfo = parseShiftId(day.id)
                                                    return (
                                                        <option key={day.id} value={day.id}>
                                                            {dayInfo.dateFormatted} • {dayInfo.stage.toUpperCase()} • {dayInfo.period === 'diurno' ? 'Diurno' : 'Noturno'}
                                                        </option>
                                                    )
                                                })}
                                        </select>
                                    </div>
                                </div>

                                {replicationData.sourceParticipants.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="font-medium text-green-800 mb-2">
                                            ✅ Participantes Analisados
                                        </h4>
                                        <div className="text-sm text-green-700">
                                            <div>📊 Total no dia origem: {replicationData.sourceParticipants.length}</div>
                                            <div>📊 Já existem no destino: {replicationData.targetParticipants.length}</div>
                                            <div className="font-medium">🎯 Serão replicados: {replicationData.participantsToReplicate.length}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Análise de Empresas */}
                        {currentReplicationStep === 2 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    🏢 Etapa 2: Verificação de Empresas
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="font-medium text-green-800 mb-2">
                                            ✅ Empresas Existentes
                                        </h4>
                                        <div className="text-lg font-bold text-green-600">
                                            {replicationData.companiesAnalysis.existing.length}
                                        </div>
                                        {replicationData.companiesAnalysis.existing.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {replicationData.companiesAnalysis.existing.map(company => (
                                                    <div key={company} className="text-xs text-green-700 truncate">
                                                        • {company}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <h4 className="font-medium text-yellow-800 mb-2">
                                            ⚠️ Empresas Ausentes
                                        </h4>
                                        <div className="text-lg font-bold text-yellow-600">
                                            {replicationData.companiesAnalysis.missing.length}
                                        </div>
                                        {replicationData.companiesAnalysis.missing.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {replicationData.companiesAnalysis.missing.map(company => (
                                                    <div key={company} className="text-xs text-yellow-700 truncate">
                                                        • {company}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-800 mb-2">
                                            🔧 Precisam ser Criadas
                                        </h4>
                                        <div className="text-lg font-bold text-blue-600">
                                            {replicationData.companiesAnalysis.needingCreation.length}
                                        </div>
                                        {replicationData.companiesAnalysis.needingCreation.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {replicationData.companiesAnalysis.needingCreation.map(company => (
                                                    <div key={company} className="text-xs text-blue-700 truncate">
                                                        • {company}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Processamento de Empresas */}
                        {currentReplicationStep === 3 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    🔧 Etapa 3: Criação de Empresas
                                </h3>

                                {replicationData.companiesAnalysis.needingCreation.length === 0 ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                            <span className="text-green-800 font-medium">
                                                Todas as empresas já existem no sistema!
                                            </span>
                                        </div>
                                        <p className="text-green-700 text-sm mt-2">
                                            Não é necessário criar novas empresas. Você pode prosseguir para a próxima etapa.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h4 className="font-medium text-blue-800 mb-2">
                                                Empresas que serão criadas:
                                            </h4>
                                            <div className="space-y-2">
                                                {replicationData.companiesAnalysis.needingCreation.map(company => (
                                                    <div key={company} className="flex items-center gap-2 text-sm">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <span>{company}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Progresso de criação de empresas */}
                                        {(companyCreationProgress.total > 0 || replicationData.processingSummary.companiesProcessed > 0) && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                                        {companyCreationProgress.completed ? (
                                                            <span className="text-white text-xs">✓</span>
                                                        ) : (
                                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                        )}
                                                    </div>
                                                    <span className="text-blue-800 font-medium">
                                                        {companyCreationProgress.completed ? 'Empresas criadas com sucesso!' : 'Criando empresas...'}
                                                    </span>
                                                </div>

                                                {companyCreationProgress.total > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm text-blue-700">
                                                            <span>Progresso: {companyCreationProgress.current}/{companyCreationProgress.total}</span>
                                                            <span>{Math.round((companyCreationProgress.current / companyCreationProgress.total) * 100)}%</span>
                                                        </div>

                                                        <div className="w-full bg-blue-200 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                                                style={{ width: `${(companyCreationProgress.current / companyCreationProgress.total) * 100}%` }}
                                                            ></div>
                                                        </div>

                                                        {!companyCreationProgress.completed && companyCreationProgress.currentItem && (
                                                            <div className="text-sm text-blue-600">
                                                                Criando: <span className="font-medium">{companyCreationProgress.currentItem}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 4: Análise de Credenciais */}
                        {currentReplicationStep === 4 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    🎫 Etapa 4: Verificação de Credenciais
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="font-medium text-green-800 mb-2">
                                            ✅ Credenciais Existentes
                                        </h4>
                                        <div className="text-lg font-bold text-green-600">
                                            {replicationData.credentialsAnalysis.existing.length}
                                        </div>
                                        {replicationData.credentialsAnalysis.existing.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {replicationData.credentialsAnalysis.existing.map(credential => (
                                                    <div key={credential} className="text-xs text-green-700 truncate">
                                                        • {credential}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <h4 className="font-medium text-yellow-800 mb-2">
                                            ⚠️ Credenciais Ausentes
                                        </h4>
                                        <div className="text-lg font-bold text-yellow-600">
                                            {replicationData.credentialsAnalysis.missing.length}
                                        </div>
                                        {replicationData.credentialsAnalysis.missing.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {replicationData.credentialsAnalysis.missing.map(credential => (
                                                    <div key={credential} className="text-xs text-yellow-700 truncate">
                                                        • {credential}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-800 mb-2">
                                            🔧 Precisam ser Criadas
                                        </h4>
                                        <div className="text-lg font-bold text-blue-600">
                                            {replicationData.credentialsAnalysis.needingCreation.length}
                                        </div>
                                        {replicationData.credentialsAnalysis.needingCreation.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {replicationData.credentialsAnalysis.needingCreation.map(credential => (
                                                    <div key={credential} className="text-xs text-blue-700 truncate">
                                                        • {credential}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Processamento de Credenciais */}
                        {currentReplicationStep === 5 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    🔧 Etapa 5: Criação de Credenciais
                                </h3>

                                {replicationData.credentialsAnalysis.needingCreation.length === 0 ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                            <span className="text-green-800 font-medium">
                                                Todas as credenciais já existem no sistema!
                                            </span>
                                        </div>
                                        <p className="text-green-700 text-sm mt-2">
                                            Não é necessário criar novas credenciais. Você pode prosseguir para a replicação final.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h4 className="font-medium text-blue-800 mb-2">
                                                Credenciais que serão criadas:
                                            </h4>
                                            <div className="space-y-2">
                                                {replicationData.credentialsAnalysis.needingCreation.map(credential => (
                                                    <div key={credential} className="flex items-center gap-2 text-sm">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <span>{credential}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Progresso de criação de credenciais */}
                                        {(credentialCreationProgress.total > 0 || replicationData.processingSummary.credentialsProcessed > 0) && (
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                                                        {credentialCreationProgress.completed ? (
                                                            <span className="text-white text-xs">✓</span>
                                                        ) : (
                                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                        )}
                                                    </div>
                                                    <span className="text-purple-800 font-medium">
                                                        {credentialCreationProgress.completed ? 'Credenciais criadas com sucesso!' : 'Criando credenciais...'}
                                                    </span>
                                                </div>

                                                {credentialCreationProgress.total > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm text-purple-700">
                                                            <span>Progresso: {credentialCreationProgress.current}/{credentialCreationProgress.total}</span>
                                                            <span>{Math.round((credentialCreationProgress.current / credentialCreationProgress.total) * 100)}%</span>
                                                        </div>

                                                        <div className="w-full bg-purple-200 rounded-full h-2">
                                                            <div
                                                                className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                                                                style={{ width: `${(credentialCreationProgress.current / credentialCreationProgress.total) * 100}%` }}
                                                            ></div>
                                                        </div>

                                                        {!credentialCreationProgress.completed && credentialCreationProgress.currentItem && (
                                                            <div className="text-sm text-purple-600">
                                                                Criando: <span className="font-medium">{credentialCreationProgress.currentItem}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 6: Replicação Final */}
                        {currentReplicationStep === 6 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    🎯 Etapa 6: Replicação Final do Staff
                                </h3>

                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-800 mb-3">Resumo da Replicação:</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>👥 Participantes a replicar:</span>
                                                <span className="font-medium">{replicationData.participantsToReplicate.length}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>🏢 Empresas processadas:</span>
                                                <span className="font-medium">{replicationData.processingSummary.companiesProcessed}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>🎫 Credenciais processadas:</span>
                                                <span className="font-medium">{replicationData.processingSummary.credentialsProcessed}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {replicationData.processingSummary.participantsProcessed > 0 && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs">✓</span>
                                                </div>
                                                <span className="text-green-800 font-medium">
                                                    ✅ Replicação Concluída com Sucesso!
                                                </span>
                                            </div>
                                            <div className="mt-2 text-sm text-green-700">
                                                {replicationData.processingSummary.participantsProcessed} participante(s) replicado(s) com sucesso para o turno de destino.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex justify-between">
                        <div className="flex gap-2">
                            {currentReplicationStep > 1 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentReplicationStep(prev => Math.max(1, prev - 1))}
                                    disabled={isProcessingStep}
                                >
                                    ← Etapa Anterior
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowStepReplicationModal(false)}
                                disabled={isProcessingStep}
                            >
                                Cancelar
                            </Button>

                            {currentReplicationStep < 6 && (
                                <Button
                                    onClick={async () => {
                                        switch (currentReplicationStep) {
                                            case 1:
                                                await handleStep1Selection(replicationData.targetDay)
                                                break
                                            case 2:
                                                await handleStep2CompaniesAnalysis()
                                                break
                                            case 3:
                                                await handleStep3ProcessCompanies()
                                                break
                                            case 4:
                                                await handleStep4CredentialsAnalysis()
                                                break
                                            case 5:
                                                await handleStep5ProcessCredentials()
                                                break
                                        }
                                    }}
                                    disabled={isProcessingStep || (currentReplicationStep === 1 && !replicationData.targetDay)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isProcessingStep ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            Próxima Etapa →
                                        </>
                                    )}
                                </Button>
                            )}

                            {currentReplicationStep === 6 && replicationData.processingSummary.participantsProcessed === 0 && (
                                <Button
                                    onClick={() => handleStep6FinalReplication()}
                                    disabled={isProcessingStep}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isProcessingStep ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Replicando...
                                        </>
                                    ) : (
                                        <>
                                            🎯 Executar Replicação Final
                                        </>
                                    )}
                                </Button>
                            )}

                            {currentReplicationStep === 6 && replicationData.processingSummary.participantsProcessed > 0 && (
                                <Button
                                    onClick={() => setShowStepReplicationModal(false)}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    ✅ Finalizar
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </EventLayout>
    )
}
