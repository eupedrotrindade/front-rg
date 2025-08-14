/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Calendar, Clock, User, Search, Plus, Check, X, RotateCcw, RefreshCw, Users, Radio, Download, Upload, Sun, Moon, Settings } from 'lucide-react'
import EventLayout from '@/components/dashboard/dashboard-layout'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { formatEventDate } from '@/lib/utils'
import {
    useRadioAssignmentsByDay,
    useAvailableRadios,
    useCreateRadioAssignment,
    useUpdateRadioAssignment,
    usePartialReturn,
    useRadioExchange,
    useRadioOperations,
    useCreateMultipleRadios,
    useAllRadioAssignments
} from '@/features/radio/api'
import { RadioAssignment, NewAssignmentForm, PartialReturnForm, ExchangeForm } from './types'
import ImportRadiosModal from './components/ImportRadiosModal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function RadiosPage() {
    const params = useParams()
    const eventId = String(params.id)

    // Estados
    const [selectedDay, setSelectedDay] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [showOnlyActive, setShowOnlyActive] = useState(false)
    const [radioSearchTerm, setRadioSearchTerm] = useState('')

    // Estados para modais
    const [isNewAssignmentModalOpen, setIsNewAssignmentModalOpen] = useState(false)
    const [isPartialReturnModalOpen, setIsPartialReturnModalOpen] = useState(false)
    const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false)
    const [isCreateRadioModalOpen, setIsCreateRadioModalOpen] = useState(false)
    const [isImportRadiosModalOpen, setIsImportRadiosModalOpen] = useState(false)
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
    const [selectedAssignment, setSelectedAssignment] = useState<RadioAssignment | null>(null)

    // Estados para formulários
    const [newAssignmentForm, setNewAssignmentForm] = useState<NewAssignmentForm>({
        assigned_to: '', // Nome da pessoa
        company: '', // Empresa (opcional)
        contact: '',
        radio_codes: [],
        notes: '',
        withdrawal_code: '' // Código de retirada
    })

    const [partialReturnForm, setPartialReturnForm] = useState<PartialReturnForm>({
        returned_radio_codes: [],
        notes: ''
    })

    const [exchangeForm, setExchangeForm] = useState<ExchangeForm>({
        old_radio_codes: [],
        new_radio_codes: [],
        notes: ''
    })

    const [createRadioForm, setCreateRadioForm] = useState({
        radio_code: '',
        quantity: 1,
        radio_codes: [] as string[],
        quickStart: '',
        quickEnd: '',
        selectedTurns: selectedDay ? [selectedDay] : [] as string[] // Turnos selecionados para criação
    })

    // Queries
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null

    // Converter selectedDay para o formato correto da API (DD/MM/YYYY)
    const selectedDayFormatted = useMemo(() => {
        if (!selectedDay) return '';
        // Extrair a data do selectedDay (formato: YYYY-MM-DD-stage-period)
        const dayDate = selectedDay.split('-').slice(0, 3).join('-'); // YYYY-MM-DD
        return formatEventDate(dayDate + 'T00:00:00'); // Converter para DD/MM/YYYY
    }, [selectedDay]);

    const { data: assignmentsData, isLoading: assignmentsLoading } = useRadioAssignmentsByDay(
        eventId,
        selectedDayFormatted,
        { enabled: !!selectedDayFormatted }
    )

    // Query para buscar todas as atribuições do evento (para contadores)
    const { data: allAssignmentsData, isLoading: allAssignmentsLoading } = useAllRadioAssignments(eventId)

    // Extrair estágio do dia selecionado
    const selectedStage = useMemo(() => {
        if (!selectedDay) return undefined;
        const parts = selectedDay.split('-');
        return parts.length >= 4 ? parts[3] : undefined; // Posição 3 contém o estágio
    }, [selectedDay]);

    // Extrair estágios dos turnos selecionados no formulário de criação
    const createRadioStages = useMemo(() => {
        if (!createRadioForm.selectedTurns || createRadioForm.selectedTurns.length === 0) return [];

        const stages = createRadioForm.selectedTurns.map(turn => {
            const parts = turn.split('-');
            return parts.length >= 4 ? parts[3] : null;
        }).filter(stage => stage !== null);

        // Retornar apenas estágios únicos
        return [...new Set(stages)];
    }, [createRadioForm.selectedTurns]);

    const { data: availableRadiosData, isLoading: availableRadiosLoading } = useAvailableRadios(eventId, selectedStage)

    // Hook para histórico de operações
    const { data: operationsData, isLoading: operationsLoading } = useRadioOperations(
        selectedAssignment?.id || ''
    )

    // Mutations
    const createAssignmentMutation = useCreateRadioAssignment()
    const updateAssignmentMutation = useUpdateRadioAssignment()
    const partialReturnMutation = usePartialReturn()
    const exchangeMutation = useRadioExchange()
    const createMultipleRadiosMutation = useCreateMultipleRadios()

    // Dados processados
    const assignments = useMemo(() => assignmentsData?.data || [], [assignmentsData?.data])
    const allAssignments = allAssignmentsData?.data || [] // Todas as atribuições para contadores
    const availableRadios = useMemo(() => availableRadiosData?.data || [], [availableRadiosData?.data])

    // Filtrar rádios disponíveis com busca
    const filteredAvailableRadios = useMemo(() => {
        if (!radioSearchTerm) return availableRadios

        return availableRadios.filter(radio =>
            radio.toLowerCase().includes(radioSearchTerm.toLowerCase())
        )
    }, [availableRadios, radioSearchTerm])

    // Função para gerar dias do evento
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> => {
        if (!evento) return []

        const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> = []

        // Função helper para processar arrays de dados do evento (nova estrutura)
        const processEventArray = (eventData: any, stage: string, stageName: string) => {
            if (!eventData) return;

            try {
                let dataArray: any[] = [];

                // Se for string JSON, fazer parse
                if (typeof eventData === 'string') {
                    dataArray = JSON.parse(eventData);
                }
                // Se já for array, usar diretamente
                else if (Array.isArray(eventData)) {
                    dataArray = eventData;
                }
                // Se não for nem string nem array, sair
                else {
                    return;
                }

                // Processar cada item do array
                dataArray.forEach(item => {
                    if (item && item.date) {
                        // Garantir que a data está no formato correto
                        const dateObj = new Date(item.date);
                        if (isNaN(dateObj.getTime())) {
                            console.warn(`Data inválida encontrada: ${item.date}`);
                            return;
                        }

                        const formattedDate = formatEventDate(dateObj.toISOString());

                        // Usar período do item se disponível, senão calcular baseado na hora
                        let period: 'diurno' | 'noturno';
                        if (item.period && (item.period === 'diurno' || item.period === 'noturno')) {
                            period = item.period;
                        } else {
                            // Fallback: calcular baseado na hora
                            const hour = dateObj.getHours();
                            period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                        }

                        // Criar ID único baseado na data e período
                        const dayId = `${dateObj.toISOString().split('T')[0]}-${stage}-${period}`;

                        days.push({
                            id: dayId,
                            label: `${formattedDate} (${stageName} - ${period === 'diurno' ? 'Diurno' : 'Noturno'})`,
                            date: formattedDate,
                            type: stage,
                            period
                        });
                    }
                });
            } catch (error) {
                console.warn(`Erro ao processar dados do evento para stage ${stage}:`, error);
            }
        };

        // Processar nova estrutura do evento
        processEventArray(evento.montagem, 'montagem', 'MONTAGEM');
        processEventArray(evento.evento, 'evento', 'EVENTO');
        processEventArray(evento.desmontagem, 'desmontagem', 'DESMONTAGEM');

        // Fallback para estrutura antiga (manter compatibilidade) - só usar se não há nova estrutura
        if (evento.setupStartDate && evento.setupEndDate && (!evento.montagem || evento.montagem.length === 0)) {
            const startDate = new Date(evento.setupStartDate)
            const endDate = new Date(evento.setupEndDate)

            // Validar datas
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Datas de setup inválidas:', evento.setupStartDate, evento.setupEndDate);
            } else {
                for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                    const dateStr = formatEventDate(date.toISOString())
                    // Para compatibilidade, assumir período diurno para estrutura antiga
                    const dayId = `${date.toISOString().split('T')[0]}-montagem-diurno`;

                    days.push({
                        id: dayId,
                        label: `${dateStr} (MONTAGEM - Diurno)`,
                        date: dateStr,
                        type: 'montagem',
                        period: 'diurno'
                    })
                }
            }
        }

        if (evento.preparationStartDate && evento.preparationEndDate && (!evento.evento || evento.evento.length === 0)) {
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Datas de preparação inválidas:', evento.preparationStartDate, evento.preparationEndDate);
            } else {
                for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                    const dateStr = formatEventDate(date.toISOString())
                    const dayId = `${date.toISOString().split('T')[0]}-evento-diurno`;

                    days.push({
                        id: dayId,
                        label: `${dateStr} (EVENTO - Diurno)`,
                        date: dateStr,
                        type: 'evento',
                        period: 'diurno'
                    })
                }
            }
        }

        if (evento.finalizationStartDate && evento.finalizationEndDate && (!evento.desmontagem || evento.desmontagem.length === 0)) {
            const startDate = new Date(evento.finalizationStartDate)
            const endDate = new Date(evento.finalizationEndDate)

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Datas de finalização inválidas:', evento.finalizationStartDate, evento.finalizationEndDate);
            } else {
                for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                    const dateStr = formatEventDate(date.toISOString())
                    const dayId = `${date.toISOString().split('T')[0]}-desmontagem-diurno`;

                    days.push({
                        id: dayId,
                        label: `${dateStr} (DESMONTAGEM - Diurno)`,
                        date: dateStr,
                        type: 'desmontagem',
                        period: 'diurno'
                    })
                }
            }
        }

        // Ordenar dias cronologicamente
        days.sort((a, b) => {
            // Extrair a data do ID para ordenação mais confiável
            const dateA = new Date(a.id.split('-')[0]);
            const dateB = new Date(b.id.split('-')[0]);

            if (dateA.getTime() === dateB.getTime()) {
                // Se for o mesmo dia, ordenar por tipo e período
                const typeOrder = { montagem: 0, evento: 1, desmontagem: 2 };
                const periodOrder = { diurno: 0, noturno: 1 };

                const typeComparison = typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder];
                if (typeComparison !== 0) return typeComparison;

                return periodOrder[a.period as keyof typeof periodOrder] - periodOrder[b.period as keyof typeof periodOrder];
            }

            return dateA.getTime() - dateB.getTime();
        });

        return days
    }, [evento])

    // Função para obter cor da tab baseada no tipo
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'montagem':
                case 'setup':
                    return 'border-orange-500 text-orange-600 bg-orange-50'
                case 'evento':
                case 'event':
                case 'preparation':
                    return 'border-blue-500 text-blue-600 bg-blue-50'
                case 'desmontagem':
                case 'teardown':
                case 'finalization':
                    return 'border-red-500 text-red-600 bg-red-50'
                default:
                    return 'border-gray-500 text-gray-600 bg-gray-50'
            }
        } else {
            switch (type) {
                case 'montagem':
                case 'setup':
                    return 'hover:text-orange-700 hover:border-orange-300'
                case 'evento':
                case 'event':
                case 'preparation':
                    return 'hover:text-blue-700 hover:border-blue-300'
                case 'desmontagem':
                case 'teardown':
                case 'finalization':
                    return 'hover:text-red-700 hover:border-red-300'
                default:
                    return 'hover:text-gray-700 hover:border-gray-300'
            }
        }
    }, [])

    // Função para obter ícone do período
    const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno') => {
        if (period === 'diurno') {
            return <Sun className="h-3 w-3 text-yellow-500" />;
        } else if (period === 'noturno') {
            return <Moon className="h-3 w-3 text-blue-500" />;
        }
        return null;
    }, [])

    // Filtrar atribuições
    const filteredAssignments = useMemo(() => {
        let filtered = assignments

        // Filtrar por termo de busca
        if (searchTerm) {
            filtered = filtered.filter(assignment =>
                assignment.assigned_to.toLowerCase().includes(searchTerm.toLowerCase()) ||
                assignment.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                assignment.radio_codes.some(radio => radio.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        }

        // Filtrar apenas ativos
        if (showOnlyActive) {
            filtered = filtered.filter(assignment => assignment.status === 'ativo' || assignment.status === 'parcial')
        }

        return filtered
    }, [assignments, searchTerm, showOnlyActive])

    // Estatísticas
    const stats = useMemo(() => {
        const total = assignments.length
        const active = assignments.filter(a => a.status === 'ativo').length
        const returned = assignments.filter(a => a.status === 'devolvido').length
        const partiallyReturned = assignments.filter(a => a.status === 'parcial').length
        const totalRadios = assignments.reduce((sum, a) => sum + a.radio_codes.length, 0)
        const activeRadios = assignments
            .filter(a => a.status === 'ativo' || a.status === 'parcial')
            .reduce((sum, a) => sum + a.radio_codes.length, 0)

        return {
            total,
            active,
            returned,
            partiallyReturned,
            totalRadios,
            activeRadios
        }
    }, [assignments])

    // Função para gerar código de retirada único
    const generateWithdrawalCode = () => {
        // Gerar código de 4 dígitos (1000-9999) para evitar conflito com números de rádios
        return Math.floor(1000 + Math.random() * 9000).toString()
    }

    // Função para exportar relatório em PDF
    const handleExportPDF = (period?: 'montagem' | 'evento' | 'desmontagem') => {
        let dataToExport = allAssignments

        if (period) {
            // Filtrar por período específico
            dataToExport = allAssignments.filter(assignment => {
                // Verificar se o assignment pertence ao período especificado
                // Isso depende de como o período está armazenado no banco
                return assignment.workStage === period
            })
        }

        if (dataToExport.length === 0) {
            toast.error(`Nenhuma atribuição encontrada${period ? ` para ${period.toUpperCase()}` : ''}`)
            return
        }

        // Criar conteúdo do PDF
        const pdfContent = {
            title: `Relatório de Rádios - ${evento?.name || 'Evento'}`,
            subtitle: period ? `Período: ${period.toUpperCase()}` : 'Todos os Períodos',
            date: new Date().toLocaleDateString('pt-BR'),
            data: dataToExport.map(assignment => ({
                withdrawal_code: assignment.withdrawal_code || 'N/A',
                assigned_to: assignment.assigned_to,
                company: assignment.company || '-',
                contact: assignment.contact || '-',
                radio_codes: assignment.radio_codes.join(', '),
                status: assignment.status,
                assigned_at: formatEventDate(assignment.assigned_at),
                returned_at: assignment.returned_at ? formatEventDate(assignment.returned_at) : '-',
                notes: assignment.notes || '-'
            }))
        }

        // Aqui você implementaria a geração do PDF
        // Por enquanto, mostrar uma mensagem
        toast.success(`Exportando ${dataToExport.length} registros...`)

        // TODO: Implementar geração de PDF com jsPDF ou similar
        console.log('PDF Content:', pdfContent)
    }

    // Handlers para modais
    const openNewAssignmentModal = () => {
        setNewAssignmentForm({
            assigned_to: '', // Nome da pessoa
            company: '', // Empresa (opcional)
            contact: '',
            radio_codes: [],
            notes: '',
            withdrawal_code: generateWithdrawalCode()
        })
        setIsNewAssignmentModalOpen(true)
    }

    const openCreateRadioModal = () => {
        setCreateRadioForm({
            radio_code: '',
            quantity: 1,
            radio_codes: [],
            quickStart: '',
            quickEnd: '',
            selectedTurns: selectedDay ? [selectedDay] : [] // Definir o turno atual como padrão
        })
        setIsCreateRadioModalOpen(true)
    }

    const handleAddRadioCode = (code: string) => {
        const trimmedCode = code.trim()
        if (trimmedCode && !createRadioForm.radio_codes.includes(trimmedCode)) {
            setCreateRadioForm(prev => ({
                ...prev,
                radio_codes: [...prev.radio_codes, trimmedCode],
                radio_code: ''
            }))
        }
    }

    const handleRemoveRadioCode = (codeToRemove: string) => {
        setCreateRadioForm(prev => ({
            ...prev,
            radio_codes: prev.radio_codes.filter(code => code !== codeToRemove)
        }))
    }

    const handleRadioCodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            const value = e.currentTarget.value.trim()
            if (value) {
                handleAddRadioCode(value)
            }
        }
    }

    const handleRadioCodeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value.trim()
        if (value) {
            handleAddRadioCode(value)
        }
    }

    const handleQuickCreate = () => {
        const start = parseInt(createRadioForm.quickStart)
        const end = parseInt(createRadioForm.quickEnd)

        if (isNaN(start) || isNaN(end)) {
            toast.error('Digite números válidos para início e fim')
            return
        }

        if (start > end) {
            toast.error('O número inicial deve ser menor que o final')
            return
        }

        if (end - start > 100) {
            toast.error('O intervalo máximo é de 100 rádios')
            return
        }

        const newCodes: string[] = []
        for (let i = start; i <= end; i++) {
            newCodes.push(i.toString())
        }

        setCreateRadioForm(prev => ({
            ...prev,
            radio_codes: [...prev.radio_codes, ...newCodes],
            quickStart: '',
            quickEnd: ''
        }))

        toast.success(`${newCodes.length} rádios adicionados`)
    }

    const openPartialReturnModal = (assignment: RadioAssignment) => {
        setSelectedAssignment(assignment)
        setPartialReturnForm({
            returned_radio_codes: [],
            notes: ''
        })
        setIsPartialReturnModalOpen(true)
    }

    const openExchangeModal = (assignment: RadioAssignment) => {
        setSelectedAssignment(assignment)
        setExchangeForm({
            old_radio_codes: [],
            new_radio_codes: [],
            notes: ''
        })
        setIsExchangeModalOpen(true)
    }

    // Handlers para ações
    const handleCreateAssignment = async () => {
        if (!selectedDay) {
            toast.error('Selecione um dia primeiro')
            return
        }

        if (!newAssignmentForm.assigned_to.trim()) {
            toast.error('Informe o nome/empresa')
            return
        }

        if (newAssignmentForm.radio_codes.length === 0) {
            toast.error('Selecione pelo menos um rádio')
            return
        }

        try {
            // Extrair informações do shift ID
            const parseShiftId = (shiftId: string) => {
                const parts = shiftId.split('-');
                if (parts.length >= 5) {
                    return {
                        workDate: `${parts[0]}-${parts[1]}-${parts[2]}`, // YYYY-MM-DD
                        workStage: parts[3] as 'montagem' | 'evento' | 'desmontagem',
                        workPeriod: parts[4] as 'diurno' | 'noturno'
                    };
                }
                return {
                    workDate: selectedDay,
                    workStage: 'evento' as const,
                    workPeriod: 'diurno' as const
                };
            };

            const shiftInfo = parseShiftId(selectedDay);

            // Converter data para formato brasileiro (DD/MM/YYYY)
            const eventDayFormatted = formatEventDate(shiftInfo.workDate);

            await createAssignmentMutation.mutateAsync({
                event_id: eventId,
                event_day: eventDayFormatted, // Formato DD/MM/YYYY (10 chars)
                assigned_to: newAssignmentForm.assigned_to.trim(),
                company: newAssignmentForm.company?.trim() || undefined,
                contact: newAssignmentForm.contact?.trim() || undefined,
                radio_codes: newAssignmentForm.radio_codes,
                notes: newAssignmentForm.notes?.trim() || undefined,
                withdrawal_code: newAssignmentForm.withdrawal_code,
                assigned_by: 'Sistema'
            })

            toast.success('Atribuição criada com sucesso!')
            setIsNewAssignmentModalOpen(false)
        } catch (error) {
            console.error('Erro ao criar atribuição:', error)
            toast.error('Erro ao criar atribuição')
        }
    }

    const handleTotalReturn = async (assignment: RadioAssignment) => {
        try {
            await updateAssignmentMutation.mutateAsync({
                id: assignment.id,
                data: {
                    status: 'devolvido',
                    returned_at: new Date().toISOString(),
                    notes: 'Devolução total realizada'
                }
            })

            toast.success('Devolução total registrada!')
        } catch (error) {
            console.error('Erro ao registrar devolução total:', error)
            toast.error('Erro ao registrar devolução total')
        }
    }

    const handlePartialReturn = async () => {
        if (!selectedAssignment) return

        if (partialReturnForm.returned_radio_codes.length === 0) {
            toast.error('Selecione pelo menos um rádio para devolver')
            return
        }

        // Verificar se os rádios selecionados estão realmente com a pessoa
        const invalidRadios = partialReturnForm.returned_radio_codes.filter(
            radio => !selectedAssignment.radio_codes.includes(radio)
        )

        if (invalidRadios.length > 0) {
            toast.error(`Rádios não encontrados: ${invalidRadios.join(', ')}`)
            return
        }

        try {
            await partialReturnMutation.mutateAsync({
                assignment_id: selectedAssignment.id,
                returned_radio_codes: partialReturnForm.returned_radio_codes,
                notes: partialReturnForm.notes?.trim() || undefined,
                performed_by: 'Sistema'
            })

            toast.success('Devolução parcial registrada!')
            setIsPartialReturnModalOpen(false)
        } catch (error: unknown) {
            console.error('Erro ao registrar devolução parcial:', error)

            // Log detalhado do erro
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response: { status: number; data: unknown; headers: unknown } }
                console.error('Status:', axiosError.response.status)
                console.error('Data:', axiosError.response.data)
                console.error('Headers:', axiosError.response.headers)
                const errorMessage = axiosError.response.data && typeof axiosError.response.data === 'object' && 'error' in axiosError.response.data
                    ? String(axiosError.response.data.error)
                    : 'Erro ao registrar devolução parcial'
                toast.error(`Erro ${axiosError.response.status}: ${errorMessage}`)
            } else if (error && typeof error === 'object' && 'request' in error) {
                console.error('Request:', (error as { request: unknown }).request)
                toast.error('Erro de conexão com o servidor')
            } else {
                console.error('Error:', error)
                toast.error('Erro ao registrar devolução parcial')
            }
        }
    }

    const handleExchange = async () => {
        if (!selectedAssignment) return

        if (exchangeForm.old_radio_codes.length !== 1 || exchangeForm.new_radio_codes.length !== 1) {
            toast.error('Selecione exatamente um rádio para trocar e um rádio disponível')
            return
        }

        // Verificar se o rádio antigo está com a pessoa
        const invalidOldRadios = exchangeForm.old_radio_codes.filter(
            radio => !selectedAssignment.radio_codes.includes(radio)
        )

        if (invalidOldRadios.length > 0) {
            toast.error(`Rádio não encontrado: ${invalidOldRadios.join(", ")}`)
            return
        }

        // Verificar se o novo rádio está disponível
        const unavailableNewRadios = exchangeForm.new_radio_codes.filter(
            radio => !availableRadios.includes(radio)
        )

        if (unavailableNewRadios.length > 0) {
            toast.error(`Rádio não disponível: ${unavailableNewRadios.join(", ")}`)
            return
        }

        try {
            await exchangeMutation.mutateAsync({
                assignment_id: selectedAssignment.id,
                old_radio_codes: exchangeForm.old_radio_codes,
                new_radio_codes: exchangeForm.new_radio_codes,
                notes: exchangeForm.notes?.trim() || undefined,
                performed_by: 'Sistema'
            })

            toast.success('Troca de rádios registrada!')
            setIsExchangeModalOpen(false)
        } catch (error) {
            console.error('Erro ao registrar troca:', error)
            toast.error('Erro ao registrar troca')
        }
    }

    const handleCreateRadio = async () => {
        if (createRadioForm.radio_codes.length === 0) {
            toast.error('Adicione pelo menos um rádio')
            return
        }

        if (createRadioStages.length === 0) {
            toast.error('Selecione pelo menos um turno para definir o estágio dos rádios')
            return
        }

        try {
            // Criar rádios para cada estágio selecionado
            const radiosToCreate: Array<{
                event_id: string;
                radio_code: string;
                status: string;
                stage: string;
            }> = []

            createRadioStages.forEach(stage => {
                createRadioForm.radio_codes.forEach(radioCode => {
                    // Adicionar sufixo do estágio ao código do rádio se mais de um estágio
                    const finalRadioCode = createRadioStages.length > 1
                        ? `${radioCode}-${stage.toUpperCase()}`
                        : radioCode

                    radiosToCreate.push({
                        event_id: eventId,
                        radio_code: finalRadioCode,
                        status: 'disponivel',
                        stage: stage
                    })
                })
            })

            await createMultipleRadiosMutation.mutateAsync({ radios: radiosToCreate })

            const totalRadios = radiosToCreate.length
            const stagesText = createRadioStages.join(', ').toUpperCase()

            toast.success(`${totalRadios} rádio(s) criado(s) para os estágios: ${stagesText}`)
            setIsCreateRadioModalOpen(false)
        } catch (error) {
            console.error('Erro ao criar rádios:', error)
        }
    }

    // Função para obter status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ativo':
                return <Badge className="bg-green-100 text-green-800">Ativo</Badge>
            case 'devolvido':
                return <Badge className="bg-blue-100 text-blue-800">Devolvido</Badge>
            case 'parcial':
                return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    if (!evento) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                </div>
            </div>
        )
    }

    return (
        <EventLayout eventId={eventId} eventName={evento.name}>
            <div className="p-8">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Atribuições</p>
                                    <p className="text-3xl font-bold">{stats.total}</p>
                                </div>
                                <Users className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Ativos</p>
                                    <p className="text-3xl font-bold">{stats.active}</p>
                                </div>
                                <Check className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Rádios Ativos</p>
                                    <p className="text-3xl font-bold">{stats.activeRadios}</p>
                                </div>
                                <Radio className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Disponíveis</p>
                                    <p className="text-3xl font-bold">{availableRadios.length}</p>
                                </div>
                                <RefreshCw className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Bar */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={openNewAssignmentModal}
                                disabled={!selectedDay}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Atribuição
                            </Button>

                            <Button
                                onClick={openCreateRadioModal}
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                            >
                                <Radio className="w-4 h-4 mr-2" />
                                Criar Rádio
                            </Button>

                            <Button
                                onClick={() => setIsImportRadiosModalOpen(true)}
                                variant="outline"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Importar Rádios
                            </Button>

                            <Input
                                type="text"
                                placeholder="Buscar por nome, contato ou rádio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-80"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={showOnlyActive}
                                    onChange={(e) => setShowOnlyActive(e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm text-gray-600">Apenas ativos</span>
                            </label>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Download className="w-4 h-4 mr-2" />
                                        Exportar PDF
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleExportPDF()}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Relatório Geral
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportPDF('montagem')}>
                                        <Settings className="w-4 h-4 mr-2" />
                                        Apenas Montagem
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportPDF('evento')}>
                                        <Clock className="w-4 h-4 mr-2" />
                                        Apenas Evento
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportPDF('desmontagem')}>
                                        <X className="w-4 h-4 mr-2" />
                                        Apenas Desmontagem
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Tabs dos dias */}
                <div className="mb-8">
                    <div className="border-b border-gray-200 bg-white rounded-t-lg">
                        <nav className="-mb-px flex flex-wrap gap-1 px-4 py-2">
                            {getEventDays().map((day) => {
                                // Extrair a data do day.id (formato: YYYY-MM-DD-stage-period)
                                const dayDate = day.id.split('-').slice(0, 3).join('-'); // YYYY-MM-DD
                                const dayFormatted = formatEventDate(dayDate + 'T00:00:00'); // Converter para DD/MM/YYYY
                                const assignmentsInDay = allAssignments.filter(a => a.event_day === dayFormatted).length
                                const isActive = selectedDay === day.id

                                return (
                                    <button
                                        key={day.id}
                                        onClick={() => setSelectedDay(day.id)}
                                        className={`border-b-2 py-2 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                                            ? getTabColor(day.type, true)
                                            : `border-transparent text-gray-500 ${getTabColor(day.type, false)}`
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
                                                    {day.type === 'montagem' || day.type === 'setup' ? 'MONTAGEM' :
                                                        day.type === 'evento' || day.type === 'event' || day.type === 'preparation' ? 'EVENTO' :
                                                            day.type === 'desmontagem' || day.type === 'teardown' || day.type === 'finalization' ? 'DESMONTAGEM' :
                                                                'EVENTO'}
                                                </span>
                                                {day.period && (
                                                    <span className="text-xs opacity-60">
                                                        ({day.period === 'diurno' ? 'D' : 'N'})
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs opacity-75">
                                                {allAssignmentsLoading ? (
                                                    <span className="inline-block w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                                                ) : (
                                                    `(${assignmentsInDay})`
                                                )}
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                {/* Tabela de atribuições */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Código
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Pessoa/Empresa
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Contato
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Rádios
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Data
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Histórico
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {assignmentsLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                <p>Carregando atribuições...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredAssignments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <Radio className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-lg font-semibold text-gray-700 mb-2">
                                                    {selectedDay ? `Nenhuma atribuição encontrada para ${selectedDay}` : 'Selecione um dia'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {selectedDay ? 'Crie uma nova atribuição de rádios para este dia' : 'Escolha um dia do evento para ver as atribuições'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAssignments.map((assignment) => (
                                        <tr key={assignment.id} className="hover:bg-gray-50">
                                            {/* Código de Retirada */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-mono text-lg font-bold text-purple-600">
                                                    #{assignment.withdrawal_code || 'N/A'}
                                                </div>
                                            </td>

                                            {/* Pessoa/Empresa */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {assignment.assigned_to}
                                                        </div>
                                                        {assignment.company && (
                                                            <div className="text-sm text-gray-600">
                                                                {assignment.company}
                                                            </div>
                                                        )}
                                                        {assignment.notes && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {assignment.notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contato */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {assignment.contact || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                    {assignment.radio_codes.map((radio, index) => (
                                                        <Badge key={index} variant="outline" className="text-xs">
                                                            {radio}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(assignment.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    {formatEventDate(assignment.assigned_at)}
                                                </div>
                                                {assignment.returned_at && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatEventDate(assignment.returned_at)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedAssignment(assignment)
                                                        setIsHistoryModalOpen(true)
                                                    }}
                                                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                                >
                                                    <Clock className="w-4 h-4 mr-1" />
                                                    Ver Histórico
                                                </Button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    {(assignment.status === 'ativo' || assignment.status === 'parcial') && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleTotalReturn(assignment)}
                                                                className="text-green-600 border-green-200 hover:bg-green-50"
                                                            >
                                                                <Check className="w-4 h-4 mr-1" />
                                                                Devolver Todos
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openPartialReturnModal(assignment)}
                                                                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                                                            >
                                                                <RotateCcw className="w-4 h-4 mr-1" />
                                                                Devolver Parcial
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openExchangeModal(assignment)}
                                                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                            >
                                                                <RefreshCw className="w-4 h-4 mr-1" />
                                                                Trocar
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal Nova Retirada */}
                <AlertDialog open={isNewAssignmentModalOpen} onOpenChange={setIsNewAssignmentModalOpen} >
                    <AlertDialogContent className="max-w-md bg-white text-gray-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Nova Atribuição de Rádios</AlertDialogTitle>
                            <AlertDialogDescription>
                                Atribuir rádios do estágio {selectedStage?.toUpperCase()} para o período de {selectedDay}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Código de Retirada */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Código de Retirada
                                </label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={newAssignmentForm.withdrawal_code}
                                        readOnly
                                        className="font-mono text-lg font-bold text-center bg-gray-50"
                                        placeholder="0000"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setNewAssignmentForm(prev => ({
                                            ...prev,
                                            withdrawal_code: generateWithdrawalCode()
                                        }))}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Código único para controle e comprovante de retirada
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome da Pessoa *
                                </label>
                                <Input
                                    value={newAssignmentForm.assigned_to}
                                    onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                                    placeholder="Nome completo da pessoa"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Empresa (Opcional)
                                </label>
                                <Input
                                    value={newAssignmentForm.company}
                                    onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, company: e.target.value }))}
                                    placeholder="Nome da empresa"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contato
                                </label>
                                <Input
                                    value={newAssignmentForm.contact}
                                    onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, contact: e.target.value }))}
                                    placeholder="Email, telefone, etc."
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Rádios Disponíveis ({filteredAvailableRadios.length} de {availableRadios.length} para {selectedStage?.toUpperCase()})
                                    </label>
                                </div>

                                {/* Buscador de Rádios */}
                                <div className="mb-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            value={radioSearchTerm}
                                            onChange={(e) => setRadioSearchTerm(e.target.value)}
                                            placeholder="Buscar número do rádio..."
                                            className="pl-10 text-sm"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Digite o número do rádio para filtrar rapidamente
                                    </p>
                                </div>

                                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                                    {availableRadiosLoading ? (
                                        <p className="text-sm text-gray-500">Carregando rádios...</p>
                                    ) : filteredAvailableRadios.length === 0 ? (
                                        <div className="text-sm text-gray-500 text-center py-2">
                                            {radioSearchTerm ? (
                                                <p>Nenhum rádio encontrado para &quot;{radioSearchTerm}&quot;</p>
                                            ) : (
                                                <>
                                                    <p>Nenhum rádio disponível para o estágio {selectedStage?.toUpperCase()}</p>
                                                    <p className="text-xs mt-1">Crie rádios específicos para este estágio primeiro</p>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {filteredAvailableRadios.map((radio) => (
                                                <label key={radio} className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={newAssignmentForm.radio_codes.includes(radio)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setNewAssignmentForm(prev => ({
                                                                    ...prev,
                                                                    radio_codes: [...prev.radio_codes, radio]
                                                                }))
                                                            } else {
                                                                setNewAssignmentForm(prev => ({
                                                                    ...prev,
                                                                    radio_codes: prev.radio_codes.filter(r => r !== radio)
                                                                }))
                                                            }
                                                        }}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm font-mono">{radio}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Resumo de seleção */}
                                {newAssignmentForm.radio_codes.length > 0 && (
                                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                        <p className="text-xs text-blue-700">
                                            <strong>{newAssignmentForm.radio_codes.length}</strong> rádio(s) selecionado(s): {newAssignmentForm.radio_codes.join(', ')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Observações
                                </label>
                                <Input
                                    value={newAssignmentForm.notes}
                                    onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Observações opcionais"
                                />
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleCreateAssignment}
                                disabled={!newAssignmentForm.assigned_to.trim() || newAssignmentForm.radio_codes.length === 0}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                Criar Atribuição
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Modal Devolução Parcial */}
                <AlertDialog open={isPartialReturnModalOpen} onOpenChange={setIsPartialReturnModalOpen}>
                    <AlertDialogContent className="max-w-md bg-white text-gray-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Devolução Parcial</AlertDialogTitle>
                            <AlertDialogDescription>
                                Devolver rádios de {selectedAssignment?.assigned_to}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="space-y-4 py-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rádios para Devolver
                                </label>
                                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                                    {selectedAssignment?.radio_codes.map((radio) => (
                                        <label key={radio} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={partialReturnForm.returned_radio_codes.includes(radio)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setPartialReturnForm(prev => ({
                                                            ...prev,
                                                            returned_radio_codes: [...prev.returned_radio_codes, radio]
                                                        }))
                                                    } else {
                                                        setPartialReturnForm(prev => ({
                                                            ...prev,
                                                            returned_radio_codes: prev.returned_radio_codes.filter(r => r !== radio)
                                                        }))
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <span className="text-sm">{radio}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Observações
                                </label>
                                <Input
                                    value={partialReturnForm.notes}
                                    onChange={(e) => setPartialReturnForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Observações opcionais"
                                />
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handlePartialReturn}
                                disabled={partialReturnForm.returned_radio_codes.length === 0}
                                className="bg-yellow-600 hover:bg-yellow-700"
                            >
                                Confirmar Devolução
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Modal Troca de Rádios */}
                <AlertDialog open={isExchangeModalOpen} onOpenChange={setIsExchangeModalOpen}>
                    <AlertDialogContent className="max-w-4xl bg-white text-gray-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Troca de Rádios</AlertDialogTitle>
                            <AlertDialogDescription>
                                Trocar rádios de {selectedAssignment?.assigned_to}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Coluna 1: Rádio Atual */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rádio Atual
                                    </label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {selectedAssignment?.radio_codes.map((radio) => (
                                            <div key={radio} className="flex items-center justify-between p-2 border rounded-lg bg-gray-50">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <Radio className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                                    <span className="text-sm font-medium truncate">{radio}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (exchangeForm.old_radio_codes.includes(radio)) {
                                                            setExchangeForm(prev => ({
                                                                ...prev,
                                                                old_radio_codes: prev.old_radio_codes.filter(r => r !== radio),
                                                                new_radio_codes: prev.new_radio_codes.filter((_, index) =>
                                                                    prev.old_radio_codes.indexOf(radio) !== index
                                                                )
                                                            }))
                                                        } else {
                                                            // Limitar a 1 rádio por vez para troca
                                                            setExchangeForm(prev => ({
                                                                ...prev,
                                                                old_radio_codes: [radio],
                                                                new_radio_codes: []
                                                            }))
                                                        }
                                                    }}
                                                    className={`text-xs flex-shrink-0 ${exchangeForm.old_radio_codes.includes(radio)
                                                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                                                        : 'bg-gray-100 text-gray-700 border-gray-300'
                                                        }`}
                                                >
                                                    {exchangeForm.old_radio_codes.includes(radio) ? 'Selecionado' : 'Selecionar'}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Coluna 2: Rádios Disponíveis */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rádio Disponível para Troca
                                    </label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {availableRadios.map((radio) => {
                                            const isSelected = exchangeForm.new_radio_codes.includes(radio)
                                            const isInUse = selectedAssignment?.radio_codes.includes(radio)

                                            return (
                                                <div key={radio} className={`flex items-center justify-between p-2 border rounded-lg ${isInUse ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                                                    }`}>
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <Radio className={`h-4 w-4 flex-shrink-0 ${isInUse ? 'text-red-500' : 'text-green-500'
                                                            }`} />
                                                        <span className={`text-sm font-medium truncate ${isInUse ? 'text-red-700' : 'text-green-700'
                                                            }`}>
                                                            {radio}
                                                        </span>
                                                        {isInUse && (
                                                            <Badge variant="destructive" className="text-xs flex-shrink-0">
                                                                Em uso
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={isInUse}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setExchangeForm(prev => ({
                                                                    ...prev,
                                                                    new_radio_codes: []
                                                                }))
                                                            } else {
                                                                // Limitar a 1 rádio por vez para troca
                                                                setExchangeForm(prev => ({
                                                                    ...prev,
                                                                    new_radio_codes: [radio]
                                                                }))
                                                            }
                                                        }}
                                                        className={`text-xs flex-shrink-0 ${isInUse
                                                            ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                                            : isSelected
                                                                ? 'bg-green-100 text-green-700 border-green-300'
                                                                : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                                                            }`}
                                                    >
                                                        {isInUse ? 'Indisponível' : isSelected ? 'Selecionado' : 'Selecionar'}
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Informações da Troca */}
                            {exchangeForm.old_radio_codes.length > 0 && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="text-sm font-medium text-blue-800 mb-2">Resumo da Troca:</h4>
                                    <div className="space-y-1">
                                        <div className="text-xs text-blue-700">
                                            <span className="font-medium">Rádio para trocar:</span> {exchangeForm.old_radio_codes.join(', ')}
                                        </div>
                                        {exchangeForm.new_radio_codes.length > 0 && (
                                            <div className="text-xs text-blue-700">
                                                <span className="font-medium">Novo rádio:</span> {exchangeForm.new_radio_codes.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Observações
                                </label>
                                <Input
                                    value={exchangeForm.notes}
                                    onChange={(e) => setExchangeForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Observações opcionais"
                                />
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleExchange}
                                disabled={exchangeForm.old_radio_codes.length !== 1 || exchangeForm.new_radio_codes.length !== 1}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Confirmar Troca
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Modal Criar Rádio */}
                <AlertDialog open={isCreateRadioModalOpen} onOpenChange={setIsCreateRadioModalOpen}>
                    <AlertDialogContent className="max-w-xl bg-white text-gray-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Criar Novos Rádios</AlertDialogTitle>
                            <AlertDialogDescription>
                                Adicionar novos rádios para os estágios: {createRadioStages.length > 0 ? createRadioStages.join(', ').toUpperCase() : 'Selecione um ou mais turnos'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {/* Seleção de Turno */}
                        <div className="space-y-4 py-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Selecionar Turnos para Criação dos Rádios (múltipla seleção)
                                    </label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const allDayIds = getEventDays().map(day => day.id);
                                                setCreateRadioForm(prev => ({
                                                    ...prev,
                                                    selectedTurns: allDayIds
                                                }));
                                            }}
                                            className="text-xs h-6 px-2"
                                        >
                                            Todos
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setCreateRadioForm(prev => ({
                                                    ...prev,
                                                    selectedTurns: []
                                                }));
                                            }}
                                            className="text-xs h-6 px-2"
                                        >
                                            Limpar
                                        </Button>
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                    <div className="space-y-2">
                                        {getEventDays().map((day) => {
                                            const isSelected = createRadioForm.selectedTurns.includes(day.id);
                                            return (
                                                <label key={day.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setCreateRadioForm(prev => ({
                                                                    ...prev,
                                                                    selectedTurns: [...prev.selectedTurns, day.id]
                                                                }))
                                                            } else {
                                                                setCreateRadioForm(prev => ({
                                                                    ...prev,
                                                                    selectedTurns: prev.selectedTurns.filter(id => id !== day.id)
                                                                }))
                                                            }
                                                        }}
                                                        className="rounded"
                                                    />
                                                    <div className="flex items-center gap-2 text-sm">
                                                        {getPeriodIcon(day.period)}
                                                        <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                                            {day.label}
                                                        </span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                {createRadioStages.length > 0 && (
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                        <p className="text-xs text-green-600">
                                            ✓ <strong>{createRadioForm.selectedTurns.length}</strong> turno(s) selecionado(s)
                                        </p>
                                        <p className="text-xs text-green-700 mt-1">
                                            📋 Rádios serão criados para os estágios: <strong>{createRadioStages.join(', ').toUpperCase()}</strong>
                                        </p>
                                        {createRadioStages.length > 1 && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                ℹ️ Códigos terão sufixo do estágio (ex: &quot;001-MONTAGEM&quot;, &quot;001-EVENTO&quot;)
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Criação Rápida
                            </label>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-600 mb-1">Início</label>
                                    <Input
                                        type="number"
                                        value={createRadioForm.quickStart}
                                        onChange={(e) => setCreateRadioForm(prev => ({ ...prev, quickStart: e.target.value }))}
                                        placeholder="1"
                                        className="text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-600 mb-1">Fim</label>
                                    <Input
                                        type="number"
                                        value={createRadioForm.quickEnd}
                                        onChange={(e) => setCreateRadioForm(prev => ({ ...prev, quickEnd: e.target.value }))}
                                        placeholder="10"
                                        className="text-sm"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleQuickCreate}
                                    disabled={!createRadioForm.quickStart || !createRadioForm.quickEnd}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                                >
                                    Criar Sequência
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Ex: 1-10 criará rádios 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
                            </p>
                        </div>
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Código do Rádio
                                </label>
                                <Input
                                    value={createRadioForm.radio_code}
                                    onChange={(e) => setCreateRadioForm(prev => ({ ...prev, radio_code: e.target.value }))}
                                    onKeyPress={handleRadioCodeKeyPress}
                                    onBlur={handleRadioCodeBlur}
                                    placeholder="Digite o código e pressione Enter ou Espaço"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Digite o código do rádio e pressione Enter ou Espaço para adicionar
                                </p>
                            </div>



                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rádios para Criar ({createRadioForm.radio_codes.length})
                                </label>
                                <div className="min-h-20 max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50">
                                    {createRadioForm.radio_codes.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">
                                            Nenhum rádio adicionado. Digite códigos acima.
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {createRadioForm.radio_codes.map((code, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="outline"
                                                    className="text-xs flex items-center gap-1 bg-white hover:bg-gray-50"
                                                >
                                                    <span>{code}</span>
                                                    <X
                                                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                                                        onClick={() => handleRemoveRadioCode(code)}
                                                    />
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleCreateRadio}
                                disabled={createRadioForm.radio_codes.length === 0 || createRadioStages.length === 0}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Criar {createRadioForm.radio_codes.length * createRadioStages.length} Rádio(s)
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Modal Importar Rádios */}
                <ImportRadiosModal
                    isOpen={isImportRadiosModalOpen}
                    onClose={() => setIsImportRadiosModalOpen(false)}
                    eventId={eventId}
                />

                {/* Modal Histórico */}
                <AlertDialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
                    <AlertDialogContent className="max-w-4xl bg-white text-gray-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Histórico de Operações</AlertDialogTitle>
                            <AlertDialogDescription>
                                Histórico de operações para {selectedAssignment?.assigned_to}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Informações da Atribuição:</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">Pessoa/Empresa:</span> {selectedAssignment?.assigned_to}
                                    </div>
                                    <div>
                                        <span className="font-medium">Status:</span> {getStatusBadge(selectedAssignment?.status || '')}
                                    </div>
                                    <div>
                                        <span className="font-medium">Data de Atribuição:</span> {selectedAssignment?.assigned_at ? formatEventDate(selectedAssignment.assigned_at) : '-'}
                                    </div>
                                    <div>
                                        <span className="font-medium">Rádios Atuais:</span> {selectedAssignment?.radio_codes.join(', ') || '-'}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Operações Realizadas:</h4>
                                <div className="space-y-3">
                                    {/* Operação de Retirada Inicial */}
                                    <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-blue-800">Atribuição Inicial</div>
                                                <div className="text-sm text-blue-600">
                                                    {selectedAssignment?.assigned_at ? formatEventDate(selectedAssignment.assigned_at) : '-'}
                                                </div>
                                                <div className="text-xs text-blue-500 mt-1">
                                                    Rádios atribuídos: {selectedAssignment?.radio_codes.join(', ')}
                                                </div>
                                            </div>
                                            <Badge className="bg-blue-100 text-blue-800">Atribuição</Badge>
                                        </div>
                                    </div>

                                    {/* Operações do histórico */}
                                    {operationsLoading ? (
                                        <div className="text-center text-gray-500 py-4">
                                            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                            <p className="text-sm">Carregando operações...</p>
                                        </div>
                                    ) : operationsData?.data && operationsData.data.length > 0 ? (
                                        operationsData.data.map((operation) => {
                                            return (
                                                <div key={operation.id} className={`border-l-4 pl-4 py-2 rounded-r-lg ${operation.operation_type === 'devolucao_total' ? 'border-green-500 bg-green-50' :
                                                    operation.operation_type === 'devolucao_parcial' ? 'border-yellow-500 bg-yellow-50' :
                                                        operation.operation_type === 'troca' ? 'border-blue-500 bg-blue-50' :
                                                            'border-gray-500 bg-gray-50'
                                                    }`}>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className={`font-medium ${operation.operation_type === 'devolucao_total' ? 'text-green-800' :
                                                                operation.operation_type === 'devolucao_parcial' ? 'text-yellow-800' :
                                                                    operation.operation_type === 'troca' ? 'text-blue-800' :
                                                                        'text-gray-800'
                                                                }`}>
                                                                {operation.operation_type === 'devolucao_total' ? 'Devolução Total' :
                                                                    operation.operation_type === 'devolucao_parcial' ? 'Devolução Parcial' :
                                                                        operation.operation_type === 'troca' ? 'Troca de Rádios' :
                                                                            'Operação'}
                                                            </div>
                                                            <div className={`text-sm ${operation.operation_type === 'devolucao_total' ? 'text-green-600' :
                                                                operation.operation_type === 'devolucao_parcial' ? 'text-yellow-600' :
                                                                    operation.operation_type === 'troca' ? 'text-blue-600' :
                                                                        'text-gray-600'
                                                                }`}>
                                                                {formatEventDate(operation.performed_at)}
                                                            </div>
                                                            <div className={`text-xs mt-1 ${operation.operation_type === 'devolucao_total' ? 'text-green-500' :
                                                                operation.operation_type === 'devolucao_parcial' ? 'text-yellow-500' :
                                                                    operation.operation_type === 'troca' ? 'text-blue-500' :
                                                                        'text-gray-500'
                                                                }`}>
                                                                {operation.operation_type === 'devolucao_total' && `Rádios devolvidos: ${operation.radio_codes.join(', ')}`}
                                                                {operation.operation_type === 'devolucao_parcial' && `Rádios devolvidos: ${operation.radio_codes.join(', ')}`}
                                                                {operation.operation_type === 'troca' && `Troca: ${operation.old_radio_codes?.join(', ') || 'N/A'} → ${operation.new_radio_codes?.join(', ') || 'N/A'}`}
                                                                {operation.notes && ` - ${operation.notes}`}
                                                            </div>
                                                        </div>
                                                        <Badge className={`${operation.operation_type === 'devolucao_total' ? 'bg-green-100 text-green-800' :
                                                            operation.operation_type === 'devolucao_parcial' ? 'bg-yellow-100 text-yellow-800' :
                                                                operation.operation_type === 'troca' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {operation.operation_type === 'devolucao_total' ? 'Devolução' :
                                                                operation.operation_type === 'devolucao_parcial' ? 'Parcial' :
                                                                    operation.operation_type === 'troca' ? 'Troca' :
                                                                        'Operação'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-center text-gray-500 py-8">
                                            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                            <p className="text-sm">Nenhuma operação registrada</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Devoluções, trocas e outras operações aparecerão nesta lista
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel>Fechar</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </EventLayout>
    )
}