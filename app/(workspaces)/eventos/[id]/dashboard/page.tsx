/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useParams } from "next/navigation"
import { Users, CreditCard, UserCheck, Headphones, Car, Activity, Clock, CheckCircle, XCircle } from "lucide-react"
import Image from "next/image"

// Hooks existentes
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useEventWristbandsByEvent } from "@/features/eventos/api/query/use-event-wristbands"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useOperatorsByEvent } from "@/features/operadores/api/query/use-operators-by-event"
import { useRadios } from "@/features/radio/api/query/use-radios"
import type { Event } from "@/features/eventos/types"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useCoordenadoresByEvent } from "@/features/eventos/api/query/use-coordenadores-by-event"
import { useEventVehiclesByEvent } from "@/features/eventos/api/query/use-event-vehicles-by-event"
import { useEventAttendanceByEventAndDate } from "@/features/eventos/api/query/use-event-attendance"

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Recharts components
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts"

// Tipos para os dados
interface Credencial {
    id: string
    eventId: string
    code: string
    label: string
    credentialType: string
    color: string
    isActive: boolean
    assignedTo?: string
    createdAt: string
}

// Cores modernas para os gráficos
const COLORS = {
    primary: "hsl(221, 83%, 53%)",
    secondary: "hsl(142, 76%, 36%)",
    accent: "hsl(262, 83%, 58%)",
    warning: "hsl(38, 92%, 50%)",
    danger: "hsl(0, 84%, 60%)",
    info: "hsl(199, 89%, 48%)",
    muted: "hsl(210, 40%, 98%)",
    border: "hsl(214, 32%, 91%)",
}

