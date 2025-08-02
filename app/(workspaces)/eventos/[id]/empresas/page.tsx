/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Building, Users, FileText, Calendar } from "lucide-react"
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

    // Função para calcular os dias do evento com período
    const getEventDays = (event: Event): { label: string; value: string; periodo: string }[] => {
        if (!event.startDate || !event.endDate) return []

        // Parse datas dos períodos
        const parse = (d?: string) => d ? new Date(d) : undefined
        const setupStart = parse(event.setupStartDate)
        const setupEnd = parse(event.setupEndDate)
        const prepStart = parse(event.preparationStartDate)
        const prepEnd = parse(event.preparationEndDate)
        const eventStart = parse(event.startDate)
        const eventEnd = parse(event.endDate)
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
            } else if (prepStart && prepEnd && d >= prepStart && d <= prepEnd) {
                periodo = 'preparação'
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

    // Filtrar empresas por termo de pesquisa
    const filteredEmpresas = (empresas || []).filter(empresa =>
        empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (empresa.id_evento && empresa.id_evento.includes(searchTerm)) ||
        (Array.isArray(empresa.days) && empresa.days.some((day: string) => day.toLowerCase().includes(searchTerm.toLowerCase())))
    )

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

    const eventId = useParams().id as string
    const { data: event } = useEventos({ id: eventId })
    const eventName =
        Array.isArray(event)
            ? ""
            : event?.name || ""

    const resetForm = () => {
        setFormData({
            nome: "",
            id_evento: eventId, // Usar o ID do evento atual
            days: []
        })
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
    return (
        <EventLayout eventId={eventId} eventName={eventName}>
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
                        <p className="text-gray-600">Gerencie as empresas do evento</p>
                    </div>
                    <Button
                        onClick={() => {
                            // Garantir que o evento atual está selecionado
                            setFormData({
                                nome: "",
                                id_evento: eventId,
                                days: []
                            })
                            setIsCreateDialogOpen(true)
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Empresa
                    </Button>
                </div>

                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Buscar empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmpresas.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                            <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {searchTerm ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
                            </h3>
                            <p className="text-gray-600">
                                {searchTerm ? "Tente ajustar os filtros de busca" : "Comece criando sua primeira empresa"}
                            </p>
                        </div>
                    ) : (
                        filteredEmpresas.map((empresa) => (
                            <Card key={empresa.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">{empresa.nome}</CardTitle>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    ID: {empresa.id.slice(0, 8)}...
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditEmpresa(empresa)}
                                                className="h-8 w-8 p-0 hover:bg-purple-50"
                                            >
                                                <Edit className="h-4 w-4 text-purple-600" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteEmpresa(empresa)}
                                                className="h-8 w-8 p-0 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <div className="space-y-3">
                                        {/* Evento */}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">Evento:</span>
                                            {empresa.id_evento ? (
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {empresa.id_evento}
                                                </Badge>
                                            ) : (
                                                <span className="text-sm text-gray-400">Não definido</span>
                                            )}
                                        </div>

                                        {/* Dias de trabalho */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm text-gray-600">
                                                    Dias de trabalho ({Array.isArray(empresa.days) ? empresa.days.length : 0}):
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {Array.isArray(empresa.days) && empresa.days.length > 0 ? (
                                                    empresa.days.slice(0, 6).map((day, index) => {
                                                        // Converter YYYY-MM-DD para DD/MM
                                                        const date = new Date(day)
                                                        const dateStr = date.toLocaleDateString("pt-BR", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                        })
                                                        return (
                                                            <Badge
                                                                key={index}
                                                                variant="secondary"
                                                                className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                                                            >
                                                                {dateStr}
                                                            </Badge>
                                                        )
                                                    })
                                                ) : (
                                                    <span className="text-sm text-gray-400 italic">Nenhum dia definido</span>
                                                )}
                                                {Array.isArray(empresa.days) && empresa.days.length > 6 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        +{empresa.days.length - 6} mais
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status indicator */}
                                        <div className="pt-2 border-t border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${empresa.id_evento && Array.isArray(empresa.days) && empresa.days.length > 0
                                                            ? "bg-green-500"
                                                            : empresa.id_evento || (Array.isArray(empresa.days) && empresa.days.length > 0)
                                                                ? "bg-yellow-500"
                                                                : "bg-gray-400"
                                                            }`}
                                                    />
                                                    <span className="text-xs text-gray-600">
                                                        {empresa.id_evento && Array.isArray(empresa.days) && empresa.days.length > 0
                                                            ? "Configurado"
                                                            : empresa.id_evento || (Array.isArray(empresa.days) && empresa.days.length > 0)
                                                                ? "Parcialmente configurado"
                                                                : "Não configurado"}
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    <Building className="h-3 w-3 mr-1" />
                                                    Empresa
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
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
                                    Evento
                                </label>
                                <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-900">
                                        {Array.isArray(event) ? eventName : event?.name || "Evento atual"}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">
                                        {eventId}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Empresa será criada para este evento
                                </p>
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