'use client'

import React, { useState, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCoordenadoresByEvent } from "@/features/eventos/api/query/use-coordenadores-by-event"
import { useEventVehiclesByEvent } from "@/features/eventos/api/query/use-event-vehicles-by-event"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, UserCog, Building, Download, FileText, Filter } from "lucide-react"
import { toast } from "sonner"
import EventLayout from "@/components/dashboard/dashboard-layout"
import type { EventParticipant } from "@/features/eventos/types"
import { useExportPDF } from "@/features/eventos/api/mutation/use-export-pdf"
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event"
import { useAllEventAttendance, AttendanceRecord } from "@/features/eventos/api/mutation/use-check-operations"
import { useMovementCredential } from "@/features/eventos/api/mutation/use-movement-credential"

interface RelatorioConfig {
    titulo: string
    tipo: "geral" | "filtroEmpresa" | "checkin" | "checkout" | "tempo" | "tipoCredencial" | "cadastradoPor"
    filtroDia: string
    filtroEmpresa: string
    filtroFuncao: string
    filtroStatus: string
    filtroTipoCredencial: string
}

// Interfaces para tipos específicos de dados do relatório
interface RelatorioParticipanteBase {
    nome: string
    cpf: string
    empresa: string
    funcao: string | undefined
}

interface RelatorioParticipanteCompleto extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
}

interface RelatorioParticipanteCheckin extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
}

interface RelatorioParticipanteCheckout extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
}

interface RelatorioParticipanteTempo extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
    tempoTotal: string
}

interface RelatorioParticipanteCredencial extends RelatorioParticipanteBase {
    tipoCredencial: string
}

interface RelatorioParticipanteCadastro extends RelatorioParticipanteBase {
    cadastradoPor: string
}

interface RelatorioHeaderEmpresa {
    isHeader: true
    nomeEmpresa: string
    totalParticipantes: number
    participantesComCheckIn: number
    headerText: string
}

type RelatorioDataItem =
    | RelatorioParticipanteCompleto
    | RelatorioParticipanteCheckin
    | RelatorioParticipanteCheckout
    | RelatorioParticipanteTempo
    | RelatorioParticipanteCredencial
    | RelatorioParticipanteCadastro
    | RelatorioHeaderEmpresa