export default function Dashboard() {
    const params = useParams()
    const eventId = String(params.id)

    // Buscar evento específico pelo ID
    const { data: eventoData, isLoading: eventoLoading } = useEventos({ id: eventId })
    const evento = Array.isArray(eventoData) ? eventoData[0] : eventoData

    // Hooks para buscar dados usando React Query
    const { data: coordenadores = [], isLoading: coordenadoresLoading } = useCoordenadoresByEvent({ eventId })
    const { data: credenciais = [], isLoading: credenciaisLoading } = useEventWristbandsByEvent(eventId)
    const { data: participantes = [], isLoading: participantesLoading } = useEventParticipantsByEvent({
        eventId: String(params.id),
    })
    const { data: operadores = [], isLoading: operadoresLoading } = useOperatorsByEvent({ eventId })
    const { data: radios = [], isLoading: radiosLoading } = useRadios({ eventId: eventId })
    const { data: vagas = [], isLoading: vagasLoading } = useEventVehiclesByEvent({ eventId })

    // Buscar dados de attendance para hoje
    const today = new Date().toLocaleDateString('pt-BR').split('/').join('-')
    const { data: attendanceData = [], isLoading: attendanceLoading } = useEventAttendanceByEventAndDate(
        eventId,
        today
    )

    // Garantir que coordenadores é sempre um array
    const coordenadoresArray = Array.isArray(coordenadores) ? coordenadores : []
    const radiosArray = Array.isArray(radios) ? radios : []
    const vagasArray = Array.isArray(vagas) ? vagas : []

    // Cálculos das estatísticas
    const totalCoordenadores = coordenadoresArray.length
    const totalCredenciais = credenciais.length
    const totalParticipantes = participantes.length
    const totalOperadores = operadores.length
    const totalRadios = radiosArray.length
    const totalVagas = vagasArray.length

    // Estatísticas de rádios por status
    const radiosDisponiveis = radiosArray.filter((r) => r.status === "disponivel").length
    const radiosRetirados = radiosArray.filter((r) => r.status === "retirado").length
    const radiosManutencao = radiosArray.filter((r) => r.status === "manutencao").length



    // Estatísticas de participantes usando dados de attendance
    const participantesComCheckIn = attendanceData.filter((attendance) => attendance.checkIn !== null).length
    const participantesComCheckOut = attendanceData.filter((attendance) => attendance.checkOut !== null).length
    const participantesConfirmados = participantesComCheckIn
    const participantesNaoConfirmados = totalParticipantes - participantesComCheckIn

    // Estatísticas de credenciais por tipo
    const credenciaisPorTipo = credenciais.reduce(
        (acc, cred) => {
            const tipo = (cred as unknown as Credencial).credentialType || "Sem tipo"
            acc[tipo] = (acc[tipo] || 0) + 1
            return acc
        },
        {} as Record<string, number>,
    )

    // Dados para gráficos
    const radiosChartData = [
        { name: "Disponíveis", value: radiosDisponiveis, color: COLORS.secondary },
        { name: "Retirados", value: radiosRetirados, color: COLORS.primary },
        { name: "Manutenção", value: radiosManutencao, color: COLORS.warning },
    ]

    const participantesChartData = [
        { name: "Confirmados", value: participantesConfirmados, color: COLORS.secondary },
        { name: "Não Confirmados", value: participantesNaoConfirmados, color: COLORS.warning },
        { name: "Check-in", value: participantesComCheckIn, color: COLORS.primary },
        { name: "Check-out", value: participantesComCheckOut, color: COLORS.accent },
    ]

    const credenciaisChartData = Object.entries(credenciaisPorTipo).map(([tipo, quantidade], index) => ({
        name: tipo,
        value: quantidade,
        color: [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.warning, COLORS.info][index % 5],
    }))

    const overviewData = [
        { name: "Coordenadores", value: totalCoordenadores },
        { name: "Credenciais", value: totalCredenciais },
        { name: "Participantes", value: totalParticipantes },
        { name: "Operadores", value: totalOperadores },
        { name: "Rádios", value: totalRadios },
        { name: "Vagas", value: totalVagas },
    ]

    // Função para formatar horário
    const formatarHorario = (timestamp: string) => {
        if (!timestamp) return "-"
        return new Date(timestamp).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    // Função para buscar dados de attendance de um participante
    const getParticipantAttendance = (participantId: string) => {
        return attendanceData.find(attendance => attendance.participantId === participantId)
    }

    // Se não há evento ou está carregando, mostrar loading
    if (eventoLoading || attendanceLoading || !evento) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg text-slate-600">Carregando dados do evento...</p>
                </div>
            </div>
        )
    }

    return (
        <EventLayout eventId={String(params.id)} eventName="Relatório">
            <div className="min-h-screen bg-slate-50 p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard do Evento</h1>
                    <p className="text-slate-600">{(evento as Event)?.name}</p>
                </div>

                {/* Cards de estatísticas principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Coordenadores</p>
                                    <p className="text-2xl font-bold text-slate-900">{totalCoordenadores}</p>
                                </div>
                                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Credenciais</p>
                                    <p className="text-2xl font-bold text-slate-900">{totalCredenciais}</p>
                                </div>
                                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CreditCard className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Participantes</p>
                                    <p className="text-2xl font-bold text-slate-900">{totalParticipantes}</p>
                                </div>
                                <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center">
                                    <UserCheck className="h-6 w-6 text-teal-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Operadores</p>
                                    <p className="text-2xl font-bold text-slate-900">{totalOperadores}</p>
                                </div>
                                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <Activity className="h-6 w-6 text-yellow-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Rádios</p>
                                    <p className="text-2xl font-bold text-slate-900">{totalRadios}</p>
                                </div>
                                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Headphones className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Vagas</p>
                                    <p className="text-2xl font-bold text-slate-900">{totalVagas}</p>
                                </div>
                                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Car className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Gráficos principais */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Gráfico de barras - Visão geral */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-slate-900">Visão Geral</CardTitle>
                            <CardDescription>Distribuição de recursos do evento</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                config={{
                                    value: {
                                        label: "Quantidade",
                                        color: COLORS.primary,
                                    },
                                }}
                                className="h-[300px]"
                            >
                                <BarChart data={overviewData}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Gráfico de pizza - Status dos Rádios */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-slate-900">Status dos Rádios</CardTitle>
                            <CardDescription>Distribuição por status atual</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                config={{
                                    disponivel: {
                                        label: "Disponíveis",
                                        color: COLORS.secondary,
                                    },
                                    retirado: {
                                        label: "Retirados",
                                        color: COLORS.primary,
                                    },
                                    manutencao: {
                                        label: "Manutenção",
                                        color: COLORS.warning,
                                    },
                                }}
                                className="h-[300px]"
                            >
                                <PieChart>
                                    <Pie
                                        data={radiosChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {radiosChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ChartContainer>
                            <div className="flex justify-center gap-4 mt-4">
                                {radiosChartData.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm text-slate-600">
                                            {item.name}: {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Gráficos secundários */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Status dos Participantes */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-slate-900">Status dos Participantes</CardTitle>
                            <CardDescription>Confirmações e check-ins</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                config={{
                                    value: {
                                        label: "Quantidade",
                                        color: COLORS.primary,
                                    },
                                }}
                                className="h-[250px]"
                            >
                                <BarChart data={participantesChartData} layout="horizontal">
                                    <XAxis type="number" axisLine={false} tickLine={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={100}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Credenciais por Tipo */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-slate-900">Credenciais por Tipo</CardTitle>
                            <CardDescription>Distribuição por categoria</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {credenciaisChartData.length > 0 ? (
                                <>
                                    <ChartContainer
                                        config={{
                                            value: {
                                                label: "Quantidade",
                                                color: COLORS.primary,
                                            },
                                        }}
                                        className="h-[200px]"
                                    >
                                        <PieChart>
                                            <Pie
                                                data={credenciaisChartData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {credenciaisChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                        </PieChart>
                                    </ChartContainer>
                                    <div className="space-y-2 mt-4">
                                        {credenciaisChartData.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="text-sm text-slate-600">{item.name}</span>
                                                </div>
                                                <Badge variant="secondary">{item.value}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-[200px] text-slate-500">
                                    Nenhuma credencial encontrada
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Check-in Hoje</p>
                                    <p className="text-xl font-bold text-slate-900">{participantesComCheckIn}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Check-out Hoje</p>
                                    <p className="text-xl font-bold text-slate-900">{participantesComCheckOut}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Pendentes</p>
                                    <p className="text-xl font-bold text-slate-900">{participantesNaoConfirmados}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Activity className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Taxa de Presença</p>
                                    <p className="text-xl font-bold text-slate-900">
                                        {totalParticipantes > 0 ? `${((participantesComCheckIn / totalParticipantes) * 100).toFixed(1)}%` : "0%"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Dados de Attendance em Tempo Real */}
                <Card className="border-0 shadow-sm mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-900">
                            Dados de Presença - {today}
                        </CardTitle>
                        <CardDescription>
                            Dados atualizados em tempo real dos check-ins e check-outs de hoje
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-green-700">Check-ins Realizados</p>
                                        <p className="text-2xl font-bold text-green-900">{participantesComCheckIn}</p>
                                    </div>
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-blue-700">Check-outs Realizados</p>
                                        <p className="text-2xl font-bold text-blue-900">{participantesComCheckOut}</p>
                                    </div>
                                    <CheckCircle className="h-8 w-8 text-blue-600" />
                                </div>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-yellow-700">Ainda no Evento</p>
                                        <p className="text-2xl font-bold text-yellow-900">{participantesComCheckIn - participantesComCheckOut}</p>
                                    </div>
                                    <Clock className="h-8 w-8 text-yellow-600" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabelas de dados */}
                <div className="space-y-6">
                    {/* Coordenadores */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-slate-900">
                                Coordenadores ({coordenadoresArray.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">Nome</th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                                            <th className="text-center py-3 px-4 font-medium text-slate-600">Função</th>
                                            <th className="text-center py-3 px-4 font-medium text-slate-600">Data Criação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {coordenadoresArray.map((coordenador) => (
                                            <tr key={coordenador.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4 font-medium text-slate-900">
                                                    {coordenador.firstName} {coordenador.lastName}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">{coordenador.email}</td>
                                                <td className="text-center py-3 px-4">
                                                    <Badge variant="outline">{coordenador.metadata?.eventos?.[0]?.role || "Coordenador"}</Badge>
                                                </td>
                                                <td className="text-center py-3 px-4 text-slate-600">
                                                    {formatarHorario(coordenador.createdAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Participantes */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-slate-900">
                                Participantes ({participantes.length})
                            </CardTitle>
                            <CardDescription>
                                Lista de participantes com status de presença em tempo real
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">Nome</th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">CPF</th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">Empresa</th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">Cargo</th>
                                            <th className="text-center py-3 px-4 font-medium text-slate-600">Check-in</th>
                                            <th className="text-center py-3 px-4 font-medium text-slate-600">Check-out</th>
                                            <th className="text-center py-3 px-4 font-medium text-slate-600">Tempo no Evento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participantes.slice(0, 15).map((participante) => {
                                            const attendance = getParticipantAttendance(participante.id);
                                            const hasCheckIn = attendance?.checkIn !== null;
                                            const hasCheckOut = attendance?.checkOut !== null;

                                            // Calcular tempo no evento
                                            const getTimeInEvent = () => {
                                                if (!hasCheckIn) return "-";
                                                if (!hasCheckOut) {
                                                    const checkInTime = new Date(attendance?.checkIn || "");
                                                    const now = new Date();
                                                    const diffMs = now.getTime() - checkInTime.getTime();
                                                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                                    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                                    return `${diffHours}h ${diffMinutes}min`;
                                                } else {
                                                    const checkInTime = new Date(attendance?.checkIn || "");
                                                    const checkOutTime = new Date(attendance?.checkOut || "");
                                                    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
                                                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                                    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                                    return `${diffHours}h ${diffMinutes}min`;
                                                }
                                            };

                                            // Determinar status visual
                                            const getStatusBadge = () => {
                                                if (hasCheckIn && hasCheckOut) {
                                                    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completo</Badge>;
                                                } else if (hasCheckIn && !hasCheckOut) {
                                                    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">No Evento</Badge>;
                                                } else {
                                                    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>;
                                                }
                                            };

                                            return (
                                                <tr key={participante.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-3 px-4">
                                                        {getStatusBadge()}
                                                    </td>
                                                    <td className="py-3 px-4 font-medium text-slate-900">
                                                        <div>
                                                            <div className="font-semibold">{participante.name}</div>
                                                            {participante.email && (
                                                                <div className="text-xs text-slate-500">{participante.email}</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600 font-mono text-sm">
                                                        {participante.cpf}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600">
                                                        <div className="font-medium">{participante.company}</div>
                                                        {participante.role && (
                                                            <div className="text-xs text-slate-500">{participante.role}</div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600">
                                                        {participante.role || "Não informado"}
                                                    </td>
                                                    <td className="text-center py-3 px-4 text-slate-600">
                                                        {hasCheckIn ? (
                                                            <div className="flex flex-col items-center">
                                                                <div className="text-green-600 font-medium">
                                                                    {formatarHorario(attendance?.checkIn || "")}
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {new Date(attendance?.checkIn || "").toLocaleTimeString('pt-BR', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center py-3 px-4 text-slate-600">
                                                        {hasCheckOut ? (
                                                            <div className="flex flex-col items-center">
                                                                <div className="text-red-600 font-medium">
                                                                    {formatarHorario(attendance?.checkOut || "")}
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {new Date(attendance?.checkOut || "").toLocaleTimeString('pt-BR', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center py-3 px-4 text-slate-600">
                                                        <div className="font-mono text-sm">
                                                            {getTimeInEvent()}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {participantes.length > 15 && (
                                    <div className="text-center py-4">
                                        <Badge variant="outline">Mostrando 15 de {participantes.length} participantes</Badge>
                                    </div>
                                )}

                                {/* Resumo dos status */}
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-green-700">Completos</span>
                                            <Badge className="bg-green-100 text-green-800">
                                                {participantes.filter(p => {
                                                    const attendance = getParticipantAttendance(p.id);
                                                    return attendance?.checkIn && attendance?.checkOut;
                                                }).length}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-blue-700">No Evento</span>
                                            <Badge className="bg-blue-100 text-blue-800">
                                                {participantes.filter(p => {
                                                    const attendance = getParticipantAttendance(p.id);
                                                    return attendance?.checkIn && !attendance?.checkOut;
                                                }).length}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-yellow-700">Pendentes</span>
                                            <Badge className="bg-yellow-100 text-yellow-800">
                                                {participantes.filter(p => {
                                                    const attendance = getParticipantAttendance(p.id);
                                                    return !attendance?.checkIn;
                                                }).length}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-purple-700">Total</span>
                                            <Badge className="bg-purple-100 text-purple-800">
                                                {participantes.length}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Informações do sistema */}
                <Card className="border-0 shadow-sm mt-8">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-900">Informações do Sistema</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Evento:</span>
                                    <span className="font-medium text-slate-900">{(evento as Event)?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Última Atualização:</span>
                                    <span className="font-medium text-slate-900">{new Date().toLocaleString("pt-BR")}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Status:</span>
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo (React Query)</Badge>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Total de Recursos:</span>
                                    <span className="font-medium text-slate-900">
                                        {totalCoordenadores +
                                            totalCredenciais +
                                            totalParticipantes +
                                            totalOperadores +
                                            totalRadios +
                                            totalVagas}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Taxa de Check-in:</span>
                                    <span className="font-medium text-slate-900">
                                        {totalParticipantes > 0
                                            ? `${((participantesComCheckIn / totalParticipantes) * 100).toFixed(1)}%`
                                            : "0%"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Rádios Disponíveis:</span>
                                    <span className="font-medium text-slate-900">
                                        {totalRadios > 0 ? `${((radiosDisponiveis / totalRadios) * 100).toFixed(1)}%` : "0%"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center pt-8 pb-8">
                    <Image src="/images/slogan-rg.png" alt="Se tem RG, é sucesso!" className="mx-auto max-w-xs opacity-60" width={100} height={100} />
                </div>
            </div>
        </EventLayout>
    )
}
