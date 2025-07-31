'use client'

import React, { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
    Building,
    Calendar,
    Users,
    MapPin,
    Mail,
    Phone,
    TrendingUp,
    Award,
    Clock,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    ArrowLeft,
    BarChart3,
    Target,
    Star,
    Activity,
    UserCheck,
    UserX,
    Car,
    Radio,
    FileText
} from "lucide-react"
import { useEmpresa, useEventos, useEventParticipants, useCoordenadores, useEventVehiclesByEvent, useRadios } from "@/features/eventos/api/query"
import Link from "next/link"

export default function EmpresaEventoDashboardPage() {
    const params = useParams()
    const empresaId = String(params.id)
    const eventoId = String(params.eventoId)

    const { data: empresa, isLoading: isLoadingEmpresa } = useEmpresa(empresaId)
    const { data: eventos = [] } = useEventos()
    const { data: participantes = [] } = useEventParticipants()
    const { data: coordenadores = [] } = useCoordenadores(eventoId)
    const { data: veiculos = [] } = useEventVehiclesByEvent({ eventId: eventoId, empresaFilter: empresa?.nome })
    const { data: radios = [] } = useRadios({ eventId: eventoId })

    // Buscar dados do evento específico
    const evento = Array.isArray(eventos) ? eventos.find(e => String(e.id) === eventoId) : null

    // Buscar dados específicos da empresa neste evento
    const participantesDaEmpresa = participantes.filter(p =>
        p.eventId === eventoId && p.company === empresa?.nome
    )
    const coordenadoresDaEmpresa = coordenadores?.filter(c =>
        c.metadata?.eventos?.some(e => e.id === eventoId)
    ) || []
    const operadoresDaEmpresa: Array<{ id: string; name: string; email?: string; phone?: string }> = [] // Por enquanto vazio, até ter o hook de operadores
    const veiculosDaEmpresa = veiculos // Já filtrado pelo hook
    const radiosDaEmpresa = radios.filter(r =>
        r.event_id === eventoId
    )

    // Calcular estatísticas reais
    const totalParticipantes = participantesDaEmpresa.length
    const participantesComCheckIn = participantesDaEmpresa.filter(p => p.checkIn).length
    const participantesComCheckOut = participantesDaEmpresa.filter(p => p.checkOut).length
    const totalCoordenadores = coordenadoresDaEmpresa.length
    const totalOperadores = operadoresDaEmpresa.length
    const vagasUtilizadas = veiculosDaEmpresa.length
    const radiosUtilizados = radiosDaEmpresa.length

    // Calcular métricas de desempenho baseadas em dados reais
    const desempenhoData = {
        participacao: totalParticipantes > 0 ? Math.round((participantesComCheckIn / totalParticipantes) * 100) : 0,
        pontualidade: totalParticipantes > 0 ? Math.round((participantesComCheckOut / totalParticipantes) * 100) : 0,
        colaboracao: 88, // Mantido como exemplo, seria calculado baseado em feedback
        satisfacao: 90, // Mantido como exemplo, seria calculado baseado em avaliações
        totalParticipantes,
        participantesComCheckIn,
        participantesComCheckOut,
        totalCoordenadores,
        totalOperadores,
        vagasUtilizadas,
        radiosUtilizados
    }

    const [activeTab, setActiveTab] = useState<'desempenho' | 'equipe' | 'recursos' | 'relatorios'>('desempenho')

    if (isLoadingEmpresa) {
        return (
            <div className="p-8">
                <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
                    <p className="text-gray-600">Carregando informações...</p>
                </div>
            </div>
        )
    }

    if (!empresa || !evento) {
        return (
            <div className="p-8">
                <div className="text-center py-8">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Empresa ou evento não encontrado</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href={`/empresas/dashboard/${empresaId}`}>
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Voltar
                                </Button>
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {empresa.nome} - {evento.name}
                        </h1>
                        <p className="text-gray-600">
                            Desempenho e recursos da empresa no evento
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={evento.isActive ? "default" : "secondary"}>
                            {evento.isActive ? "Evento Ativo" : "Evento Inativo"}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    <Button
                        variant={activeTab === 'desempenho' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('desempenho')}
                        className="flex items-center gap-2"
                    >
                        <BarChart3 className="h-4 w-4" />
                        Desempenho
                    </Button>
                    <Button
                        variant={activeTab === 'equipe' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('equipe')}
                        className="flex items-center gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Equipe ({totalCoordenadores + totalOperadores})
                    </Button>
                    <Button
                        variant={activeTab === 'recursos' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('recursos')}
                        className="flex items-center gap-2"
                    >
                        <Target className="h-4 w-4" />
                        Recursos
                    </Button>
                    <Button
                        variant={activeTab === 'relatorios' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('relatorios')}
                        className="flex items-center gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        Relatórios
                    </Button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'desempenho' && (
                <div className="space-y-6">
                    {/* Métricas de Desempenho */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Check-in</p>
                                        <p className="text-3xl font-bold">{desempenhoData.participacao}%</p>
                                    </div>
                                    <UserCheck className="h-8 w-8 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Check-out</p>
                                        <p className="text-3xl font-bold">{desempenhoData.pontualidade}%</p>
                                    </div>
                                    <Clock className="h-8 w-8 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Colaboração</p>
                                        <p className="text-3xl font-bold">{desempenhoData.colaboracao}%</p>
                                    </div>
                                    <Award className="h-8 w-8 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Satisfação</p>
                                        <p className="text-3xl font-bold">{desempenhoData.satisfacao}%</p>
                                    </div>
                                    <Star className="h-8 w-8 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Estatísticas Detalhadas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Participantes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total</span>
                                        <span className="font-semibold">{desempenhoData.totalParticipantes}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Com Check-in</span>
                                        <span className="font-semibold text-green-600">{desempenhoData.participantesComCheckIn}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Com Check-out</span>
                                        <span className="font-semibold text-blue-600">{desempenhoData.participantesComCheckOut}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="h-5 w-5" />
                                    Equipe
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Coordenadores</span>
                                        <span className="font-semibold">{desempenhoData.totalCoordenadores}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Operadores</span>
                                        <span className="font-semibold">{desempenhoData.totalOperadores}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total</span>
                                        <span className="font-semibold">{totalCoordenadores + totalOperadores}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5" />
                                    Recursos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Vagas Utilizadas</span>
                                        <span className="font-semibold">{desempenhoData.vagasUtilizadas}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Rádios Utilizados</span>
                                        <span className="font-semibold">{desempenhoData.radiosUtilizados}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'equipe' && (
                <div className="space-y-6">
                    {/* Coordenadores */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Coordenadores ({coordenadoresDaEmpresa.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {coordenadoresDaEmpresa.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">Nenhum coordenador encontrado</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Função no Evento</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {coordenadoresDaEmpresa.map((coordenador) => {
                                            const eventoCoordenador = coordenador.metadata?.eventos?.find(e => e.id === eventoId)
                                            return (
                                                <TableRow key={coordenador.id}>
                                                    <TableCell className="font-medium">
                                                        {coordenador.firstName} {coordenador.lastName}
                                                    </TableCell>
                                                    <TableCell>{coordenador.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{eventoCoordenador?.role || "Coordenador"}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="default">
                                                            Ativo
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="sm">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Operadores */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Operadores ({operadoresDaEmpresa.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {operadoresDaEmpresa.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">Nenhum operador encontrado</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Telefone</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {operadoresDaEmpresa.map((operador) => (
                                            <TableRow key={operador.id}>
                                                <TableCell className="font-medium">{operador.name}</TableCell>
                                                <TableCell>{operador.email || "-"}</TableCell>
                                                <TableCell>{operador.phone || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge variant="default">
                                                        Ativo
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'recursos' && (
                <div className="space-y-6">
                    {/* Veículos */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Car className="h-5 w-5" />
                                Veículos ({veiculosDaEmpresa.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {veiculosDaEmpresa.length === 0 ? (
                                <div className="text-center py-8">
                                    <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">Nenhum veículo encontrado</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {veiculosDaEmpresa.map((veiculo) => (
                                        <Card key={veiculo.id} className="hover:shadow-lg transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 mb-1">
                                                            {veiculo.placa}
                                                        </h3>
                                                        <Badge variant={veiculo.status ? "default" : "secondary"} className="text-xs">
                                                            {veiculo.status ? "Retirado" : "Pendente"}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <Car className="h-3 w-3" />
                                                        <span>{veiculo.modelo || "Modelo não informado"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-3 w-3" />
                                                        <span>{veiculo.credencial || "Credencial não informada"}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Rádios */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Radio className="h-5 w-5" />
                                Rádios ({radiosDaEmpresa.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {radiosDaEmpresa.length === 0 ? (
                                <div className="text-center py-8">
                                    <Radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">Nenhum rádio encontrado</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {radiosDaEmpresa.map((radio) => (
                                        <Card key={radio.id} className="hover:shadow-lg transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 mb-1">
                                                            {radio.codes.join(', ')}
                                                        </h3>
                                                        <Badge variant={radio.status === 'disponivel' ? "default" : "secondary"} className="text-xs">
                                                            {radio.status === 'disponivel' ? "Disponível" : radio.status === 'retirado' ? "Retirado" : "Manutenção"}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <Radio className="h-3 w-3" />
                                                        <span>Status: {radio.status}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-3 w-3" />
                                                        <span>Evento: {radio.event_id}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'relatorios' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Relatórios Disponíveis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <BarChart3 className="h-8 w-8 text-blue-600" />
                                            <div>
                                                <h3 className="font-semibold">Relatório de Desempenho</h3>
                                                <p className="text-sm text-gray-600">Métricas e indicadores de performance</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Users className="h-8 w-8 text-green-600" />
                                            <div>
                                                <h3 className="font-semibold">Relatório de Equipe</h3>
                                                <p className="text-sm text-gray-600">Participação e atividades da equipe</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Target className="h-8 w-8 text-purple-600" />
                                            <div>
                                                <h3 className="font-semibold">Relatório de Recursos</h3>
                                                <p className="text-sm text-gray-600">Utilização de veículos e equipamentos</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Activity className="h-8 w-8 text-orange-600" />
                                            <div>
                                                <h3 className="font-semibold">Relatório Geral</h3>
                                                <p className="text-sm text-gray-600">Visão completa da participação</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
} 