export default function RelatoriosPage() {
    const params = useParams()
    const eventId = String(params.id)
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null


    // Hooks para buscar dados
    const { data: participantes = [], isLoading: participantesLoading } = useEventParticipantsByEvent({ eventId })
    const { data: coordenadores = [], isLoading: coordenadoresLoading } = useCoordenadoresByEvent({ eventId })
    const { data: vagas = [], isLoading: vagasLoading } = useEventVehiclesByEvent({ eventId })
    const { data: credenciais = [], isLoading: credenciaisLoading } = useCredentialsByEvent(eventId);
    const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAllEventAttendance(eventId);
    const { data: movementCredentials = [], isLoading: movementLoading } = useMovementCredential(eventId);

    // Hook para exportação
    const exportPDFMutation = useExportPDF()

    // Estados do relatório
    const [configRelatorio, setConfigRelatorio] = useState<RelatorioConfig>({
        titulo: "",
        tipo: "geral",
        filtroDia: "all",
        filtroEmpresa: "all_companies",
        filtroFuncao: "all_functions",
        filtroStatus: "",
        filtroTipoCredencial: "all_credentials"
    })

    const [selectedDay, setSelectedDay] = useState<string>("all")


    // Função para gerar dias do evento
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string }> => {
        if (!evento) return []

        const days: Array<{ id: string; label: string; date: string; type: string }> = []

        // Adicionar dia "Todos"
        days.push({ id: 'all', label: 'TODOS', date: '', type: 'all' })

        // Adicionar dias de montagem
        if (evento.setupStartDate && evento.setupEndDate) {
            const startDate = new Date(evento.setupStartDate)
            const endDate = new Date(evento.setupEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR')
                days.push({
                    id: dateStr,
                    label: `${dateStr} (MONTAGEM)`,
                    date: dateStr,
                    type: 'setup'
                })
            }
        }

        // Adicionar dias de Evento/evento
        if (evento.preparationStartDate && evento.preparationEndDate) {
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR')
                days.push({
                    id: dateStr,
                    label: `${dateStr} (EVENTO)`,
                    date: dateStr,
                    type: 'preparation'
                })
            }
        }

        // Adicionar dias de finalização
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            const startDate = new Date(evento.finalizationStartDate)
            const endDate = new Date(evento.finalizationEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR')
                days.push({
                    id: dateStr,
                    label: `${dateStr} (DESMONTAGEM)`,
                    date: dateStr,
                    type: 'finalization'
                })
            }
        }

        return days
    }, [evento])

    // Função para calcular tempo total de trabalho
    const calcularTempoTotal = useCallback((checkIn: string, checkOut: string): string => {
        try {
            const entrada = new Date(checkIn)
            const saida = new Date(checkOut)
            const diff = saida.getTime() - entrada.getTime()

            if (diff <= 0) return "00:00"

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        } catch {
            return "00:00"
        }
    }, [])

    // Função para obter código da credencial/pulseira
    const obterCodigoPulseira = useCallback((participantId?: string): string => {
        if (!participantId) return ""
        const credencial = movementCredentials.find(c => c.participant_id === participantId)
        return credencial?.code || ""
    }, [movementCredentials])

    // Função para obter tipo da pulseira (nome da credencial)
    const obterTipoPulseira = useCallback((credentialId?: string): string => {
        if (!credentialId) return ""
        const credencial = credenciais.find(c => c.id === credentialId)
        return credencial?.nome || ""
    }, [credenciais])

    // Função para sincronizar dados de participante com attendance
    const sincronizarAttendance = useCallback((participante: EventParticipant) => {
        // Buscar registros de attendance para este participante
        const participantAttendance = attendanceRecords.filter(
            record => record.participantId === participante.id
        )

        // Se não há registros de attendance, retornar dados do participante original
        if (participantAttendance.length === 0) {
            return {
                ...participante,
                checkIn: participante.checkIn || "",
                checkOut: participante.checkOut || ""
            }
        }

        // Pegar o registro mais recente ou combinar todos os check-ins/check-outs
        const latestCheckin = participantAttendance
            .filter(record => record.checkIn)
            .sort((a, b) => new Date(b.checkIn!).getTime() - new Date(a.checkIn!).getTime())[0]

        const latestCheckout = participantAttendance
            .filter(record => record.checkOut)
            .sort((a, b) => new Date(b.checkOut!).getTime() - new Date(a.checkOut!).getTime())[0]

        return {
            ...participante,
            checkIn: latestCheckin?.checkIn || participante.checkIn || "",
            checkOut: latestCheckout?.checkOut || participante.checkOut || ""
        }
    }, [attendanceRecords])

    // Função para filtrar participantes por dia com dados de attendance sincronizados
    const getParticipantesPorDia = useCallback((dia: string): EventParticipant[] => {
        let participantesFiltrados: EventParticipant[]

        if (dia === 'all') {
            participantesFiltrados = participantes
        } else {
            participantesFiltrados = participantes.filter((participant: EventParticipant) => {
                if (!participant.daysWork || participant.daysWork.length === 0) {
                    return false
                }
                return participant.daysWork.includes(dia)
            })
        }

        // Sincronizar com dados de attendance
        return participantesFiltrados.map(p => sincronizarAttendance(p))
    }, [participantes, sincronizarAttendance])

    // Dados filtrados por dia selecionado
    const participantesDoDia = getParticipantesPorDia(selectedDay)

    // Estatísticas
    const estatisticas = useMemo(() => {
        const totalParticipantes = participantesDoDia.length
        const participantesComCheckIn = participantesDoDia.filter(p => p.checkIn).length
        const participantesComCheckOut = participantesDoDia.filter(p => p.checkOut).length
        const participantesAtivos = participantesComCheckIn - participantesComCheckOut
        const participantesComPulseira = participantesDoDia.filter(p => p.credentialId).length

        return {
            totalParticipantes,
            participantesComCheckIn,
            participantesComCheckOut,
            participantesAtivos,
            participantesComPulseira,
            totalCoordenadores: coordenadores.length,
            totalVagas: vagas.length,
            vagasRetiradas: vagas.filter(v => v.retirada === "retirada").length,
            vagasPendentes: vagas.filter(v => v.retirada === "pendente").length
        }
    }, [participantesDoDia, coordenadores, vagas])

    // Função para obter a cor da tab baseada no tipo de dia
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

    // Função para gerar dados do relatório agrupados por empresa
    const gerarDadosRelatorio = useCallback((): RelatorioDataItem[] => {
        let participantesProcessados: Omit<RelatorioDataItem, 'isHeader'>[] = []

        switch (configRelatorio.tipo) {
            case "geral":
                // Relatório Geral: Lista todos staffs ordenados alfabeticamente
                participantesProcessados = participantesDoDia
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn || "",
                        checkOut: p.checkOut || ""
                    } as RelatorioParticipanteCompleto))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "filtroEmpresa":
                // Filtro por Empresa: Similar ao geral mas com filtro adicional
                participantesProcessados = participantesDoDia
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn || "",
                        checkOut: p.checkOut || ""
                    } as RelatorioParticipanteCompleto))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "checkin":
                // Quem fez Check-in (unificado com código da pulseira)
                participantesProcessados = participantesDoDia
                    .filter(p => p.checkIn)
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn!
                    } as RelatorioParticipanteCheckin))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "checkout":
                // Quem fez Check-out
                participantesProcessados = participantesDoDia
                    .filter(p => p.checkIn && p.checkOut)
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn!,
                        checkOut: p.checkOut!
                    } as RelatorioParticipanteCheckout))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "tempo":
                // Tempo de Serviço: Com tempo total de trabalho
                participantesProcessados = participantesDoDia
                    .filter(p => p.checkIn && p.checkOut)
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn!,
                        checkOut: p.checkOut!,
                        tempoTotal: calcularTempoTotal(p.checkIn!, p.checkOut!)
                    } as RelatorioParticipanteTempo))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "tipoCredencial":
                // Tipo de credencial
                participantesProcessados = participantesDoDia
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        tipoCredencial: p.credentialId || "Não informado"
                    } as RelatorioParticipanteCredencial))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "cadastradoPor":
                // Cadastrado por
                participantesProcessados = participantesDoDia
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        cadastradoPor: p.validatedBy || "Não informado"
                    } as RelatorioParticipanteCadastro))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break
        }

        // Aplicar filtros
        if (configRelatorio.filtroEmpresa && configRelatorio.filtroEmpresa !== "all_companies") {
            participantesProcessados = participantesProcessados.filter(d =>
                'empresa' in d && d.empresa === configRelatorio.filtroEmpresa
            )
        }

        if (configRelatorio.filtroFuncao && configRelatorio.filtroFuncao !== "all_functions") {
            participantesProcessados = participantesProcessados.filter(d =>
                'funcao' in d && d.funcao === configRelatorio.filtroFuncao
            )
        }

        if (configRelatorio.filtroTipoCredencial && configRelatorio.filtroTipoCredencial !== "all_credentials") {
            participantesProcessados = participantesProcessados.filter(d =>
                'tipoCredencial' in d && d.tipoCredencial === configRelatorio.filtroTipoCredencial
            )
        }

        // Agrupar por empresa com cabeçalhos
        const empresas = Array.from(new Set(
            participantesProcessados
                .filter((p): p is RelatorioParticipanteBase => 'empresa' in p)
                .map(p => p.empresa)
        )).sort()
        const dadosFinais: RelatorioDataItem[] = []

        empresas.forEach(nomeEmpresa => {
            const participantesDaEmpresa = participantesProcessados.filter(p =>
                'empresa' in p && p.empresa === nomeEmpresa
            )
            const totalParticipantes = participantesDaEmpresa.length
            const participantesComCheckIn = participantesDaEmpresa.filter(p =>
                'checkIn' in p && p.checkIn
            ).length

            // Adicionar cabeçalho da empresa
            dadosFinais.push({
                isHeader: true,
                nomeEmpresa,
                totalParticipantes,
                participantesComCheckIn,
                headerText: `${nomeEmpresa} (${participantesComCheckIn}/${totalParticipantes})`
            } as RelatorioHeaderEmpresa)

            // Adicionar participantes da empresa
            participantesDaEmpresa.forEach(participante => {
                dadosFinais.push(participante as RelatorioDataItem)
            })
        })

        return dadosFinais
    }, [configRelatorio, participantesDoDia, calcularTempoTotal, obterCodigoPulseira, obterTipoPulseira])

    // Função para exportar PDF
    const exportarPDF = useCallback(() => {
        if (!configRelatorio.titulo.trim()) {
            toast.error("Digite um título para o relatório")
            return
        }

        const dadosRelatorio = gerarDadosRelatorio()

        exportPDFMutation.mutate({
            titulo: configRelatorio.titulo,
            tipo: configRelatorio.tipo,
            dados: dadosRelatorio.filter(item => !('isHeader' in item && item.isHeader)) as unknown as Record<string, unknown>[],
            filtros: {
                dia: configRelatorio.filtroDia,
                empresa: configRelatorio.filtroEmpresa,
                funcao: configRelatorio.filtroFuncao,
                status: configRelatorio.filtroStatus,
                tipoCredencial: configRelatorio.filtroTipoCredencial
            }
        })

        // Resetar configuração após sucesso
        setConfigRelatorio({
            titulo: "",
            tipo: "geral",
            filtroDia: "all",
            filtroEmpresa: "all_companies",
            filtroFuncao: "all_functions",
            filtroStatus: "",
            filtroTipoCredencial: "all_credentials"
        })
    }, [configRelatorio, gerarDadosRelatorio, exportPDFMutation])

    const isLoading = participantesLoading || coordenadoresLoading || vagasLoading || credenciaisLoading || attendanceLoading


    if (!evento) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                </div>
            </div>
        )
    }
    const dadosRelatorio = gerarDadosRelatorio()

    return (
        <EventLayout eventId={eventId} eventName={evento.name}>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios</h1>
                    <p className="text-gray-600">Gerencie e exporte relatórios do evento</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Participantes</p>
                                    <p className="text-3xl font-bold">{estatisticas.totalParticipantes}</p>
                                </div>
                                <Users className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Check-in</p>
                                    <p className="text-3xl font-bold">{estatisticas.participantesComCheckIn}</p>
                                </div>
                                <Clock className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Coordenadores</p>
                                    <p className="text-3xl font-bold">{estatisticas.totalCoordenadores}</p>
                                </div>
                                <UserCog className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Com Pulseira</p>
                                    <p className="text-3xl font-bold">{estatisticas.participantesComPulseira}</p>
                                </div>
                                <Building className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs dos dias */}
                <div className="mb-8">
                    <div className="border-b border-gray-200 bg-white rounded-t-lg">
                        <nav className="-mb-px flex space-x-2 px-6 overflow-x-auto">
                            {getEventDays().map((day) => {
                                const participantesNoDia = getParticipantesPorDia(day.id).length
                                const isActive = selectedDay === day.id

                                return (
                                    <button
                                        key={day.id}
                                        onClick={() => setSelectedDay(day.id)}
                                        className={`border-b-2 py-3 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                                            ? getTabColor(day.type, true)
                                            : `border-transparent text-gray-500 ${getTabColor(day.type, false)}`
                                            }`}
                                    >
                                        {day.label} ({participantesNoDia})
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                {/* Configuração do Relatório */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Formulário de Configuração */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Configurar Relatório
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Título */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Título do Relatório</label>
                                <Input
                                    value={configRelatorio.titulo}
                                    onChange={(e) => setConfigRelatorio(prev => ({ ...prev, titulo: e.target.value }))}
                                    placeholder="Ex: Relatório de Participantes - Dia 1"
                                />
                            </div>

                            {/* Tipo de Relatório */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Tipo de Relatório</label>
                                <Select
                                    value={configRelatorio.tipo}
                                    onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, tipo: value as RelatorioConfig['tipo'] }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="geral">Relatório Geral</SelectItem>
                                        <SelectItem value="filtroEmpresa">Filtro por Empresa</SelectItem>
                                        <SelectItem value="checkin">Quem fez Check-in</SelectItem>
                                        <SelectItem value="checkout">Quem fez Check-out</SelectItem>
                                        <SelectItem value="tempo">Tempo de Serviço</SelectItem>
                                        <SelectItem value="tipoCredencial">Tipo de Credencial</SelectItem>
                                        <SelectItem value="cadastradoPor">Cadastrado por</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtro por Dia */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Filtrar por Dia</label>
                                <Select
                                    value={configRelatorio.filtroDia}
                                    onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroDia: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os dias</SelectItem>
                                        {getEventDays().filter(day => day.id !== 'all').map(day => (
                                            <SelectItem key={day.id} value={day.id}>{day.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtros adicionais baseados no tipo */}
                            {(configRelatorio.tipo === "filtroEmpresa" ||
                                configRelatorio.tipo === "checkin" ||
                                configRelatorio.tipo === "checkout" ||
                                configRelatorio.tipo === "cadastradoPor") && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Empresa</label>
                                        <Select
                                            value={configRelatorio.filtroEmpresa}
                                            onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroEmpresa: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas as empresas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_companies">Todas as empresas</SelectItem>
                                                {Array.from(new Set(participantesDoDia.map(p => p.company).filter(Boolean))).map(empresa => (
                                                    <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                            {configRelatorio.tipo === "tipoCredencial" && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Empresa</label>
                                        <Select
                                            value={configRelatorio.filtroEmpresa}
                                            onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroEmpresa: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas as empresas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_companies">Todas as empresas</SelectItem>
                                                {Array.from(new Set(participantesDoDia.map(p => p.company).filter(Boolean))).map(empresa => (
                                                    <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Função</label>
                                        <Select
                                            value={configRelatorio.filtroFuncao}
                                            onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroFuncao: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas as funções" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_functions">Todas as funções</SelectItem>
                                                {Array.from(new Set(participantesDoDia.map(p => p.role).filter(Boolean))).map(funcao => (
                                                    <SelectItem key={funcao} value={funcao || "not_defined"}>{funcao}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Tipo de Credencial</label>
                                        <Select
                                            value={configRelatorio.filtroTipoCredencial}
                                            onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroTipoCredencial: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos os tipos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_credentials">Todos os tipos</SelectItem>
                                                {Array.from(new Set(participantesDoDia.map(p => p.credentialId || "not_informed").filter(Boolean))).map(credencial => (
                                                    <SelectItem key={credencial} value={credencial}>{credencial}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}

                            {/* Botão de Exportar */}
                            <Button
                                onClick={exportarPDF}
                                disabled={isLoading || !configRelatorio.titulo.trim() || exportPDFMutation.isPending}
                                className="w-full"
                            >
                                {exportPDFMutation.isPending ? (
                                    <>
                                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Gerando PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Exportar PDF
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preview dos Dados */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Preview dos Dados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Registros encontrados:</span>
                                    <Badge variant="secondary">{dadosRelatorio.length}</Badge>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm font-medium">Primeiros 5 registros:</span>
                                    <div className="space-y-1">
                                        {dadosRelatorio.slice(0, 5).map((item, index) => (
                                            <div key={index} className={`text-xs p-2 rounded ${'isHeader' in item && item.isHeader
                                                ? 'bg-blue-100 text-blue-800 font-semibold'
                                                : 'text-gray-600 bg-gray-50'
                                                }`}>
                                                {'isHeader' in item && item.isHeader
                                                    ? item.headerText
                                                    : `${'nome' in item ? item.nome : 'N/A'} - ${'funcao' in item ? item.funcao || 'Não informado' : ''}`
                                                }
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {dadosRelatorio.length === 0 && (
                                    <div className="text-center py-4 text-gray-500">
                                        Nenhum dado encontrado com os filtros atuais
                                    </div>
                                )}

                                {/* Botão de teste rápido */}
                                <div className="pt-4 border-t">
                                    <Button
                                        onClick={() => {
                                            const dadosTeste = [
                                                {
                                                    nome: "João Silva",
                                                    cpf: "123.456.789-00",
                                                    empresa: "RG Produções",
                                                    funcao: "Operador",
                                                    pulseira: "P001",
                                                    checkIn: "08:00",
                                                    checkOut: "17:00"
                                                }
                                            ]

                                            exportPDFMutation.mutate({
                                                titulo: "Teste Rápido - RG Produções",
                                                tipo: "geral",
                                                dados: dadosTeste,
                                                filtros: {
                                                    dia: "all",
                                                    empresa: "all_companies",
                                                    funcao: "all_functions",
                                                    status: "",
                                                    tipoCredencial: "all_credentials"
                                                }
                                            })
                                        }}
                                        disabled={exportPDFMutation.isPending}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                    >
                                        {exportPDFMutation.isPending ? (
                                            <>
                                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                                                Testando...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4 mr-2" />
                                                Teste Rápido PDF
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </EventLayout>
    )
}