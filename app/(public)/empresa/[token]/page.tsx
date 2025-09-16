/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, Users, Calendar, MapPin, Phone, Mail, User, Clock, CheckCircle, XCircle, Upload, FileSpreadsheet, Download, AlertCircle, Loader2, FileText, Check, X, AlertTriangle, Search, Filter, ChevronDown, Sun, Moon } from "lucide-react"
import { toast } from "sonner"
import { useParams } from "next/navigation"
import { getEmpresa } from "@/features/eventos/actions/get-empresas"
import { getEvent } from "@/features/eventos/actions/get-event"

import { updateEventParticipant } from "@/features/eventos/actions/update-event-participant"
import { getMovementCredentialByParticipant } from "@/features/eventos/actions/movement-credentials"
import { useImportRequestsByEmpresa } from "@/features/eventos/api/query/use-import-requests"
import type { Empresa, EventParticipant, Event, ImportRequest, EventAttendance, Credential } from "@/features/eventos/types"
import { apiClient } from "@/lib/api-client"
import { useClerk } from "@clerk/nextjs"
import * as XLSX from "xlsx"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event"
import { useEventAttendanceByEventAndDate, useEventAttendanceByShift } from "@/features/eventos/api/query/use-event-attendance"
import { useExportPDF } from "@/features/eventos/api/mutation/use-export-pdf"
import { useExportXLSX } from "@/features/eventos/api/mutation/use-export-xlsx"
import { ColumnSelectionDialog, type ExportConfig } from "./components/column-selection-dialog"

interface DecodedToken {
    empresaId: string
    eventId: string
    timestamp: number
}

interface ImportData {
    nome: string
    cpf: string
    funcao: string
    empresa: string
    credencial: string
}

interface ProcessedImportData {
    fileName: string
    totalRows: number
    validRows: number
    invalidRows: number
    data: ImportData[]
    errors: Array<{ item: Record<string, unknown>; error: string; row: number }>
}

interface ImportRequestData {
    nome: string
    cpf: string
    funcao: string
    empresa: string
    credencial: string
}



