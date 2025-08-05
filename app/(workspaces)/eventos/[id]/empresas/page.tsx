/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Edit, Trash2, Building, Calendar, Check, X, MoreHorizontal, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useEmpresas } from "@/features/eventos/api/query/use-empresas"
import { useCreateEmpresa, useDeleteEmpresa, useUpdateEmpresa } from "@/features/eventos/api/mutation"
import { useEventos } from "@/features/eventos/api/query"
import type { CreateEmpresaRequest, Empresa, Event } from "@/features/eventos/types"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useParams } from "next/navigation"

export default function EmpresasPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
    const [selectedDate, setSelectedDate] = useState<string>("")
    const [formData, setFormData] = useState<CreateEmpresaRequest>({
        nome: "",
        id_evento: "",
        days: []
    })

    // Hooks
    const { data: empresas = [] } = useEmpresas()
    const { data: eventos = [] } = useEventos()
    const createEmpresaMutation = useCreateEmpresa()
    const updateEmpresaMutation = useUpdateEmpresa()
    const deleteEmpresaMutation = useDeleteEmpresa()

    const eventId = useParams().id as string
    const { data: event } = useEventos({ id: eventId })

    // Função para calcular os dias do evento com período
    const getEventDays = (event: Event): { label: string; value: string; periodo: string }[] => {
        if (!event.startDate || !event.endDate) return []

        // Parse datas dos períodos
        const parse = (d?: string) => d ? new Date(d) : undefined
        const setupStart = parse(event.setupStartDate)
        const setupEnd = parse(event.setupEndDate)
        const prepStart = parse(event.preparationStartDate)
        const prepEnd = parse(event.preparationEndDate)
        const eventStart = parse(event.preparationStartDate)
        const eventEnd = parse(event.preparationEndDate)
        const finalStart = parse(event.finalizationStartDate)
        const finalEnd = parse(event.finalizationEndDate)

        const days: { label: string; value: string; periodo: string }[] = []

        for (let d = new Date(event.startDate); d <= new Date(event.endDate); d.setDate(d.getDate() + 1)) {
            const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            const value = d.toISOString().slice(0, 10) // YYYY-MM-DD

            // Descobre o período
            let periodo = ''
            if (setupStart && setupEnd && d >= setupStart && d <= setupEnd) {
                periodo = 'montagem'
            } else if (eventStart && eventEnd && d >= eventStart && d <= eventEnd) {
                periodo = 'evento'
            } else if (finalStart && finalEnd && d >= finalStart && d <= finalEnd) {
                periodo = 'desmontagem'
            }

            days.push({
                label: `${dateStr} - ${periodo}`,
                value,
                periodo,
            })
        }

        return days
    }

    // Dias disponíveis baseado no evento selecionado
    const availableDays = useMemo(() => {
        if (!formData.id_evento) return []

        const selectedEvent = Array.isArray(eventos)
            ? eventos.find((e: any) => e.id === formData.id_evento)
            : null

        if (!selectedEvent) return []

        return getEventDays(selectedEvent)
    }, [formData.id_evento, eventos])

    // Organizar empresas por data
    const empresasByDate = useMemo(() => {
        if (!event || Array.isArray(event) || !empresas) return {}

        const days = getEventDays(event)
        const grouped: Record<string, Empresa[]> = {}

        // Inicializar todas as datas
        days.forEach(day => {
            grouped[day.value] = []
        })

        // Agrupar empresas por data
        empresas.forEach(empresa => {
            if (Array.isArray(empresa.days)) {
                empresa.days.forEach(day => {
                    if (grouped[day]) {
                        grouped[day].push(empresa)
                    }
                })
            }
        })

        // Ordenar empresas alfabeticamente em cada data
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) => a.nome.localeCompare(b.nome))
        })

        return grouped
    }, [empresas, event])

    // Filtrar empresas por termo de pesquisa
    const filteredEmpresasByDate = useMemo(() => {
        if (!searchTerm) return empresasByDate

        const filtered: Record<string, Empresa[]> = {}

        Object.keys(empresasByDate).forEach(date => {
            const filteredEmpresas = empresasByDate[date].filter(empresa =>
                empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (empresa.id_evento && empresa.id_evento.includes(searchTerm)) ||
                (Array.isArray(empresa.days) && empresa.days.some((day: string) => day.toLowerCase().includes(searchTerm.toLowerCase())))
            )

            if (filteredEmpresas.length > 0) {
                filtered[date] = filteredEmpresas
            }
        })

        return filtered
    }, [empresasByDate, searchTerm])

    // Datas disponíveis para o menu
    const availableDates = useMemo(() => {
        if (!event || Array.isArray(event)) return []

        return getEventDays(event)
    }, [event])

    // Estatísticas
    const stats = useMemo(() => {
        if (!empresas) {
            return {
                total: 0,
                configuradas: 0,
                parcialmenteConfiguradas: 0,
                naoConfiguradas: 0
            }
        }

        const total = empresas.length
        const configuradas = empresas.filter(e => e.id_evento && Array.isArray(e.days) && e.days.length > 0).length
        const parcialmenteConfiguradas = empresas.filter(e => (e.id_evento || (Array.isArray(e.days) && e.days.length > 0)) && !(e.id_evento && Array.isArray(e.days) && e.days.length > 0)).length
        const naoConfiguradas = empresas.filter(e => !e.id_evento && (!Array.isArray(e.days) || e.days.length === 0)).length

        return {
            total,
            configuradas,
            parcialmenteConfiguradas,
            naoConfiguradas
        }
    }, [empresas])

    const handleCreateEmpresa = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await createEmpresaMutation.mutateAsync(formData)
            setIsCreateDialogOpen(false)
            resetForm()
            toast.success("Empresa criada com sucesso!")
        } catch (error) {
            console.error("Erro ao criar empresa:", error)
            toast.error("Erro ao criar empresa")
        }
    }

    const handleUpdateEmpresa = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedEmpresa) return
        try {
            await updateEmpresaMutation.mutateAsync({
                id: selectedEmpresa.id,
                data: formData
            })
            setIsEditDialogOpen(false)
            setSelectedEmpresa(null)
            resetForm()
            toast.success("Empresa atualizada com sucesso!")
        } catch (error) {
            console.error("Erro ao atualizar empresa:", error)
            toast.error("Erro ao atualizar empresa")
        }
    }

    const handleDeleteEmpresa = async (empresa: Empresa) => {
        if (confirm(`Tem certeza que deseja deletar a empresa "${empresa.nome}"?`)) {
            try {
                await deleteEmpresaMutation.mutateAsync(empresa.id)
                toast.success("Empresa deletada com sucesso!")
            } catch (error) {
                console.error("Erro ao deletar empresa:", error)
                toast.error("Erro ao deletar empresa")
            }
        }
    }

    const handleEditEmpresa = (empresa: Empresa) => {
        setSelectedEmpresa(empresa)
        setFormData({
            nome: empresa.nome,
            id_evento: empresa.id_evento || "",
            days: Array.isArray(empresa.days) ? empresa.days : []
        })
        setIsEditDialogOpen(true)
    }

    const eventName =
        Array.isArray(event)
            ? ""
            : event?.name || ""

    const resetForm = () => {
        setFormData({
            nome: "",
            id_evento: eventId,
            days: []
        })
    }

    // Função para gerar token de acesso público
    // O token contém: empresaId:eventId:timestamp
    // A página pública decodifica o token e busca os dados correspondentes
    // Usuários Clerk podem editar informações dos colaboradores diretamente na página pública
    const generatePublicToken = (empresa: Empresa) => {
        const token = btoa(`${empresa.id}:${eventId}:${Date.now()}`)
        const publicUrl = `${window.location.origin}/empresa/${token}`
        return publicUrl
    }

    // Função para copiar URL pública
    const copyPublicUrl = async (empresa: Empresa) => {
        try {
            const url = generatePublicToken(empresa)
            await navigator.clipboard.writeText(url)
            toast.success("URL pública copiada para a área de transferência!")
        } catch (error) {
            console.error("Erro ao copiar URL:", error)
            toast.error("Erro ao copiar URL")
        }
    }

    // Inicializar formData com o evento atual
    React.useEffect(() => {
        if (eventId) {
            setFormData(prev => ({
                ...prev,
                id_evento: eventId
            }))
        }
    }, [eventId])

    // Selecionar primeira data por padrão
    React.useEffect(() => {
        if (availableDates.length > 0 && !selectedDate) {
            setSelectedDate(availableDates[0].value)
        }
    }, [availableDates, selectedDate])

    // Função para obter cor da tab baseada no período
    const getTabColor = (periodo: string, isActive: boolean) => {
        if (isActive) {
            switch (periodo) {
                case 'montagem':
                    return 'border-yellow-500 text-yellow-600 bg-yellow-50'
                case 'evento':
                    return 'border-green-500 text-green-600 bg-green-50'
                case 'desmontagem':
                    return 'border-purple-500 text-purple-600 bg-purple-50'
                default:
                    return 'border-purple-500 text-purple-600 bg-purple-50'
            }
        } else {
            switch (periodo) {
                case 'montagem':
                    return 'hover:text-yellow-700 hover:border-yellow-300'
                case 'evento':
                    return 'hover:text-green-700 hover:border-green-300'
                case 'desmontagem':
                    return 'hover:text-purple-700 hover:border-purple-300'
                default:
                    return 'hover:text-gray-700 hover:border-gray-300'
            }
        }
    }

    // Função para obter status badge
    const getStatusBadge = (empresa: Empresa) => {
        if (empresa.id_evento && Array.isArray(empresa.days) && empresa.days.length > 0) {
            return <Badge className="bg-green-100 text-green-800">Configurado</Badge>
        } else if (empresa.id_evento || (Array.isArray(empresa.days) && empresa.days.length > 0)) {
            return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>
        } else {
            return <Badge className="bg-gray-100 text-gray-800">Não configurado</Badge>
        }
    }

    if (!event || Array.isArray(event)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                </div>
            </div>
        )
    }

    return (
        <EventLayout eventId={eventId} eventName={eventName}>
            <div className="p-8">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total de Empresas</p>
                                    <p className="text-3xl font-bold">{stats.total}</p>
                                </div>
                                <Building className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Configuradas</p>
                                    <p className="text-3xl font-bold">{stats.configuradas}</p>
                                </div>
                                <Check className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Parcialmente</p>
                                    <p className="text-3xl font-bold">{stats.parcialmenteConfiguradas}</p>
                                </div>
                                <Calendar className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Não Configuradas</p>
                                    <p className="text-3xl font-bold">{stats.naoConfiguradas}</p>
                                </div>
                                <X className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Bar */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={() => {
                                    setFormData({
                                        nome: "",
                                        id_evento: eventId,
                                        days: []
                                    })
                                    setIsCreateDialogOpen(true)
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Empresa
                            </Button>

                            <Input
                                type="text"
                                placeholder="Buscar empresa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-80"
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs dos dias */}
                <div className="mb-8">
                    <div className="border-b border-gray-200 bg-white rounded-t-lg">
                        <nav className="-mb-px flex flex-wrap gap-1 px-4 py-2">
                            {availableDates.map((date) => {
                                const empresasInDay = empresasByDate[date.value]?.length || 0
                                const isActive = selectedDate === date.value

                                return (
                                    <button
                                        key={date.value}
                                        onClick={() => setSelectedDate(date.value)}
                                        className={`border-b-2 py-2 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                                            ? getTabColor(date.periodo, true)
                                            : `border-transparent text-gray-500 ${getTabColor(date.periodo, false)}`
                                            }`}
                                    >
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-medium">
                                                {date.label.split(' - ')[0]}
                                            </span>
                                            <span className="text-xs opacity-75">
                                                {date.periodo}
                                            </span>
                                            <span className="text-xs opacity-75">
                                                ({empresasInDay})
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                {/* Tabela de empresas */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Empresa
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Dias de Trabalho
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredEmpresasByDate[selectedDate]?.length > 0 ? (
                                    filteredEmpresasByDate[selectedDate].map((empresa) => (
                                        <tr key={empresa.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">

                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {empresa.nome}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {empresa.id.slice(0, 8)}...
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(empresa.days) && empresa.days.length > 0 ? (
                                                        empresa.days.slice(0, 3).map((day, index) => {
                                                            const date = new Date(day)
                                                            const dateStr = date.toLocaleDateString("pt-BR", {
                                                                day: "2-digit",
                                                                month: "2-digit",
                                                            })

                                                            // Encontrar o período da data
                                                            const availableDate = availableDates.find(d => d.value === day)
                                                            const periodo = availableDate?.periodo || ''

                                                            return (
                                                                <Badge
                                                                    key={index}
                                                                    variant="secondary"
                                                                    className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                                                                >
                                                                    {dateStr} - {periodo}
                                                                </Badge>
                                                            )
                                                        })
                                                    ) : (
                                                        <span className="text-sm text-gray-400 italic">Nenhum</span>
                                                    )}
                                                    {Array.isArray(empresa.days) && empresa.days.length > 3 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{empresa.days.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(empresa)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEditEmpresa(empresa)}
                                                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                                    >
                                                        <Edit className="w-4 h-4 mr-1" />
                                                        Editar
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-gray-600 border-gray-200 hover:bg-gray-50"
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem
                                                                onClick={() => copyPublicUrl(empresa)}
                                                                className="cursor-pointer"
                                                            >
                                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                                Copiar URL Pública
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteEmpresa(empresa)}
                                                                className="cursor-pointer text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Excluir
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <Building className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-lg font-semibold text-gray-700 mb-2">
                                                    {selectedDate ? `Nenhuma empresa encontrada para ${availableDates.find(d => d.value === selectedDate)?.label || selectedDate}` : 'Selecione um dia'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {selectedDate ? 'Crie uma nova empresa para este dia' : 'Escolha um dia do evento para ver as empresas'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Dialog de Criação */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900">
                        <DialogHeader>
                            <DialogTitle>Criar Nova Empresa</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateEmpresa} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome da Empresa *
                                </label>
                                <Input
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Digite o nome da empresa"
                                    required
                                />
                            </div>



                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dias de Trabalho
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                                    {availableDays.map((day) => (
                                        <Button
                                            key={day.value}
                                            type="button"
                                            variant={(formData.days || []).includes(day.value) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                const currentDays = formData.days || []
                                                const newDays = currentDays.includes(day.value)
                                                    ? currentDays.filter(d => d !== day.value)
                                                    : [...currentDays, day.value]
                                                setFormData({ ...formData, days: newDays })
                                            }}
                                            className="text-xs"
                                        >
                                            {day.label}
                                        </Button>
                                    ))}
                                </div>
                                {(formData.days || []).length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-600">
                                            Dias selecionados: {(formData.days || []).length}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsCreateDialogOpen(false)
                                        resetForm()
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!formData.nome || createEmpresaMutation.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {createEmpresaMutation.isPending ? "Criando..." : "Criar Empresa"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog de Edição */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900">
                        <DialogHeader>
                            <DialogTitle>Editar Empresa</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpdateEmpresa} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome da Empresa *
                                </label>
                                <Input
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Digite o nome da empresa"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Evento
                                </label>
                                <Select
                                    value={formData.id_evento}
                                    onValueChange={(value) => setFormData({ ...formData, id_evento: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um evento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.isArray(eventos) && eventos.map((evento: any) => (
                                            <SelectItem key={evento.id} value={evento.id}>
                                                {evento.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dias de Trabalho
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                                    {availableDays.map((day) => (
                                        <Button
                                            key={day.value}
                                            type="button"
                                            variant={(formData.days || []).includes(day.value) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                const currentDays = formData.days || []
                                                const newDays = currentDays.includes(day.value)
                                                    ? currentDays.filter(d => d !== day.value)
                                                    : [...currentDays, day.value]
                                                setFormData({ ...formData, days: newDays })
                                            }}
                                            className="text-xs"
                                        >
                                            {day.label}
                                        </Button>
                                    ))}
                                </div>
                                {(formData.days || []).length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-600">
                                            Dias selecionados: {(formData.days || []).length}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false)
                                        setSelectedEmpresa(null)
                                        resetForm()
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!formData.nome || updateEmpresaMutation.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {updateEmpresaMutation.isPending ? "Atualizando..." : "Atualizar Empresa"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}