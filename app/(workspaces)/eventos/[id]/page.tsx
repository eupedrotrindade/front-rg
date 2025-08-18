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
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { changeCredentialCode } from '@/features/eventos/actions/movement-credentials'
import { updateParticipantCredential } from '@/features/eventos/actions/update-participant-credential'
import {
    useCheckIn,
    useCheckOut,
} from '@/features/eventos/api/mutation/use-check-operations'
import { useDeleteEventAttendance } from '@/features/eventos/api/mutation/use-delete-event-attendance'
import { useDeleteEventParticipant } from '@/features/eventos/api/mutation/use-delete-event-participant'
import { useDeleteParticipantFromShift } from '@/features/eventos/api/mutation/use-delete-participant-from-shift'
import { useDeleteParticipantAllShifts } from '@/features/eventos/api/mutation/use-delete-participant-all-shifts'
import { useUpdateEventParticipant } from '@/features/eventos/api/mutation/use-update-event-participant'
import { useCoordenadoresByEvent } from '@/features/eventos/api/query/use-coordenadores-by-event'
import { useEmpresasByEvent } from '@/features/eventos/api/query/use-empresas'
import { useEventAttendanceByEventAndDate } from '@/features/eventos/api/query/use-event-attendance'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useEventParticipantsGrouped, GroupedParticipant } from '@/features/eventos/api/query/use-event-participants-grouped'
import { useEventParticipantsByShift } from '@/features/eventos/api/query/use-event-participants-by-shift'
import { useEventVehiclesByEvent } from '@/features/eventos/api/query/use-event-vehicles-by-event'
// TODO: Substituir por useEventById para melhor performance
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { EventParticipant } from '@/features/eventos/types'
import { useQueryClient } from '@tanstack/react-query'
import {
    Check,
    Clock,
    Download,
    Filter,
    Loader2,
    Plus,
    RotateCcw,
    Search,
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
    const checkInMutation = useCheckIn()
    const checkOutMutation = useCheckOut()
    const deleteAttendanceMutation = useDeleteEventAttendance()

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
    }>({
        total: 0,
        current: 0,
        processed: 0,
        currentParticipant: '',
    })

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

    // Estados para remoção de duplicados
    const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)
    const [duplicatesLoading, setDuplicatesLoading] = useState(false)

    // Estados para exclusão em massa
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

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

    // Hook para buscar dados de attendance do dia selecionado
    // Este hook busca os dados reais de check-in/check-out do sistema
    const { data: attendanceData = [], isLoading: attendanceLoading } =
        useEventAttendanceByEventAndDate(
            String(params.id),
            formatDateForAPI(selectedDay),
        )

    // Buscar apenas dados necessários do evento (TODO: criar hook específico)
    const { data: eventos } = useEventos() // Temporário - precisa ser otimizado
    const evento = useMemo(() => {
        const foundEvent = Array.isArray(eventos)
            ? eventos.find(e => String(e.id) === String(params.id))
            : undefined

        // Debug temporário para verificar estrutura dos dados
        if (foundEvent) {
            console.log('🔍 Evento encontrado:', {
                id: foundEvent.id,
                name: foundEvent.name,
                montagem: foundEvent.montagem,
                evento: foundEvent.evento,
                desmontagem: foundEvent.desmontagem,
                montagemType: typeof foundEvent.montagem,
                eventoType: typeof foundEvent.evento,
                desmontagemType: typeof foundEvent.desmontagem,
                // Campos legacy
                setupStartDate: foundEvent.setupStartDate,
                setupEndDate: foundEvent.setupEndDate,
                preparationStartDate: foundEvent.preparationStartDate,
                preparationEndDate: foundEvent.preparationEndDate,
                finalizationStartDate: foundEvent.finalizationStartDate,
                finalizationEndDate: foundEvent.finalizationEndDate
            })
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

    // Função para gerar tabs dos dias do evento com suporte a turnos
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

        // Usar a nova estrutura SimpleEventDay se disponível com suporte a turnos
        const montagemData = ensureArray(evento.montagem)
        console.log('🔧 Processando montagem:', montagemData)
        if (montagemData.length > 0) {
            montagemData.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date)
                        const dateISO = new Date(day.date).toISOString().split('T')[0]
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'

                        console.log(`✅ Adicionando montagem: ${dateStr} - ${periodLabel}`)
                        days.push({
                            id: `${dateISO}-montagem-${day.period}`,
                            label: `${dateStr} (MONTAGEM - ${periodLabel})`,
                            date: dateStr,
                            type: 'montagem',
                            period: day.period
                        })
                    } catch (error) {
                        console.error('❌ Erro ao processar data da montagem:', day, error)
                    }
                }
            })
        } else if (evento.setupStartDate && evento.setupEndDate) {
            // Fallback para estrutura antiga com suporte a turnos
            const startDate = new Date(evento.setupStartDate)
            const endDate = new Date(evento.setupEndDate)
            for (
                let date = new Date(startDate);
                date <= endDate;
                date.setDate(date.getDate() + 1)
            ) {
                const dateStr = formatEventDate(date.toISOString())
                const dateISO = date.toISOString().split('T')[0]

                    // Adicionar ambos os períodos (diurno e noturno) para cada data
                    ; (['diurno', 'noturno'] as Array<'diurno' | 'noturno'>).forEach((period) => {
                        const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno'
                        const periodTyped = period as 'diurno' | 'noturno'
                        days.push({
                            id: `${dateISO}-montagem-${periodTyped}`,
                            label: `${dateStr} (MONTAGEM - ${periodLabel})`,
                            date: dateStr,
                            type: 'montagem',
                            period: periodTyped
                        })
                    })

            }
        }

        // Adicionar dias de Evento/evento com suporte a turnos
        const eventoData = ensureArray(evento.evento)
        console.log('🔧 Processando evento:', eventoData)
        if (eventoData.length > 0) {
            eventoData.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date)
                        const dateISO = new Date(day.date).toISOString().split('T')[0]
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'

                        console.log(`✅ Adicionando evento: ${dateStr} - ${periodLabel}`)
                        days.push({
                            id: `${dateISO}-evento-${day.period}`,
                            label: `${dateStr} (EVENTO - ${periodLabel})`,
                            date: dateStr,
                            type: 'evento',
                            period: day.period
                        })
                    } catch (error) {
                        console.error('❌ Erro ao processar data do evento:', day, error)
                    }
                }
            })
        } else if (evento.preparationStartDate && evento.preparationEndDate) {
            // Fallback para estrutura antiga com suporte a turnos
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)
            for (
                let date = new Date(startDate);
                date <= endDate;
                date.setDate(date.getDate() + 1)
            ) {
                const dateStr = formatEventDate(date.toISOString())
                const dateISO = date.toISOString().split('T')[0];

                // Adicionar ambos os períodos (diurno e noturno) para cada data
                (['diurno', 'noturno'] as Array<'diurno' | 'noturno'>).forEach(period => {
                    const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno'

                    const periodTyped = period as 'diurno' | 'noturno'
                    days.push({
                        id: `${dateISO}-evento-${periodTyped}`,
                        label: `${dateStr} (EVENTO - ${periodTyped === 'diurno' ? 'Diurno' : 'Noturno'})`,
                        date: dateStr,
                        type: 'evento',
                        period: periodTyped
                    })

                })
            }
        }

        // Adicionar dias de finalização com suporte a turnos
        const desmontagemData = ensureArray(evento.desmontagem)
        console.log('🔧 Processando desmontagem:', desmontagemData)
        if (desmontagemData.length > 0) {
            desmontagemData.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date)
                        const dateISO = new Date(day.date).toISOString().split('T')[0]
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'

                        console.log(`✅ Adicionando desmontagem: ${dateStr} - ${periodLabel}`)
                        days.push({
                            id: `${dateISO}-desmontagem-${day.period}`,
                            label: `${dateStr} (DESMONTAGEM - ${periodLabel})`,
                            date: dateStr,
                            type: 'desmontagem',
                            period: day.period
                        })
                    } catch (error) {
                        console.error('❌ Erro ao processar data da desmontagem:', day, error)
                    }
                }
            })
        } else if (evento.finalizationStartDate && evento.finalizationEndDate) {
            // Fallback para estrutura antiga com suporte a turnos
            const startDate = new Date(evento.finalizationStartDate)
            const endDate = new Date(evento.finalizationEndDate)
            for (
                let date = new Date(startDate);
                date <= endDate;
                date.setDate(date.getDate() + 1)
            ) {
                const dateStr = formatEventDate(date.toISOString())
                const dateISO = date.toISOString().split('T')[0];

                // Adicionar ambos os períodos (diurno e noturno) para cada data
                (['diurno', 'noturno'] as const).forEach((period) => {
                    const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno'

                    days.push({
                        id: `${dateISO}-finalizacao-${period}`,
                        label: `${dateStr} (FINALIZAÇÃO - ${periodLabel})`,
                        date: dateStr,
                        type: 'finalizacao',
                        period: period
                    })
                })

            }
        }

        console.log('🎯 Dias finais gerados:', days)
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
                case 'finalizacao':
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
                case 'finalizacao':
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

    // Função otimizada para contar participantes por turno
    const getParticipantsCountByShift = useCallback(
        (shiftId: string): number => {
            if (viewMode === 'shift') {
                // Modo turno: usar API específica para cada turno
                // Como não podemos fazer query para cada turno no render, usar fallback
                if (shiftId === currentSelectedDay) {
                    return shiftParticipantsData.length
                }
                // Para outros turnos, usar dados agrupados como estimativa
                let count = 0;
                groupedParticipantsData.forEach(group => {
                    const hasShift = group.shifts.some(shift => (shift as any).shiftId === shiftId)
                    if (hasShift) count++
                })
                return count
            } else {
                // Modo agrupado: contar participantes que têm o shift específico
                let count = 0;
                groupedParticipantsData.forEach(group => {
                    const hasShift = group.shifts.some(shift => (shift as any).shiftId === shiftId)
                    if (hasShift) count++
                })
                return count
            }
        },
        [viewMode, currentSelectedDay, shiftParticipantsData, groupedParticipantsData],
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

    // Hook otimizado para filtros
    const {
        filters,
        popoverStates,
        dayStats,
        uniqueEmpresas,
        uniqueFuncoes,
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

    // Override uniqueEmpresas to show only companies scheduled for the selected day
    const uniqueEmpresasFiltered = useMemo(() => {
        return empresasDoDia.map(empresa => empresa.nome).sort()
    }, [empresasDoDia])

    // Memoizar KPIs baseados no dia selecionado para evitar recálculos
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
    }, [participantesDoDia, dayStats.statusCounts])

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

    // Memoizar duplicados para evitar recálculo custoso
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
        (participant: EventParticipant) => {
            // Verificar se já fez check-in no dia selecionado
            if (hasCheckIn(participant.id, selectedDay)) {
                toast.error('Este participante já fez check-in neste dia!')
                return
            }

            setParticipantAction(participant)
            setCodigoPulseira('')
            setSelectedDateForAction(selectedDay)
            setPopupCheckin(true)
        },
        [hasCheckIn, selectedDay],
    )

    // Função para abrir popup de check-out (memoizada)
    const abrirCheckout = useCallback(
        (participant: EventParticipant) => {
            // Verificar se já fez check-out no dia selecionado
            if (hasCheckOut(participant.id, selectedDay)) {
                toast.error('Este participante já fez check-out neste dia!')
                return
            }

            // Verificar se fez check-in antes de fazer check-out
            if (!hasCheckIn(participant.id, selectedDay)) {
                toast.error(
                    'Este participante precisa fazer check-in antes do check-out!',
                )
                return
            }

            setParticipantAction(participant)
            setSelectedDateForAction(selectedDay)
            setPopupCheckout(true)
        },
        [hasCheckIn, hasCheckOut, selectedDay],
    )

    // Função para abrir popup de reset check-in (memoizada)
    const abrirResetCheckin = useCallback((participant: EventParticipant) => {
        setParticipantAction(participant)
        setPopupResetCheckin(true)
    }, [])

    // Função para confirmar check-in
    const confirmarCheckin = async () => {
        if (!participantAction || !codigoPulseira.trim()) {
            toast.error('Dados insuficientes para realizar check-in')
            return
        }

        // Verificar se já fez check-in no dia selecionado
        const dateToCheck = selectedDateForAction || selectedDay
        if (hasCheckIn(participantAction.id, dateToCheck)) {
            toast.error('Este participante já fez check-in neste dia!')
            setPopupCheckin(false)
            setParticipantAction(null)
            setCodigoPulseira('')
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

            await checkInMutation.mutateAsync({
                participantId: participantAction.id,
                date: dateToUse,
                validatedBy: 'Sistema',
                performedBy: 'Sistema',
                notes: `Check-in realizado via painel de eventos - Pulseira: ${codigoPulseira.trim()}`,
                workPeriod: period,
                workStage: stage,
            })

            // Salvar pulseira no sistema de movement_credentials
            try {
                await changeCredentialCode(
                    String(params.id),
                    participantAction.id,
                    codigoPulseira.trim(),
                )
            } catch (error) {
                console.error('⚠️ Erro ao salvar pulseira no sistema:', error)
            }

            toast.success('Check-in realizado com sucesso!')

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

    // Função para replicar staff rapidamente
    const handleReplicateStaff = async () => {
        if (!replicateSourceDay) return

        setReplicatingStaff(replicateSourceDay)
        setShowReplicateDialog(false)

        try {
            // Buscar todos os participantes que trabalham no dia atual (origem)
            const participantsFromCurrentDay = participantesDoDia

            console.log('Dia de origem:', selectedDay)
            console.log('Dia de destino:', replicateSourceDay)
            console.log(
                'Participantes encontrados no dia de origem:',
                participantsFromCurrentDay,
            )

            // Inicializar dados de progresso
            setProgressData({
                total: participantsFromCurrentDay.length,
                current: 0,
                processed: 0,
                currentParticipant: '',
            })
            setShowProgressDialog(true)

            let processedCount = 0

            // Para cada participante do dia atual, adicionar ao dia de destino
            for (let i = 0; i < participantsFromCurrentDay.length; i++) {
                const participant = participantsFromCurrentDay[i]
                const currentParticipantName =
                    participant.name || 'Participante sem nome'

                // Atualizar progresso
                setProgressData(prev => ({
                    ...prev,
                    current: i + 1,
                    currentParticipant: currentParticipantName,
                }))

                const currentDaysWork = participant.daysWork || []
                const alreadyWorksInDestination =
                    currentDaysWork.includes(replicateSourceDay)

                if (alreadyWorksInDestination) {
                    // Se já trabalha no dia de destino, apenas limpar dados de check-in/check-out
                    console.log(
                        `Resetando dados para ${participant.name} no dia ${replicateSourceDay}`,
                    )
                    processedCount++
                    setProgressData(prev => ({ ...prev, processed: processedCount }))
                } else {
                    // Adicionar o dia de destino aos dias de trabalho
                    const updatedDaysWork = [...currentDaysWork, replicateSourceDay]

                    try {
                        // Atualizar participante via API - apenas dados básicos
                        console.log(
                            `Adicionando dia ${replicateSourceDay} para ${participant.name}`,
                        )

                        const updateData = {
                            id: participant.id,
                            eventId: participant.eventId || String(params.id),
                            name: participant.name || '',
                            cpf: participant.cpf || '',
                            role: participant.role || '',
                            company: participant.company || '',
                            credentialId: participant.credentialId || undefined,
                            daysWork: updatedDaysWork,
                        }

                        console.log('Dados para atualização:', updateData)

                        updateParticipant(updateData, {
                            onSuccess: () => {
                                console.log(`✅ ${participant.name} atualizado com sucesso`)
                                processedCount++
                                setProgressData(prev => ({
                                    ...prev,
                                    processed: processedCount,
                                }))
                            },
                            onError: error => {
                                console.error(
                                    `❌ Erro ao atualizar ${participant.name}:`,
                                    error,
                                )
                            },
                        })

                        // Simular delay para mostrar progresso
                        await new Promise(resolve => setTimeout(resolve, 500))
                    } catch (error) {
                        console.error(`Erro ao atualizar ${participant.name}:`, error)
                    }
                }
            }

            // Fechar popup de progresso após delay
            setTimeout(() => {
                setShowProgressDialog(false)
                setReplicatingStaff(null)

                toast.success(
                    `Replicação concluída! ${processedCount} participantes processados para ${replicateSourceDay}.`,
                )
            }, 1000)
        } catch (error) {
            console.error('Erro na replicação:', error)
            setShowProgressDialog(false)
            setReplicatingStaff(null)
            toast.error('Erro ao replicar participantes')
        }
    }

    // Estados calculados memoizados
    const isLoading = useMemo(
        () =>
            participantsLoading ||
            (viewMode === 'grouped' ? groupedParticipantsLoading : shiftParticipantsLoading) ||
            coordenadoresLoading ||
            vagasLoading ||
            empresasLoading ||
            attendanceLoading,
        [
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

    // Early return se evento não existir
    if (!evento) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                    <Button onClick={() => router.back()}>Voltar</Button>
                </div>
            </div>
        )
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={evento.name}>
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

                            {/* {duplicates.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-white shadow-sm transition-all duration-200"
                                    onClick={() => setShowDuplicatesModal(true)}
                                    disabled={isLoading}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remover Duplicados ({duplicates.length})
                                </Button>
                            )} */}
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
                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
                                                                    day.type === 'finalizacao' ? 'FINALIZAÇÃO' :
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
                                            {isActive && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleOpenReplicateDialog(day.id)}
                                                    disabled={replicatingStaff === day.id}
                                                    className="text-xs h-6 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                                >
                                                    {replicatingStaff === day.id ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                                            Replicando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Users className="w-3 h-3 mr-1" />
                                                            Replicar Participantes
                                                        </>
                                                    )}
                                                </Button>
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

                {/* Tabela Virtualizada - Renderizar apenas quando necessário */}
                {!isLoading && currentSelectedDay && (
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
                        isLoading={isLoading}
                        loading={loading}
                    />
                )}

                {/* Loader quando carregando */}
                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-500">Carregando participantes...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialog de Confirmação de Exclusão de Participante */}
            <AlertDialog
                open={!!deletingParticipant}
                onOpenChange={open => !open && setDeletingParticipant(null)}
            >
                <AlertDialogContent className="bg-white text-black">
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
                <AlertDialogContent className="bg-white text-black max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-green-600" />
                            Replicar Participantes
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Escolha a nova data para onde os participantes serão replicados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Seleção da nova data */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nova Data
                            </label>
                            <select
                                value={replicateSourceDay}
                                onChange={e => setReplicateSourceDay(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Selecione uma data</option>
                                {getEventDays().map(day => (
                                    <option key={day.id} value={day.id}>
                                        {day.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Informações sobre a replicação */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">
                                    Atenção
                                </span>
                            </div>
                            <div className="text-xs text-yellow-700">
                                Serão levados apenas: NOME, CPF, FUNÇÃO, EMPRESA e TIPO DE
                                CREDENCIAL. Todos os dados de check-in/check-out serão limpos na
                                nova data.
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReplicateStaff}
                            disabled={!replicateSourceDay}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {replicatingStaff ? 'Replicando...' : 'Confirmar Replicação'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Popup de Progresso */}
            <AlertDialog
                open={showProgressDialog}
                onOpenChange={setShowProgressDialog}
            >
                <AlertDialogContent className="max-w-md bg-white text-black">
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
                <AlertDialogContent className="bg-white text-black max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-600" />
                            Realizar Check-in
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Digite o código da pulseira para realizar o check-in.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Código da Pulseira
                            </label>
                            <Input
                                type="text"
                                value={codigoPulseira}
                                onChange={e => setCodigoPulseira(e.target.value)}
                                placeholder="Digite o código da pulseira"
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
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarCheckin}
                            disabled={loading || !codigoPulseira.trim()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {loading ? 'Processando...' : 'Confirmar Check-in'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Check-out */}
            <AlertDialog open={popupCheckout} onOpenChange={setPopupCheckout}>
                <AlertDialogContent className="bg-white text-black max-w-md">
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
                <AlertDialogContent className="bg-white text-black max-w-md">
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
                <AlertDialogContent className="bg-white text-black max-w-md">
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
                            <Select
                                value={bulkEditData.credentialId}
                                onValueChange={value =>
                                    setBulkEditData(prev => ({ ...prev, credentialId: value }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione uma credencial (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-change">Não alterar</SelectItem>
                                    {credentialsArray
                                        .filter(c => c.isActive !== false)
                                        .map(credential => (
                                            <SelectItem key={credential.id} value={credential.id}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: credential.cor }}
                                                    />
                                                    {credential.nome}
                                                </div>
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
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
                            <Select
                                value={bulkEditData.company}
                                onValueChange={value =>
                                    setBulkEditData(prev => ({ ...prev, company: value }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione uma empresa (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-change">Não alterar</SelectItem>
                                    {empresas?.map(empresa => (
                                        <SelectItem key={empresa.id} value={empresa.nome}>
                                            {empresa.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                <AlertDialogContent className="bg-white text-black max-w-md">
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
        </EventLayout>
    )
}