export default function PublicEmpresaPage() {
    const [empresa, setEmpresa] = useState<Empresa | null>(null)
    const [event, setEvent] = useState<Event | null>(null)
    const [participants, setParticipants] = useState<EventParticipant[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedDay, setSelectedDay] = useState<string>("")
    const [editingParticipant, setEditingParticipant] = useState<string | null>(null)
    const [editingField, setEditingField] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<string>("")
    const [saving, setSaving] = useState(false)
    const [editingEmpresa, setEditingEmpresa] = useState<string | null>(null)
    const [empresaEditValue, setEmpresaEditValue] = useState<string>("")

    // Import states
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [processedData, setProcessedData] = useState<ProcessedImportData | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [dragActive, setDragActive] = useState(false)

    // Table filter states
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [filtros, setFiltros] = useState({
        empresa: '',
        funcao: '',
        status: 'all' // all, present, absent
    })
    const [ordenacao, setOrdenacao] = useState<{
        campo: string
        direcao: 'asc' | 'desc'
    }>({ campo: 'name', direcao: 'asc' })

    // Attendance data states (similar to operator panel)
    const [participantsAttendanceStatus, setParticipantsAttendanceStatus] = useState<
        Map<
            string,
            {
                checkIn: string | null
                checkOut: string | null
                status: string
            }
        >
    >(new Map())
    const [loadingAttendance, setLoadingAttendance] = useState(false)
    const [attendanceDataLoaded, setAttendanceDataLoaded] = useState(false)
    const [isTableExpanded, setIsTableExpanded] = useState(false)

    // Export hooks
    const exportPDFMutation = useExportPDF()
    const exportXLSXMutation = useExportXLSX()

    // Dialog states
    const [showColumnDialog, setShowColumnDialog] = useState(false)

    // Estado para armazenar os códigos das pulseiras dos participantes
    const [participantWristbandCodes, setParticipantWristbandCodes] = useState<Map<string, string>>(new Map())

    const { user } = useClerk()
    const isClerkUser = !!user

    const params = useParams()
    const token = params.token as string

    // Buscar histórico de importações da empresa
    const { data: importHistory, isLoading: loadingHistory } = useImportRequestsByEmpresa(
        empresa?.id || ""
    )





    // Decodificar token
    const decodeToken = (token: string): DecodedToken | null => {
        try {
            const decoded = atob(token)
            const [empresaId, eventId, timestamp] = decoded.split(':')
            return {
                empresaId,
                eventId,
                timestamp: parseInt(timestamp)
            }
        } catch (error) {
            console.error("Erro ao decodificar token:", error)
            return null
        }
    }

    // Verificar se o token é válido (não expirado - 7 dias)
    const isTokenValid = (timestamp: number) => {
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
        return Date.now() - timestamp < sevenDaysInMs
    }

    // Decodificar token para obter eventId
    const decodedToken = React.useMemo(() => decodeToken(token), [token])
    const eventId = decodedToken?.eventId || ""

    const {
        data: participantsData = [],
        isLoading: participantsLoading,
        isError: participantsError,
        error: participantsErrorObj,
        refetch: refetchParticipants,
    } = useEventParticipantsByEvent({ eventId })

    // Hook para buscar credenciais do evento
    const { data: credentials = [] } = useCredentialsByEvent(eventId)

    // Função para formatar data para o formato esperado pela API (DD-MM-YYYY) - corrigida timezone
    const formatDateForAPI = (dateString: string) => {
        if (!dateString) return ''

        // Se já está no formato brasileiro (DD/MM/YYYY)
        if (dateString.includes('/')) {
            return dateString.split('/').join('-')
        }

        // Se está no formato ISO (YYYY-MM-DD)
        try {
            // Usar UTC para evitar problemas de timezone
            const date = new Date(dateString + 'T12:00:00.000Z')
            const day = date.getUTCDate().toString().padStart(2, '0')
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
            const year = date.getUTCFullYear()
            return `${day}-${month}-${year}`
        } catch {
            return dateString
        }
    }

    // Função para extrair informações do shift ID
    const parseShiftId = React.useCallback((shiftId: string) => {
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
                dateFormatted: formatDate(`${year}-${month}-${day}`),
                stage,
                period
            };
        }

        // Fallback para formato simples (apenas data)
        return {
            dateISO: shiftId,
            dateFormatted: formatDate(shiftId),
            stage: 'evento',
            period: 'diurno' as const
        };
    }, []);

    // Extrair informações do turno selecionado
    const shiftInfo = React.useMemo(() => {
        if (!selectedDay) return null;
        return parseShiftId(selectedDay);
    }, [selectedDay, parseShiftId]);

    // Hook para buscar dados de presença por turno específico
    const { data: attendanceData, refetch: refetchAttendance } = useEventAttendanceByShift(
        eventId,
        shiftInfo ? shiftInfo.dateISO.split('-').reverse().join('-') : '', // Converter para dd-mm-yyyy
        shiftInfo ? shiftInfo.stage : '',
        shiftInfo ? shiftInfo.period : ''
    );

    // Filtrar participantes por dia selecionado
    const participantsByDay = React.useMemo(() => {
        if (!selectedDay) {
            return participants
        }

        // Debug: verificar estrutura dos dados
        console.log("🔍 Dia selecionado:", selectedDay)
        console.log("🔍 Exemplo de participante:", participants[0]?.daysWork)

        // Filtrar participantes que trabalham no turno selecionado
        const filtered = participants.filter(p => {
            // Verificar se o participante trabalha neste turno específico usando shiftId
            if (p.shiftId === selectedDay) {
                return true
            }

            // Verificação alternativa: comparar componentes individuais
            const shiftInfo = parseShiftId(selectedDay)
            const participantDate = p.workDate
            const participantStage = p.workStage
            const participantPeriod = p.workPeriod

            // Comparar data, stage e período
            const dateMatch = participantDate === shiftInfo.dateISO
            const stageMatch = participantStage === shiftInfo.stage
            const periodMatch =
                participantPeriod === shiftInfo.period ||
                participantPeriod === 'dia_inteiro' ||
                (participantPeriod === 'diurno' && shiftInfo.period === 'diurno') ||
                (participantPeriod === 'noturno' && shiftInfo.period === 'noturno')

            const matches = dateMatch && stageMatch && periodMatch

            console.log(`👤 ${p.name}:`, {
                participantShiftId: p.shiftId,
                selectedDay,
                participantDate,
                participantStage,
                participantPeriod,
                shiftInfo,
                dateMatch,
                stageMatch,
                periodMatch,
                matches
            })

            return matches
        })

        console.log("📊 Participantes filtrados por dia:", filtered.length)
        return filtered
    }, [participants, selectedDay])

    // Filtrar e ordenar participantes para a tabela
    const filteredAndSortedParticipants = React.useMemo(() => {
        let filtered = participantsByDay

        if (searchTerm.trim()) {
            const term = searchTerm.toUpperCase().trim()
            filtered = filtered.filter(p => {
                const name = p.name?.toUpperCase() || ''
                const cpf = p.cpf?.replace(/\D/g, '') || ''
                const searchCpf = term.replace(/\D/g, '')
                return name.includes(term) || cpf.includes(searchCpf)
            })
        }

        if (filtros.funcao && filtros.funcao !== '') {
            filtered = filtered.filter(p => p.role === filtros.funcao)
        }

        if (filtros.status && filtros.status !== 'all') {
            filtered = filtered.filter(p => {
                const attendanceStatus = participantsAttendanceStatus.get(p.id)
                if (filtros.status === 'present') {
                    return attendanceStatus?.checkIn !== null
                } else if (filtros.status === 'absent') {
                    return attendanceStatus?.checkIn === null
                }
                return true
            })
        }

        if (ordenacao.campo) {
            filtered.sort((a, b) => {
                let aVal: string = ''
                let bVal: string = ''

                switch (ordenacao.campo) {
                    case 'name':
                        aVal = a.name || ''
                        bVal = b.name || ''
                        break
                    case 'cpf':
                        aVal = a.cpf || ''
                        bVal = b.cpf || ''
                        break
                    case 'role':
                        aVal = a.role || ''
                        bVal = b.role || ''
                        break
                    case 'company':
                        aVal = a.company || ''
                        bVal = b.company || ''
                        break
                    default:
                        return 0
                }

                if (ordenacao.direcao === 'asc') {
                    return aVal.localeCompare(bVal)
                } else {
                    return bVal.localeCompare(aVal)
                }
            })
        }

        return filtered
    }, [participantsByDay, searchTerm, filtros, ordenacao, participantsAttendanceStatus])

    // Preparar dados para exportação (memoizado para reagir às mudanças dos códigos das pulseiras)
    const exportData = React.useMemo(() => {
        return filteredAndSortedParticipants.map((participant) => {
            const attendanceStatus = participantsAttendanceStatus.get(participant.id)
            const credential = credentials.find(c => c.id === participant.credentialId)

            // Obter número da pulseira do movement credential
            const wristbandCode = participantWristbandCodes.get(participant.id);
            const numeroPulseira = wristbandCode || `#${participant.id.slice(-4).toUpperCase()}`

            return {
                nome: participant.name?.toUpperCase() || '',
                cpf: participant.cpf || '',
                empresa: participant.company?.toUpperCase() || '',
                funcao: participant.role?.toUpperCase() || '',
                numeroPulseira: numeroPulseira,
                pulseira: credential?.nome || '',
                tipoPulseira: credential?.nome || '',
                checkIn: attendanceStatus?.checkIn || null,
                checkOut: attendanceStatus?.checkOut || null,
                tempoTotal: '', // Pode ser calculado se necessário
                status: !attendanceStatus ? 'Não registrado' :
                    attendanceStatus.checkIn && attendanceStatus.checkOut ? 'Finalizado' :
                        attendanceStatus.checkIn ? 'Presente' : 'Pendente'
            }
        })
    }, [filteredAndSortedParticipants, participantsAttendanceStatus, credentials, participantWristbandCodes])

    // Função para abrir dialog de exportação PDF
    const handleExportPDFClick = () => {
        if (!empresa || !event) return

        if (exportData.length === 0) {
            toast.error("Nenhum participante para exportar")
            return
        }

        setShowColumnDialog(true)
    }

    // Função para exportar PDF com configuração de colunas
    const exportPDF = (config: ExportConfig) => {
        if (!empresa || !event) return

        if (exportData.length === 0) {
            toast.error("Nenhum participante para exportar")
            return
        }

        // Preparar título detalhado com informações do evento, empresa e data
        const dadosTurno = selectedDay && shiftInfo ?
            `${shiftInfo.dateFormatted} - ${shiftInfo.stage.toUpperCase()} - ${shiftInfo.period === 'diurno' ? 'Diurno' : shiftInfo.period === 'noturno' ? 'Noturno' : shiftInfo.period === 'dia_inteiro' ? 'Dia Inteiro' : 'Diurno'}` :
            'Todos os turnos'

        const tituloCompleto = `${event.name}\n${empresa.nome} - ${dadosTurno}`

        exportPDFMutation.mutate(
            {
                titulo: tituloCompleto,
                tipo: "filtroEmpresa",
                dados: exportData,
                columnConfig: config,
                filtros: {
                    dia: selectedDay ? formatDate(selectedDay) : "all",
                    empresa: empresa.nome,
                    funcao: "all_functions",
                    status: "",
                    tipoCredencial: "all_credentials"
                },

            },
            {
                onSuccess: () => {
                    toast.success(`Relatório da empresa ${empresa.nome} exportado com sucesso!`)
                },
                onError: () => {
                    toast.error("Erro ao exportar relatório da empresa")
                }
            }
        )
    }

    // Função para exportar XLSX
    const exportXLSX = () => {
        if (!empresa || !event) return

        const excelData = exportData.map(p => ({
            nome: p.nome,
            cpf: p.cpf,
            funcao: p.funcao || "",
            empresa: p.empresa,
            numeroPulseira: p.numeroPulseira,
            tipoPulseira: p.tipoPulseira,
            pulseira: p.pulseira,
            checkIn: p.checkIn || "",
            checkOut: p.checkOut || "",
            tempoTotal: p.tempoTotal,
            status: p.status,
            pulseiraTrocada: "Não",
            cadastradoPor: "Sistema"
        }))

        if (excelData.length === 0) {
            toast.error("Nenhum participante para exportar")
            return
        }

        exportXLSXMutation.mutate({
            titulo: `Relatorio_Empresa_${empresa.nome.replace(/\s+/g, '_')}`,
            dados: excelData,
            filtros: {
                dia: selectedDay ? formatDate(selectedDay) : "all",
                empresa: empresa.nome,
                funcao: "all_functions",
                status: "",
                tipoCredencial: "all_credentials"
            }
        })
    }

    // Buscar dados da empresa
    const fetchEmpresaData = async (empresaId: string, eventId: string) => {
        try {
            // Buscar empresa
            const empresaData = await getEmpresa(empresaId)
            if (!empresaData) {
                setError("Empresa não encontrada")
                setLoading(false)
                return
            }
            setEmpresa(empresaData)

            // Buscar evento
            const eventData = await getEvent(eventId)
            if (!eventData) {
                setError("Evento não encontrado")
                setLoading(false)
                return
            }
            setEvent(eventData)

            // Auto-selecionar primeiro turno quando os dados do evento estiverem carregados
            // A seleção será feita após o evento ser carregado

        } catch (error) {
            console.error("Erro ao buscar dados:", error)
            setError("Erro ao carregar dados da empresa")
        } finally {
            setLoading(false)
        }
    }


    // Filtrar participantes da empresa quando os dados chegarem
    React.useEffect(() => {
        if (participantsData.length > 0 && empresa) {
            console.log("📊 Total de participantes encontrados:", participantsData.length)
            console.log("🏢 Nome da empresa buscada:", empresa.nome)

            // Debug: mostrar algumas empresas dos participantes
            const uniqueCompanies = [...new Set(participantsData.map(p => p.company?.toUpperCase()))]
            console.log("🏢 Empresas encontradas nos participantes:", uniqueCompanies)

            // Filtrar participantes da empresa
            const empresaParticipants = participantsData.filter((p: EventParticipant) =>
                p.company?.toUpperCase() === empresa.nome?.toUpperCase()
            )
            console.log("👥 Participantes da empresa filtrados:", empresaParticipants.length)
            setParticipants(empresaParticipants)
        }
    }, [participantsData, empresa])

    // Processar dados de presença quando recebidos do hook
    React.useEffect(() => {
        if (Array.isArray(attendanceData)) {
            const statusMap = new Map()

            attendanceData.forEach((attendance: EventAttendance) => {
                const status = attendance.checkIn && attendance.checkOut
                    ? 'Finalizado'
                    : attendance.checkIn
                        ? 'Presente'
                        : 'Pendente'

                statusMap.set(attendance.participantId, {
                    checkIn: attendance.checkIn,
                    checkOut: attendance.checkOut,
                    status: status
                })
            })

            setParticipantsAttendanceStatus(statusMap)
            setLoadingAttendance(false)
            setAttendanceDataLoaded(true)
        } else if (attendanceData !== undefined) {
            // Hook retornou mas sem dados - limpar map
            setParticipantsAttendanceStatus(new Map())
            setLoadingAttendance(false)
            setAttendanceDataLoaded(true)
        }
    }, [attendanceData])

    // Função para buscar códigos das pulseiras dos participantes
    const fetchParticipantWristbandCodes = React.useCallback(async (participants: EventParticipant[]) => {
        if (!eventId || participants.length === 0) return

        const codesMap = new Map<string, string>()

        // Buscar códigos em paralelo para melhor performance
        const promises = participants.map(async (participant) => {
            try {
                const movementCredential = await getMovementCredentialByParticipant(eventId, participant.id)
                if (movementCredential?.data?.code) {
                    codesMap.set(participant.id, movementCredential.data.code)
                }
            } catch (error) {
                console.warn(`Erro ao buscar código da pulseira para participante ${participant.id}:`, error)
            }
        })

        await Promise.allSettled(promises)
        setParticipantWristbandCodes(codesMap)
    }, [eventId])

    // Buscar códigos das pulseiras quando os participantes forem carregados
    React.useEffect(() => {
        if (participants.length > 0) {
            fetchParticipantWristbandCodes(participants)
        }
    }, [participants, fetchParticipantWristbandCodes])

    useEffect(() => {
        const decoded = decodeToken(token)
        if (!decoded) {
            setError("Token inválido")
            setLoading(false)
            return
        }

        if (!isTokenValid(decoded.timestamp)) {
            setError("Link expirado. Solicite um novo link de acesso.")
            setLoading(false)
            return
        }

        fetchEmpresaData(decoded.empresaId, decoded.eventId)
    }, [token])

    // Função para formatar data (corrigida para evitar problemas de timezone)
    const formatDate = (dateString: string) => {
        if (!dateString) return ''

        try {
            // Se já está no formato brasileiro, retornar
            if (dateString.includes('/')) {
                return dateString
            }

            // Para datas ISO (YYYY-MM-DD), usar UTC para evitar timezone
            const date = new Date(dateString + 'T12:00:00.000Z')
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'UTC'
            })
        } catch (error) {
            console.warn('Erro ao formatar data:', dateString, error)
            return dateString
        }
    }

    // Função para gerar dias do evento usando nova estrutura
    const getEventDays = React.useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }> => {
        if (!event) return [];

        const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }> = [];

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
                        // Garantir formato ISO correto e evitar problemas de timezone
                        let dateISO = item.date
                        if (typeof item.date === 'string' && !item.date.includes('T')) {
                            dateISO = item.date // Já deve estar no formato YYYY-MM-DD
                        } else {
                            dateISO = new Date(item.date + 'T12:00:00.000Z').toISOString().split('T')[0]
                        }
                        const formattedDate = formatDate(dateISO);

                        // Usar período do item se disponível, senão calcular baseado na hora
                        let period: 'diurno' | 'noturno' | 'dia_inteiro';
                        if (item.period && (item.period === 'diurno' || item.period === 'noturno' || item.period === 'dia_inteiro')) {
                            period = item.period;
                        } else {
                            // Fallback: calcular baseado na hora (usando UTC para evitar timezone)
                            const dateObj = new Date(item.date + (item.date.includes('T') ? '' : 'T12:00:00.000Z'));
                            const hour = dateObj.getUTCHours();
                            period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                        }

                        const periodLabel = period === 'diurno' ? 'Diurno' :
                            period === 'noturno' ? 'Noturno' :
                                period === 'dia_inteiro' ? 'Dia Inteiro' : 'Diurno';

                        days.push({
                            id: `${dateISO}-${stage}-${period}`, // ID único incluindo o turno
                            label: `${formattedDate} (${stageName} - ${periodLabel})`,
                            date: formattedDate,
                            type: stage,
                            period: period
                        });
                    }
                });
            } catch (error) {
                console.warn(`Erro ao processar dados do evento para stage ${stage}:`, error);
            }
        };

        // Processar nova estrutura do evento
        if (event.montagem) processEventArray(event.montagem, 'montagem', 'MONTAGEM');
        if (event.evento) processEventArray(event.evento, 'evento', 'EVENTO');
        if (event.desmontagem) processEventArray(event.desmontagem, 'desmontagem', 'DESMONTAGEM');

        // Fallback para estrutura antiga (manter compatibilidade) - corrigido timezone
        if (event.setupStartDate && event.setupEndDate && (!event.montagem || (Array.isArray(event.montagem) && event.montagem.length === 0))) {
            const startDate = new Date(event.setupStartDate + 'T12:00:00.000Z');
            const endDate = new Date(event.setupEndDate + 'T12:00:00.000Z');
            for (let date = new Date(startDate); date <= endDate; date.setUTCDate(date.getUTCDate() + 1)) {
                const dateISO = date.toISOString().split('T')[0];
                const dateStr = formatDate(dateISO);

                days.push({
                    id: `${dateISO}-montagem-diurno`,
                    label: `${dateStr} (MONTAGEM - Diurno)`,
                    date: dateStr,
                    type: 'montagem',
                    period: 'diurno'
                });
            }
        }

        if (event.preparationStartDate && event.preparationEndDate && (!event.evento || (Array.isArray(event.evento) && event.evento.length === 0))) {
            const startDate = new Date(event.preparationStartDate + 'T12:00:00.000Z');
            const endDate = new Date(event.preparationEndDate + 'T12:00:00.000Z');
            for (let date = new Date(startDate); date <= endDate; date.setUTCDate(date.getUTCDate() + 1)) {
                const dateISO = date.toISOString().split('T')[0];
                const dateStr = formatDate(dateISO);

                days.push({
                    id: `${dateISO}-evento-diurno`,
                    label: `${dateStr} (EVENTO - Diurno)`,
                    date: dateStr,
                    type: 'evento',
                    period: 'diurno'
                });
            }
        }

        if (event.finalizationStartDate && event.finalizationEndDate && (!event.desmontagem || (Array.isArray(event.desmontagem) && event.desmontagem.length === 0))) {
            const startDate = new Date(event.finalizationStartDate + 'T12:00:00.000Z');
            const endDate = new Date(event.finalizationEndDate + 'T12:00:00.000Z');
            for (let date = new Date(startDate); date <= endDate; date.setUTCDate(date.getUTCDate() + 1)) {
                const dateISO = date.toISOString().split('T')[0];
                const dateStr = formatDate(dateISO);

                days.push({
                    id: `${dateISO}-desmontagem-diurno`,
                    label: `${dateStr} (DESMONTAGEM - Diurno)`,
                    date: dateStr,
                    type: 'desmontagem',
                    period: 'diurno'
                });
            }
        }

        // Ordenar dias cronologicamente (corrigido timezone)
        days.sort((a, b) => {
            // Converter data brasileira (DD/MM/YYYY) para formato ISO (YYYY-MM-DD) para comparação
            const dateA = new Date(a.date.split('/').reverse().join('-') + 'T12:00:00.000Z');
            const dateB = new Date(b.date.split('/').reverse().join('-') + 'T12:00:00.000Z');
            return dateA.getTime() - dateB.getTime();
        });

        return days;
    }, [event]);

    // Função para obter ícone do período
    const getPeriodIcon = React.useCallback((period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
        if (period === 'diurno') {
            return <Sun className="h-4 w-4 text-yellow-500" />;
        } else if (period === 'noturno') {
            return <Moon className="h-4 w-4 text-blue-500" />;
        } else if (period === 'dia_inteiro') {
            return (
                <div className="flex items-center gap-1">
                    <Sun className="h-3 w-3 text-yellow-500" />
                    <Moon className="h-3 w-3 text-blue-500" />
                </div>
            );
        }
        return null;
    }, []);

    // Auto-selecionar primeiro turno se não houver seleção
    const eventDays = getEventDays();
    React.useEffect(() => {
        if (!selectedDay && eventDays.length > 0) {
            setSelectedDay(eventDays[0].id);
        }
    }, [selectedDay, eventDays]);

    // Função para obter período do dia
    const getDayPeriod = (day: string) => {
        if (!event) return ''

        const date = new Date(day)
        const setupStart = event.setupStartDate ? new Date(event.setupStartDate) : null
        const setupEnd = event.setupEndDate ? new Date(event.setupEndDate) : null
        const prepStart = event.preparationStartDate ? new Date(event.preparationStartDate) : null
        const prepEnd = event.preparationEndDate ? new Date(event.preparationEndDate) : null
        const finalStart = event.finalizationStartDate ? new Date(event.finalizationStartDate) : null
        const finalEnd = event.finalizationEndDate ? new Date(event.finalizationEndDate) : null

        if (setupStart && setupEnd && date >= setupStart && date <= setupEnd) {
            return 'Montagem'
        } else if (prepStart && prepEnd && date >= prepStart && date <= prepEnd) {
            return 'Evento'
        } else if (finalStart && finalEnd && date >= finalStart && date <= finalEnd) {
            return 'Desmontagem'
        }

        return 'Evento'
    }

    // Função para formatar status da importação
    const getImportStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
            case 'approved':
                return { label: 'Aprovada', color: 'bg-green-100 text-green-800 border-green-200' }
            case 'rejected':
                return { label: 'Rejeitada', color: 'bg-red-100 text-red-800 border-red-200' }
            case 'completed':
                return { label: 'Concluída', color: 'bg-blue-100 text-blue-800 border-blue-200' }
            default:
                return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800 border-gray-200' }
        }
    }

    // Função para converter data ISO para formato brasileiro (corrigida timezone)
    const convertIsoToBrazilian = (isoDate: string) => {
        if (!isoDate) return ''
        try {
            // Usar UTC para evitar problemas de timezone
            const date = new Date(isoDate + (isoDate.includes('T') ? '' : 'T12:00:00.000Z'))
            return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        } catch {
            return isoDate
        }
    }



    // Obter valores únicos para filtros
    const uniqueValues = React.useMemo(() => {
        return {
            funcoes: [...new Set(participantsByDay.map(p => p.role).filter(Boolean))].sort()
        }
    }, [participantsByDay])

    // Função para formatar CPF
    const formatCPF = (cpf: string) => {
        if (!cpf) return ''
        const digits = cpf.replace(/\D/g, '')
        if (digits.length !== 11) return cpf
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }

    // Função para ordenar coluna
    const handleSort = (campo: string) => {
        setOrdenacao(prev => ({
            campo,
            direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
        }))
    }

    // Função para iniciar edição de campo
    const startEditing = (participantId: string, field: string, currentValue: string) => {
        if (!isClerkUser) return
        setEditingParticipant(participantId)
        setEditingField(field)
        setEditValue(currentValue || "")
    }

    // Função para salvar edição
    const saveEdit = async (participantId: string, field: string) => {
        if (!isClerkUser || !editValue.trim()) return

        setSaving(true)
        try {
            const participant = participants.find(p => p.id === participantId)
            if (!participant) return

            const updatedData = {
                ...participant,
                [field]: editValue.trim()
            }

            const updated = await updateEventParticipant(participantId, updatedData)
            if (updated) {
                setParticipants(prev =>
                    prev.map(p => p.id === participantId ? updated : p)
                )
                toast.success("Informação atualizada com sucesso!")
            }
        } catch (error) {
            console.error("Erro ao atualizar participante:", error)
            toast.error("Erro ao atualizar informação")
        } finally {
            setSaving(false)
            setEditingParticipant(null)
            setEditingField(null)
            setEditValue("")
        }
    }

    // Função para cancelar edição
    const cancelEdit = () => {
        setEditingParticipant(null)
        setEditingField(null)
        setEditValue("")
    }

    // Função para iniciar edição de campo da empresa
    const startEditingEmpresa = (field: string, currentValue: string) => {
        if (!isClerkUser) return
        setEditingEmpresa(field)
        setEmpresaEditValue(currentValue || "")
    }

    // Função para salvar edição da empresa
    const saveEmpresaEdit = async (field: string) => {
        if (!isClerkUser || !empresa) return

        setSaving(true)
        try {
            const updatedData = {
                ...empresa,
                [field]: empresaEditValue.trim()
            }

            const response = await apiClient.put(`/empresas/${empresa.id}`, updatedData)
            if (response.data) {
                setEmpresa(response.data)
                toast.success("Informação da empresa atualizada com sucesso!")
            }
        } catch (error) {
            console.error("Erro ao atualizar empresa:", error)
            toast.error("Erro ao atualizar informação da empresa")
        } finally {
            setSaving(false)
            setEditingEmpresa(null)
            setEmpresaEditValue("")
        }
    }

    // Função para cancelar edição da empresa
    const cancelEmpresaEdit = () => {
        setEditingEmpresa(null)
        setEmpresaEditValue("")
    }

    // Função para renderizar campo editável da empresa
    const renderEditableEmpresaField = (field: string, label: string, icon: React.ReactNode, value: string) => {
        const isEditing = editingEmpresa === field

        if (!isEditing) {
            return (
                <div
                    className={`flex items-center space-x-3 ${isClerkUser ? 'cursor-pointer hover:bg-gray-100 p-2 rounded' : ''}`}
                    onClick={() => isClerkUser && startEditingEmpresa(field, value)}
                >
                    {icon}
                    <span className="text-sm text-gray-700">
                        {value || "Não informado"}
                    </span>
                    {isClerkUser && (
                        <span className="text-xs text-blue-500">(editar)</span>
                    )}
                </div>
            )
        }

        return (
            <div className="flex items-center space-x-3">
                {icon}
                <input
                    type="text"
                    value={empresaEditValue}
                    onChange={(e) => setEmpresaEditValue(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Digite ${label.toUpperCase()}`}
                    autoFocus
                />
                <button
                    onClick={() => saveEmpresaEdit(field)}
                    disabled={saving}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                >
                    {saving ? "Salvando..." : "✓"}
                </button>
                <button
                    onClick={cancelEmpresaEdit}
                    className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                >
                    ✕
                </button>
            </div>
        )
    }

    // Função para renderizar campo editável
    const renderEditableField = (participant: EventParticipant, field: string, label: string, icon: React.ReactNode) => {
        const value = participant[field as keyof EventParticipant] as string || ""
        const isEditing = editingParticipant === participant.id && editingField === field

        if (!isEditing) {
            return (
                <div
                    className={`flex items-center space-x-2 ${isClerkUser && !value ? 'cursor-pointer hover:bg-gray-100 p-1 rounded' : ''}`}
                    onClick={() => isClerkUser && !value && startEditing(participant.id, field, value)}
                >
                    {icon}
                    <span className="text-sm text-gray-600">
                        {value || (isClerkUser ? "Clique para adicionar" : "Não informado")}
                    </span>
                    {isClerkUser && !value && (
                        <span className="text-xs text-blue-500">(editar)</span>
                    )}
                </div>
            )
        }

        return (
            <div className="flex items-center space-x-2">
                {icon}
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Digite ${label.toUpperCase()}`}
                    autoFocus
                />
                <button
                    onClick={() => saveEdit(participant.id, field)}
                    disabled={saving}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                >
                    {saving ? "Salvando..." : "✓"}
                </button>
                <button
                    onClick={cancelEdit}
                    className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                >
                    ✕
                </button>
            </div>
        )
    }

    // Funções de importação
    const downloadTemplate = () => {
        const templateData = [
            {
                nome: "João Silva",
                cpf: "12345678900",
                funcao: "Desenvolvedor",
                empresa: "Empresa ABC",
                credencial: "CREDENCIAL-001",
            }
        ]

        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, `modelo-colaboradores-${empresa?.nome || 'empresa'}-${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    const validateImportData = (data: Record<string, unknown>): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []

        if (!data.nome || data.nome.toString().trim().length < 2) {
            errors.push("Nome é obrigatório e deve ter pelo menos 2 caracteres")
        }

        if (!data.cpf || data.cpf.toString().trim() === "") {
            errors.push("CPF é obrigatório")
        }

        if (!data.funcao || data.funcao.toString().trim().length < 2) {
            errors.push("Função é obrigatória e deve ter pelo menos 2 caracteres")
        }

        if (!data.empresa || data.empresa.toString().trim().length < 2) {
            errors.push("Empresa é obrigatória e deve ter pelo menos 2 caracteres")
        }

        if (!data.credencial || data.credencial.toString().trim() === "") {
            errors.push("Credencial é obrigatória")
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    }

    const processExcelFile = async (file: File): Promise<ProcessedImportData> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: "array" })
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

                    const result: ProcessedImportData = {
                        fileName: file.name,
                        totalRows: jsonData.length,
                        validRows: 0,
                        invalidRows: 0,
                        data: [],
                        errors: [],
                    }

                    jsonData.forEach((row, index) => {
                        const rowNumber = index + 2
                        const validation = validateImportData(row)

                        if (!validation.isValid) {
                            result.errors.push({
                                item: row,
                                error: validation.errors.join(", "),
                                row: rowNumber,
                            })
                            result.invalidRows++
                            return
                        }

                        const importData: ImportData = {
                            nome: String(row.nome || '').trim(),
                            cpf: String(row.cpf || '').trim(),
                            funcao: String(row.funcao || '').trim(),
                            empresa: String(row.empresa || '').trim(),
                            credencial: String(row.credencial || '').trim(),
                        }

                        result.data.push(importData)
                        result.validRows++
                    })

                    resolve(result)
                } catch (error) {
                    reject(new Error("Erro ao processar arquivo Excel"))
                }
            }
            reader.onerror = () => reject(new Error("Erro ao ler arquivo"))
            reader.readAsArrayBuffer(file)
        })
    }

    const handleFileUpload = async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)")
            return
        }

        setIsProcessing(true)
        try {
            const processed = await processExcelFile(file)
            setProcessedData(processed)
            setUploadedFile(file)
            toast.success("Arquivo processado com sucesso!")
        } catch (error) {
            toast.error("Erro ao processar arquivo")
            console.error(error)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleSubmitImport = async () => {
        if (!processedData || !empresa || !event) return

        setIsSubmitting(true)
        try {
            const decoded = decodeToken(token)
            if (!decoded) {
                toast.error("Token inválido")
                return
            }

            const importRequestData = {
                eventId: decoded.eventId,
                empresaId: decoded.empresaId,
                fileName: processedData.fileName,
                totalRows: processedData.totalRows,
                validRows: processedData.validRows,
                invalidRows: processedData.invalidRows,
                duplicateRows: 0,
                data: processedData.data,
                errors: processedData.errors,
                duplicates: [],
                missingCredentials: [],
                missingCompanies: [],
                requestedBy: empresa.nome || "Empresa"
            }

            const response = await apiClient.post('/import-requests', importRequestData)

            if (response.data) {
                toast.success("Solicitação de importação enviada com sucesso! Aguarde a aprovação do administrador.")
                setProcessedData(null)
                setUploadedFile(null)
            }
        } catch (error) {
            console.error("Erro ao enviar solicitação:", error)
            toast.error("Erro ao enviar solicitação de importação")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleFileUpload(e.dataTransfer.files[0])
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dados da empresa...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Button
                        onClick={() => window.close()}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Fechar
                    </Button>
                </div>
            </div>
        )
    }

    if (!empresa || !event) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Empresa não encontrada</h1>
                    <p className="text-gray-600">A empresa solicitada não foi encontrada.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                <Building className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{empresa.nome}</h1>
                                <p className="text-gray-600">{event.name}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Acesso Público</p>
                            <p className="text-xs text-gray-400">
                                Expira em {formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                            </p>
                            {isClerkUser && (
                                <div className="mt-2">
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                        Modo Edição Ativo
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Informações da Empresa */}
                    <div className="lg:col-span-1">
                        <Card className="h-fit">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Building className="h-5 w-5" />
                                    <span>Informações da Empresa</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {renderEditableEmpresaField('cnpj', 'CNPJ', <Badge variant="outline" className="text-xs">CNPJ</Badge>, empresa.cnpj || "")}

                                {renderEditableEmpresaField('email', 'Email', <Mail className="h-4 w-4 text-gray-400" />, empresa.email || "")}

                                {renderEditableEmpresaField('telefone', 'Telefone', <Phone className="h-4 w-4 text-gray-400" />, empresa.telefone || "")}

                                {renderEditableEmpresaField('endereco', 'Endereço', <MapPin className="h-4 w-4 text-gray-400" />, empresa.endereco || "")}

                                <div className="flex items-start space-x-3">
                                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                    <div className="text-sm text-gray-700">
                                        <p>{empresa.cidade && empresa.estado ? `${empresa.cidade} - ${empresa.estado}` : "Cidade/Estado: Não informado"}</p>
                                        <p>{empresa.cep ? `CEP: ${empresa.cep}` : "CEP: Não informado"}</p>
                                    </div>
                                </div>

                                {renderEditableEmpresaField('responsavel', 'Responsável', <User className="h-4 w-4 text-gray-400" />, empresa.responsavel || "")}

                                <div className="pt-4 border-t">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Observações</h4>
                                    {renderEditableEmpresaField('observacoes', 'Observações', <span className="text-sm text-gray-600">•</span>, empresa.observacoes || "")}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Turnos de Trabalho */}
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Calendar className="h-5 w-5" />
                                    <span>Turnos de Trabalho</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {eventDays.length > 0 ? (
                                        eventDays.map((day) => (
                                            <div
                                                key={day.id}
                                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedDay === day.id
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-200 hover:border-purple-300'
                                                    }`}
                                                onClick={() => setSelectedDay(day.id)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {day.date}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="secondary"
                                                                className={`text-xs ${day.type === 'montagem' ? 'bg-orange-100 text-orange-800' :
                                                                    day.type === 'evento' ? 'bg-blue-100 text-blue-800' :
                                                                        day.type === 'desmontagem' ? 'bg-red-100 text-red-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                    }`}
                                                            >
                                                                {day.type.toUpperCase()}
                                                            </Badge>
                                                            <div className="flex items-center gap-1">
                                                                {getPeriodIcon(day.period)}
                                                                <span className="text-xs text-gray-600">
                                                                    {day.period === 'diurno' ? 'Diurno' :
                                                                        day.period === 'noturno' ? 'Noturno' :
                                                                            day.period === 'dia_inteiro' ? 'Dia Inteiro' : 'Diurno'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">Nenhum turno configurado</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>


                    </div>

                    {/* Área Principal com Abas */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="colaboradores" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 gap-8">
                                <TabsTrigger value="colaboradores" className="flex items-center justify-center space-x-2 p-4 data-[state=active]:bg-[#610e5c] data-[state=active]:text-white rounded-md">
                                    <Users className="h-4 w-4" />
                                    <span>Colaboradores</span>
                                </TabsTrigger>
                                <TabsTrigger value="importar" className="flex items-center justify-center space-x-2 p-4 data-[state=active]:bg-[#610e5c] data-[state=active]:text-white rounded-md">
                                    <Upload className="h-4 w-4" />
                                    <span>Importar</span>
                                </TabsTrigger>
                                <TabsTrigger value="historico" className="flex items-center justify-center space-x-2 p-4 data-[state=active]:bg-[#610e5c] data-[state=active]:text-white rounded-md">
                                    <FileText className="h-4 w-4" />
                                    <span>Histórico</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* Aba Colaboradores */}
                            <TabsContent value="colaboradores" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <Users className="h-5 w-5" />
                                            <span>Colaboradores</span>
                                            {selectedDay && shiftInfo && (
                                                <Badge variant="outline" className="ml-2">
                                                    {shiftInfo.dateFormatted} - {shiftInfo.stage.toUpperCase()} - {shiftInfo.period === 'diurno' ? 'Diurno' : shiftInfo.period === 'noturno' ? 'Noturno' : shiftInfo.period === 'dia_inteiro' ? 'Dia Inteiro' : 'Diurno'}
                                                </Badge>
                                            )}
                                            {isClerkUser && (
                                                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-600 border-blue-200">
                                                    Edição Ativa
                                                </Badge>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedDay ? (
                                            participantsByDay.length > 0 ? (
                                                <div className="space-y-6">
                                                    {/* Filtros e Busca */}
                                                    <div className="space-y-4">
                                                        {/* Linha de busca */}
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                            <Input
                                                                type="text"
                                                                placeholder="Buscar por nome ou CPF..."
                                                                value={searchTerm}
                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                className="pl-10"
                                                            />
                                                        </div>

                                                        {/* Linha de filtros */}
                                                        <div className="flex flex-wrap gap-4">
                                                            <div className="flex items-center space-x-2">
                                                                <Filter className="h-4 w-4 text-gray-500" />
                                                                <span className="text-sm font-medium text-gray-700">Filtros:</span>
                                                            </div>

                                                            <Select value={filtros.funcao || "all"} onValueChange={(value) => setFiltros(prev => ({ ...prev, funcao: value === "all" ? "" : value }))}>
                                                                <SelectTrigger className="w-48">
                                                                    <SelectValue placeholder="Todas as funções" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="all">Todas as funções</SelectItem>
                                                                    {uniqueValues.funcoes.filter(funcao => funcao && funcao.trim()).map((funcao) => (
                                                                        <SelectItem key={funcao} value={funcao || ""}>{funcao}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            <Select value={filtros.status} onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}>
                                                                <SelectTrigger className="w-48">
                                                                    <SelectValue placeholder="Status de presença" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="all">Todos os status</SelectItem>
                                                                    <SelectItem value="present">Presentes</SelectItem>
                                                                    <SelectItem value="absent">Pendentes</SelectItem>
                                                                </SelectContent>
                                                            </Select>

                                                            {(searchTerm || filtros.funcao || filtros.status !== 'all') && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSearchTerm('')
                                                                        setFiltros({ empresa: '', funcao: '', status: 'all' })
                                                                    }}
                                                                >
                                                                    <X className="h-4 w-4 mr-2" />
                                                                    Limpar filtros
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Estatísticas Gerais */}
                                                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2 text-blue-900">
                                                                <Users className="h-5 w-5" />
                                                                <span>Estatísticas Gerais da Empresa</span>
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                                                    <div className="text-2xl font-bold text-gray-900">{participants.length}</div>
                                                                    <div className="text-sm text-gray-600">Total de Colaboradores</div>
                                                                </div>
                                                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                                                    <div className="text-2xl font-bold text-blue-600">
                                                                        {eventDays.length}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600">Turnos de Trabalho</div>
                                                                </div>
                                                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                                                    <div className="text-2xl font-bold text-green-600">
                                                                        {uniqueValues.funcoes.length}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600">Funções Diferentes</div>
                                                                </div>
                                                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                                                    <div className="text-2xl font-bold text-purple-600">
                                                                        {credentials.length}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600">Credenciais Disponíveis</div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>

                                                    {/* Botões para Expandir Tabela e Exportar */}
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-lg font-semibold text-gray-900">Lista de Colaboradores</h3>
                                                        <div className="flex gap-2">
                                                            {/* Botões de Exportação */}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleExportPDFClick}
                                                                disabled={exportPDFMutation.isPending || filteredAndSortedParticipants.length === 0}
                                                                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                            >
                                                                {exportPDFMutation.isPending ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <FileText className="h-4 w-4" />
                                                                )}
                                                                Exportar PDF
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={exportXLSX}
                                                                disabled={exportXLSXMutation.isPending || filteredAndSortedParticipants.length === 0}
                                                                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                                            >
                                                                {exportXLSXMutation.isPending ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <FileSpreadsheet className="h-4 w-4" />
                                                                )}
                                                                Exportar Excel
                                                            </Button>
                                                            {/* Botão Expandir Tabela */}
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setIsTableExpanded(!isTableExpanded)}
                                                                className="flex items-center gap-2"
                                                            >
                                                                {isTableExpanded ? (
                                                                    <>
                                                                        <ChevronDown className="h-4 w-4 rotate-180" />
                                                                        Recolher Tabela
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ChevronDown className="h-4 w-4" />
                                                                        Expandir Tabela
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Tabela */}
                                                    <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-gray-50">
                                                                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                                                                        <div className="flex items-center space-x-1">
                                                                            <span>Nome</span>
                                                                            {ordenacao.campo === 'name' && (
                                                                                <ChevronDown className={`h-4 w-4 ${ordenacao.direcao === 'desc' ? 'rotate-180' : ''}`} />
                                                                            )}
                                                                        </div>
                                                                    </TableHead>
                                                                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('cpf')}>
                                                                        <div className="flex items-center space-x-1">
                                                                            <span>CPF</span>
                                                                            {ordenacao.campo === 'cpf' && (
                                                                                <ChevronDown className={`h-4 w-4 ${ordenacao.direcao === 'desc' ? 'rotate-180' : ''}`} />
                                                                            )}
                                                                        </div>
                                                                    </TableHead>
                                                                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('role')}>
                                                                        <div className="flex items-center space-x-1">
                                                                            <span>Função</span>
                                                                            {ordenacao.campo === 'role' && (
                                                                                <ChevronDown className={`h-4 w-4 ${ordenacao.direcao === 'desc' ? 'rotate-180' : ''}`} />
                                                                            )}
                                                                        </div>
                                                                    </TableHead>
                                                                    <TableHead>Pulseira</TableHead>
                                                                    <TableHead className="text-center">Status</TableHead>
                                                                    <TableHead className="text-center">Check-in</TableHead>
                                                                    <TableHead className="text-center">Check-out</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {filteredAndSortedParticipants.length > 0 ? (
                                                                    filteredAndSortedParticipants.map((participant) => (
                                                                        <TableRow key={participant.id} className="hover:bg-gray-50">
                                                                            <TableCell className="font-medium">
                                                                                <div className="flex items-center space-x-3">
                                                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                                                                        <User className="h-4 w-4 text-white" />
                                                                                    </div>
                                                                                    <span>{participant.name}</span>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <span className="font-mono text-sm">
                                                                                    {formatCPF(participant.cpf || '')}
                                                                                </span>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Badge variant="secondary">
                                                                                    {participant.role || 'Colaborador'}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <div className="flex flex-col gap-1">
                                                                                    {/* Número da Pulseira */}
                                                                                    <div className="text-sm font-bold text-gray-900">
                                                                                        {(() => {
                                                                                            const wristbandCode = participantWristbandCodes.get(participant.id);
                                                                                            if (wristbandCode) return wristbandCode;
                                                                                            return `#${participant.id.slice(-4).toUpperCase()}`;
                                                                                        })()}
                                                                                    </div>
                                                                                    {/* Tipo da Credencial */}
                                                                                    <Badge variant="outline" className="font-mono text-xs w-fit">
                                                                                        {(() => {
                                                                                            const credential = credentials.find(c => c.id === participant.credentialId);
                                                                                            return credential ? credential.nome : 'N/A';
                                                                                        })()}
                                                                                    </Badge>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="px-4 py-2">
                                                                                {(() => {
                                                                                    const attendanceStatus = participantsAttendanceStatus.get(participant.id)
                                                                                    if (!attendanceStatus) {
                                                                                        return (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                                                                                <span className="text-sm font-medium text-gray-500">Não registrado</span>
                                                                                            </div>
                                                                                        )
                                                                                    }

                                                                                    const hasCheckIn = attendanceStatus.checkIn
                                                                                    const hasCheckOut = attendanceStatus.checkOut

                                                                                    if (hasCheckIn && hasCheckOut) {
                                                                                        return (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                                                                <span className="text-sm font-medium text-blue-700">Finalizado</span>
                                                                                            </div>
                                                                                        )
                                                                                    } else if (hasCheckIn) {
                                                                                        return (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                                                <span className="text-sm font-medium text-green-700">Presente</span>
                                                                                            </div>
                                                                                        )
                                                                                    } else {
                                                                                        return (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                                                                                <span className="text-sm font-medium text-orange-600">Pendente</span>
                                                                                            </div>
                                                                                        )
                                                                                    }
                                                                                })()}
                                                                            </TableCell>
                                                                            <TableCell className="px-4 py-2 text-sm text-gray-600">
                                                                                {(() => {
                                                                                    const attendanceStatus = participantsAttendanceStatus.get(participant.id)
                                                                                    if (!attendanceStatus?.checkIn) return '-'
                                                                                    return new Date(attendanceStatus.checkIn).toLocaleString('pt-BR', {
                                                                                        day: '2-digit',
                                                                                        month: '2-digit',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    })
                                                                                })()}
                                                                            </TableCell>
                                                                            <TableCell className="px-4 py-2 text-sm text-gray-600">
                                                                                {(() => {
                                                                                    const attendanceStatus = participantsAttendanceStatus.get(participant.id)
                                                                                    if (!attendanceStatus?.checkOut) return '-'
                                                                                    return new Date(attendanceStatus.checkOut).toLocaleString('pt-BR', {
                                                                                        day: '2-digit',
                                                                                        month: '2-digit',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    })
                                                                                })()}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))
                                                                ) : (
                                                                    <TableRow>
                                                                        <TableCell colSpan={7} className="text-center py-8">
                                                                            <div className="flex flex-col items-center space-y-2">
                                                                                <Users className="h-8 w-8 text-gray-400" />
                                                                                <p className="text-gray-500">Nenhum colaborador encontrado com os filtros aplicados</p>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>

                                                    {/* Informações adicionais */}
                                                    <div className="text-sm text-gray-600">
                                                        Exibindo {filteredAndSortedParticipants.length} de {participantsByDay.length} colaboradores
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                        Nenhum colaborador encontrado
                                                    </h3>
                                                    <p className="text-gray-600">
                                                        Não há colaboradores registrados para este dia.
                                                    </p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="text-center py-8">
                                                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    Selecione um dia
                                                </h3>
                                                <p className="text-gray-600">
                                                    Escolha um dia de trabalho para ver os colaboradores.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>


                            </TabsContent>

                            {/* Aba Importar */}
                            <TabsContent value="importar" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <FileSpreadsheet className="h-5 w-5" />
                                            <span>Importar Colaboradores</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Instruções */}
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-blue-900 mb-2">Instruções para Importação</h4>
                                            <div className="text-sm text-blue-800 space-y-1">
                                                <p><strong>Colunas obrigatórias:</strong> nome, cpf, funcao, empresa, credencial</p>
                                                <p><strong>Formato:</strong> Excel (.xlsx ou .xls)</p>
                                                <p><strong>Limite:</strong> até 1000 colaboradores por importação</p>
                                                <p><strong>Processo:</strong> A solicitação será enviada para aprovação do administrador</p>
                                            </div>
                                        </div>

                                        {/* Download do modelo */}
                                        <div className="flex justify-center">
                                            <Button onClick={downloadTemplate} variant="outline" className="bg-transparent">
                                                <Download className="h-4 w-4 mr-2" />
                                                Baixar Modelo
                                            </Button>
                                        </div>

                                        {/* Área de upload */}
                                        <div
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                                                }`}
                                        >
                                            <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                {uploadedFile ? "Arquivo carregado" : "Arraste e solte seu arquivo Excel aqui"}
                                            </h3>
                                            <p className="text-gray-600 mb-4">
                                                {uploadedFile ? uploadedFile.name : "Ou clique para selecionar um arquivo"}
                                            </p>
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                                className="hidden"
                                                id="file-upload"
                                            />
                                            <label
                                                htmlFor="file-upload"
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Processando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Selecionar Arquivo
                                                    </>
                                                )}
                                            </label>
                                        </div>

                                        {/* Resultado do processamento */}
                                        {processedData && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                                        <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                                                        <div className="text-2xl font-bold text-green-600">{processedData.validRows}</div>
                                                        <div className="text-sm text-gray-600">Válidos</div>
                                                    </div>
                                                    <div className="text-center p-4 bg-red-50 rounded-lg">
                                                        <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                                                        <div className="text-2xl font-bold text-red-600">{processedData.invalidRows}</div>
                                                        <div className="text-sm text-gray-600">Inválidos</div>
                                                    </div>
                                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                        <FileText className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                                                        <div className="text-2xl font-bold text-blue-600">{processedData.totalRows}</div>
                                                        <div className="text-sm text-gray-600">Total</div>
                                                    </div>
                                                </div>

                                                {/* Erros detalhados */}
                                                {processedData.errors.length > 0 && (
                                                    <div className="bg-red-50 p-4 rounded-lg">
                                                        <h4 className="font-medium text-red-900 mb-2">Erros encontrados:</h4>
                                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                                            {processedData.errors.map((error, index) => (
                                                                <div key={index} className="text-sm text-red-800">
                                                                    <strong>Linha {error.row}:</strong> {error.error}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Botão de envio */}
                                                <div className="flex justify-center">
                                                    <Button
                                                        onClick={handleSubmitImport}
                                                        disabled={isSubmitting || processedData.validRows === 0}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        {isSubmitting ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Enviando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4 mr-2" />
                                                                Enviar Solicitação ({processedData.validRows} colaboradores)
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Aba Histórico */}
                            <TabsContent value="historico" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <FileText className="h-5 w-5" />
                                            <span>Histórico de Importações</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {loadingHistory ? (
                                            <div className="text-center py-8">
                                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                                                <p className="text-gray-600">Carregando histórico...</p>
                                            </div>
                                        ) : importHistory && importHistory.length > 0 ? (
                                            <div className="space-y-4">
                                                {importHistory.map((importReq) => {
                                                    const statusInfo = getImportStatusInfo(importReq.status)
                                                    return (
                                                        <div key={importReq.id} className="border rounded-lg p-4 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-2">
                                                                    <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                                                                    <span className="font-medium text-sm">{importReq.fileName}</span>
                                                                </div>
                                                                <Badge className={`text-xs ${statusInfo.color}`}>
                                                                    {statusInfo.label}
                                                                </Badge>
                                                            </div>

                                                            {/* Informações do evento */}
                                                            {importReq.event && (
                                                                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                                    <span className="font-medium">Evento:</span> {importReq.event.name || 'N/A'}
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                                                                <div>
                                                                    <span className="font-medium">Total:</span> {importReq.totalRows ?? 'N/A'}
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium">Válidos:</span> {importReq.validRows ?? 'N/A'}
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium">Inválidos:</span> {importReq.invalidRows ?? 'N/A'}
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium">Duplicados:</span> {importReq.duplicateRows ?? 'N/A'}
                                                                </div>
                                                            </div>



                                                            <div className="text-xs text-gray-500">
                                                                <div>Solicitado em: {formatDate(importReq.createdAt)}</div>
                                                                {importReq.approvedAt && (
                                                                    <div>Processado em: {formatDate(importReq.approvedAt)}</div>
                                                                )}
                                                                {importReq.approvedBy && (
                                                                    <div>Aprovado por: {importReq.approvedBy}</div>
                                                                )}
                                                            </div>

                                                            {/* Dados da importação (expandível) */}
                                                            {importReq.data && Array.isArray(importReq.data) && importReq.data.length > 0 && (
                                                                <details className="text-xs">
                                                                    <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                                                                        Ver dados importados ({importReq.data.length} colaboradores)
                                                                    </summary>
                                                                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                                                        {importReq.data.slice(0, 5).map((item: ImportRequestData, index: number) => (
                                                                            <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                                                                                <div><strong>Nome:</strong> {item.nome || 'N/A'}</div>
                                                                                <div><strong>CPF:</strong> {item.cpf || 'N/A'}</div>
                                                                                <div><strong>Função:</strong> {item.funcao || 'N/A'}</div>
                                                                                <div><strong>Credencial:</strong> {item.credencial || 'N/A'}</div>
                                                                            </div>
                                                                        ))}
                                                                        {importReq.data.length > 5 && (
                                                                            <div className="text-gray-500 italic">
                                                                                ... e mais {importReq.data.length - 5} colaboradores
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </details>
                                                            )}

                                                            {importReq.status === 'rejected' && importReq.notes && (
                                                                <div className="bg-red-50 p-3 rounded text-xs text-red-800">
                                                                    <strong>Motivo da rejeição:</strong> {importReq.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    Nenhuma importação encontrada
                                                </h3>
                                                <p className="text-gray-600">
                                                    Ainda não foram realizadas solicitações de importação.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Modal de Tabela em Tela Cheia */}
            {isTableExpanded && (
                <div className="fixed inset-0 z-50 bg-white">
                    <div className="h-full flex flex-col">
                        {/* Header do Modal */}
                        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                    <Building className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">{empresa?.nome} - Colaboradores</h1>
                                    <p className="text-gray-600 text-sm">
                                        {selectedDay && shiftInfo ? `${shiftInfo.dateFormatted} - ${shiftInfo.stage.toUpperCase()} - ${shiftInfo.period === 'diurno' ? 'Diurno' : shiftInfo.period === 'noturno' ? 'Noturno' : shiftInfo.period === 'dia_inteiro' ? 'Dia Inteiro' : 'Diurno'}` : 'Todos os colaboradores'}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setIsTableExpanded(false)}
                                className="flex items-center gap-2"
                            >
                                <X className="h-4 w-4" />
                                Fechar
                            </Button>
                        </div>

                        {/* Filtros no Modal */}
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                            <div className="max-w-7xl mx-auto space-y-4">
                                {/* Linha de busca */}
                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar por nome ou CPF..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                {/* Linha de filtros */}
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Filter className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm font-medium text-gray-700">Filtros:</span>
                                    </div>

                                    <Select value={filtros.funcao || "all"} onValueChange={(value) => setFiltros(prev => ({ ...prev, funcao: value === "all" ? "" : value }))}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Todas as funções" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as funções</SelectItem>
                                            {uniqueValues.funcoes.filter(funcao => funcao && funcao.trim()).map((funcao) => (
                                                <SelectItem key={funcao} value={funcao || ""}>{funcao}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={filtros.status} onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Status de presença" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os status</SelectItem>
                                            <SelectItem value="present">Presentes</SelectItem>
                                            <SelectItem value="absent">Pendentes</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {(searchTerm || filtros.funcao || filtros.status !== 'all') && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSearchTerm('')
                                                setFiltros({ empresa: '', funcao: '', status: 'all' })
                                            }}
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Limpar filtros
                                        </Button>
                                    )}

                                    <div className="ml-auto text-sm text-gray-600">
                                        Exibindo {filteredAndSortedParticipants.length} de {participantsByDay.length} colaboradores
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo Principal - Tabela */}
                        <div className="flex-1 overflow-auto p-4">
                            <div className="max-w-7xl mx-auto">
                                {/* Botões de exportação no modal */}
                                <div className="mb-4 flex gap-2 justify-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExportPDFClick}
                                        disabled={exportPDFMutation.isPending || filteredAndSortedParticipants.length === 0}
                                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    >
                                        {exportPDFMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileText className="h-4 w-4" />
                                        )}
                                        Exportar PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={exportXLSX}
                                        disabled={exportXLSXMutation.isPending || filteredAndSortedParticipants.length === 0}
                                        className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                    >
                                        {exportXLSXMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="h-4 w-4" />
                                        )}
                                        Exportar Excel
                                    </Button>
                                </div>

                                <div className="border rounded-lg overflow-hidden bg-white">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50">
                                                <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                                                    <div className="flex items-center space-x-1">
                                                        <span>Nome</span>
                                                        {ordenacao.campo === 'name' && (
                                                            <ChevronDown className={`h-4 w-4 ${ordenacao.direcao === 'desc' ? 'rotate-180' : ''}`} />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('cpf')}>
                                                    <div className="flex items-center space-x-1">
                                                        <span>CPF</span>
                                                        {ordenacao.campo === 'cpf' && (
                                                            <ChevronDown className={`h-4 w-4 ${ordenacao.direcao === 'desc' ? 'rotate-180' : ''}`} />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('role')}>
                                                    <div className="flex items-center space-x-1">
                                                        <span>Função</span>
                                                        {ordenacao.campo === 'role' && (
                                                            <ChevronDown className={`h-4 w-4 ${ordenacao.direcao === 'desc' ? 'rotate-180' : ''}`} />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead>Pulseira</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                                <TableHead className="text-center">Check-in</TableHead>
                                                <TableHead className="text-center">Check-out</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAndSortedParticipants.length > 0 ? (
                                                filteredAndSortedParticipants.map((participant) => (
                                                    <TableRow key={participant.id} className="hover:bg-gray-50">
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                                                    <User className="h-4 w-4 text-white" />
                                                                </div>
                                                                <span>{participant.name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-mono text-sm">
                                                                {formatCPF(participant.cpf || '')}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">
                                                                {participant.role || 'Colaborador'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center space-x-2">
                                                                <Badge variant="outline" className="font-mono text-xs">
                                                                    {(() => {
                                                                        const credential = credentials.find(c => c.id === participant.credentialId);
                                                                        return credential ? credential.nome : 'N/A';
                                                                    })()}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-2">
                                                            {(() => {
                                                                const attendanceStatus = participantsAttendanceStatus.get(participant.id)
                                                                if (!attendanceStatus) {
                                                                    return (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                                                            <span className="text-sm font-medium text-gray-500">Não registrado</span>
                                                                        </div>
                                                                    )
                                                                }

                                                                const hasCheckIn = attendanceStatus.checkIn
                                                                const hasCheckOut = attendanceStatus.checkOut

                                                                if (hasCheckIn && hasCheckOut) {
                                                                    return (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                                            <span className="text-sm font-medium text-blue-700">Finalizado</span>
                                                                        </div>
                                                                    )
                                                                } else if (hasCheckIn) {
                                                                    return (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                            <span className="text-sm font-medium text-green-700">Presente</span>
                                                                        </div>
                                                                    )
                                                                } else {
                                                                    return (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                                                            <span className="text-sm font-medium text-orange-600">Pendente</span>
                                                                        </div>
                                                                    )
                                                                }
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-2 text-sm text-gray-600">
                                                            {(() => {
                                                                const attendanceStatus = participantsAttendanceStatus.get(participant.id)
                                                                if (!attendanceStatus?.checkIn) return '-'
                                                                return new Date(attendanceStatus.checkIn).toLocaleString('pt-BR', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-2 text-sm text-gray-600">
                                                            {(() => {
                                                                const attendanceStatus = participantsAttendanceStatus.get(participant.id)
                                                                if (!attendanceStatus?.checkOut) return '-'
                                                                return new Date(attendanceStatus.checkOut).toLocaleString('pt-BR', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })
                                                            })()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8">
                                                        <div className="flex flex-col items-center space-y-2">
                                                            <Users className="h-8 w-8 text-gray-400" />
                                                            <p className="text-gray-500">Nenhum colaborador encontrado com os filtros aplicados</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
} 