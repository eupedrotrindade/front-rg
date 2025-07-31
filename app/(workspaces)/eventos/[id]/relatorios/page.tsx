'use client'

import React, { useState, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCoordenadoresByEvent } from "@/features/eventos/api/query/use-coordenadores-by-event"
import { useEventVehiclesByEvent } from "@/features/eventos/api/query/use-event-vehicles-by-event"
import { useEventWristbandsByEvent } from "@/features/eventos/api/query/use-event-wristbands"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, UserCog, Building, Download, FileText, Filter, Search } from "lucide-react"
import { toast } from "sonner"
import EventLayout from "@/components/dashboard/dashboard-layout"
import type { EventParticipant } from "@/features/eventos/types"
import { useExportPDF } from "@/features/eventos/api/mutation/use-export-pdf"

interface RelatorioConfig {
    titulo: string
    tipo: "geral" | "participantes" | "coordenadores" | "vagas" | "checkin" | "checkout" | "tempo"
    filtroDia: string
    filtroEmpresa: string
    filtroFuncao: string
    filtroStatus: string
}

export default function RelatoriosPage() {
    const params = useParams()
    const eventId = String(params.id)
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null


    // Hooks para buscar dados
    const { data: eventoData, isLoading: eventoLoading } = useEventos({ id: eventId })
    const { data: participantes = [], isLoading: participantesLoading } = useEventParticipantsByEvent({ eventId })
    const { data: coordenadores = [], isLoading: coordenadoresLoading } = useCoordenadoresByEvent({ eventId })
    const { data: vagas = [], isLoading: vagasLoading } = useEventVehiclesByEvent({ eventId })
    const { data: wristbands = [], isLoading: wristbandsLoading } = useEventWristbandsByEvent(eventId)

    // Hook para exportação
    const exportPDFMutation = useExportPDF()

    // Estados do relatório
    const [configRelatorio, setConfigRelatorio] = useState<RelatorioConfig>({
        titulo: "",
        tipo: "geral",
        filtroDia: "all",
        filtroEmpresa: "",
        filtroFuncao: "",
        filtroStatus: ""
    })

    const [searchTerm, setSearchTerm] = useState("")
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

        // Adicionar dias de preparação/evento
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

    // Função para filtrar participantes por dia
    const getParticipantesPorDia = useCallback((dia: string): EventParticipant[] => {
        if (dia === 'all') {
            return participantes
        }

        return participantes.filter((participant: EventParticipant) => {
            if (!participant.daysWork || participant.daysWork.length === 0) {
                return false
            }
            return participant.daysWork.includes(dia)
        })
    }, [participantes])

    // Dados filtrados por dia selecionado
    const participantesDoDia = getParticipantesPorDia(selectedDay)

    // Estatísticas
    const estatisticas = useMemo(() => {
        const totalParticipantes = participantesDoDia.length
        const participantesComCheckIn = participantesDoDia.filter(p => p.checkIn).length
        const participantesComCheckOut = participantesDoDia.filter(p => p.checkOut).length
        const participantesAtivos = participantesComCheckIn - participantesComCheckOut
        const participantesComPulseira = participantesDoDia.filter(p => p.wristbandId).length

        return {
            totalParticipantes,
            participantesComCheckIn,
            participantesComCheckOut,
            participantesAtivos,
            participantesComPulseira,
            totalCoordenadores: coordenadores.length,
            totalVagas: vagas.length,
            vagasRetiradas: vagas.filter(v => v.status).length,
            vagasPendentes: vagas.filter(v => !v.status).length
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

    // Função para gerar dados do relatório
    const gerarDadosRelatorio = useCallback(() => {
        let dados: Record<string, unknown>[] = []

        switch (configRelatorio.tipo) {
            case "participantes":
                dados = participantesDoDia.map(p => ({
                    nome: p.name,
                    cpf: p.cpf,
                    empresa: p.company,
                    funcao: p.role,
                    checkIn: p.checkIn,
                    checkOut: p.checkOut,
                    validadoPor: p.validatedBy,
                    diasTrabalho: p.daysWork?.join(", ")
                }))
                break

            case "coordenadores":
                dados = coordenadores.map(c => ({
                    nome: `${c.firstName} ${c.lastName}`,
                    email: c.email,
                    eventos: c.metadata?.eventos?.map(e => e.nome_evento).join(", ")
                }))
                break

            case "vagas":
                dados = vagas.map(v => ({
                    empresa: v.empresa,
                    placa: v.placa,
                    modelo: v.modelo,
                    credencial: v.credencial,
                    status: v.status ? "Retirada" : "Pendente"
                }))
                break

            case "checkin":
                dados = participantesDoDia
                    .filter(p => p.checkIn)
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        checkIn: p.checkIn,
                        validadoPor: p.validatedBy
                    }))
                break

            case "checkout":
                dados = participantesDoDia
                    .filter(p => p.checkOut)
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        checkOut: p.checkOut,
                        validadoPor: p.validatedBy
                    }))
                break

            case "tempo":
                dados = participantesDoDia
                    .filter(p => p.checkIn && p.checkOut)
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        checkIn: p.checkIn,
                        checkOut: p.checkOut,
                        tempoTotal: "Calculado" // Implementar cálculo de tempo
                    }))
                break

            default: // geral
                dados = [
                    ...participantesDoDia.map(p => ({
                        tipo: "Participante",
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        status: p.checkIn ? (p.checkOut ? "Finalizado" : "Ativo") : "Pendente"
                    })),
                    ...coordenadores.map(c => ({
                        tipo: "Coordenador",
                        nome: `${c.firstName} ${c.lastName}`,
                        email: c.email,
                        empresa: "-",
                        funcao: "-",
                        status: "Ativo"
                    })),
                    ...vagas.map(v => ({
                        tipo: "Vaga",
                        nome: v.empresa,
                        placa: v.placa,
                        empresa: v.empresa,
                        funcao: v.modelo,
                        status: v.status ? "Retirada" : "Pendente"
                    }))
                ]
        }

        // Aplicar filtros
        if (configRelatorio.filtroEmpresa) {
            dados = dados.filter(d => d.empresa === configRelatorio.filtroEmpresa)
        }

        if (configRelatorio.filtroFuncao) {
            dados = dados.filter(d => d.funcao === configRelatorio.filtroFuncao)
        }

        if (configRelatorio.filtroStatus) {
            dados = dados.filter(d => d.status === configRelatorio.filtroStatus)
        }

        return dados
    }, [configRelatorio, participantesDoDia, coordenadores, vagas])

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
            dados: dadosRelatorio,
            filtros: {
                dia: configRelatorio.filtroDia,
                empresa: configRelatorio.filtroEmpresa,
                funcao: configRelatorio.filtroFuncao,
                status: configRelatorio.filtroStatus
            }
        })

        // Resetar configuração após sucesso
        setConfigRelatorio({
            titulo: "",
            tipo: "geral",
            filtroDia: "all",
            filtroEmpresa: "",
            filtroFuncao: "",
            filtroStatus: ""
        })
    }, [configRelatorio, gerarDadosRelatorio, exportPDFMutation])

    const isLoading = eventoLoading || participantesLoading || coordenadoresLoading || vagasLoading || wristbandsLoading


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
                                    <p className="text-sm opacity-90">Vagas</p>
                                    <p className="text-3xl font-bold">{estatisticas.totalVagas}</p>
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
                                        <SelectItem value="participantes">Participantes</SelectItem>
                                        <SelectItem value="coordenadores">Coordenadores</SelectItem>
                                        <SelectItem value="vagas">Vagas</SelectItem>
                                        <SelectItem value="checkin">Check-in</SelectItem>
                                        <SelectItem value="checkout">Check-out</SelectItem>
                                        <SelectItem value="tempo">Tempo de Serviço</SelectItem>
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
                            {configRelatorio.tipo === "participantes" && (
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
                                                <SelectItem value="">Todas as empresas</SelectItem>
                                                {Array.from(new Set(participantesDoDia.map(p => p.company).filter(Boolean))).map(empresa => (
                                                    <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Status</label>
                                        <Select
                                            value={configRelatorio.filtroStatus}
                                            onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroStatus: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos os status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Todos os status</SelectItem>
                                                <SelectItem value="Pendente">Pendente</SelectItem>
                                                <SelectItem value="Ativo">Ativo</SelectItem>
                                                <SelectItem value="Finalizado">Finalizado</SelectItem>
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
                                            <div key={index} className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                                                {String(item.nome || item.empresa || item.tipo)} - {String(item.funcao || item.status)}
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
                                                    tipo: "Participante",
                                                    nome: "João Silva",
                                                    cpf: "123.456.789-00",
                                                    empresa: "RG Produções",
                                                    funcao: "Operador",
                                                    status: "Ativo"
                                                }
                                            ]

                                            exportPDFMutation.mutate({
                                                titulo: "Teste Rápido - RG Produções",
                                                tipo: "geral",
                                                dados: dadosTeste,
                                                filtros: {
                                                    dia: "all",
                                                    empresa: "",
                                                    funcao: "",
                                                    status: ""
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