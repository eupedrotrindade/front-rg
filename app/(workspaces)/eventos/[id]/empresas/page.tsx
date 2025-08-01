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

    const resetForm = () => {
        setFormData({
            nome: "",
            id_evento: "",
            days: []
        })
    }
    const eventId = useParams().id as string
    const { data: event } = useEventos({ id: eventId })
    const eventName =
        Array.isArray(event)
            ? ""
            : event?.name || ""
    return (
        <EventLayout eventId={eventId} eventName={eventName}>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Empresas
                            </h1>
                            <p className="text-gray-600">
                                Gerencie todas as empresas do sistema
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-blue-600">
                                <Building className="h-3 w-3 mr-1" />
                                {(empresas || []).length} empresas
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total de Empresas</p>
                                    <p className="text-3xl font-bold">{(empresas || []).length}</p>
                                </div>
                                <Building className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Com Evento</p>
                                    <p className="text-3xl font-bold">{(empresas || []).filter(e => e.id_evento).length}</p>
                                </div>
                                <Calendar className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Com Dias</p>
                                    <p className="text-3xl font-bold">{(empresas || []).filter(e => Array.isArray(e.days) && e.days.length > 0).length}</p>
                                </div>
                                <FileText className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Média Dias</p>
                                    <p className="text-3xl font-bold">
                                        {(empresas || []).length > 0
                                            ? Math.round((empresas || []).reduce((acc, e) => acc + (Array.isArray(e.days) ? e.days.length : 0), 0) / (empresas || []).length)
                                            : 0
                                        }
                                    </p>
                                </div>
                                <Users className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="Buscar empresas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => resetForm()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nova Empresa
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Nova Empresa</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateEmpresa} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Nome da Empresa *</label>
                                            <Input
                                                value={formData.nome}
                                                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">ID do Evento</label>
                                            <Select value={formData.id_evento} onValueChange={(value) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    id_evento: value,
                                                    days: [] // Limpar dias quando evento mudar
                                                }))
                                            }}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um evento" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.isArray(eventos) && eventos.length > 0 ? (
                                                        eventos.map((evento: any) => (
                                                            <SelectItem key={evento.id} value={evento.id}>
                                                                {evento.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : null}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Dias de Trabalho</label>
                                        {formData.id_evento ? (
                                            availableDays.length > 0 ? (
                                                <>
                                                    <div className="mb-2">
                                                        <p className="text-sm text-gray-600">
                                                            Evento selecionado tem {availableDays.length} dias disponíveis
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                        {availableDays.map((dayObj) => (
                                                            <div key={dayObj.value} className="flex items-center space-x-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={dayObj.value}
                                                                    checked={Array.isArray(formData.days) && formData.days.includes(dayObj.value)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setFormData(prev => ({ ...prev, days: [...(prev.days || []), dayObj.value] }))
                                                                        } else {
                                                                            setFormData(prev => ({ ...prev, days: (prev.days || []).filter(d => d !== dayObj.value) }))
                                                                        }
                                                                    }}
                                                                    className="rounded"
                                                                />
                                                                <label htmlFor={dayObj.value} className="text-sm">{dayObj.label}</label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-500">Selecione um evento para ver os dias disponíveis</p>
                                            )
                                        ) : (
                                            <p className="text-sm text-gray-500">Selecione um evento primeiro para ver os dias disponíveis</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2">
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
                                            disabled={createEmpresaMutation.isPending}
                                        >
                                            {createEmpresaMutation.isPending ? (
                                                <>
                                                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    Criando...
                                                </>
                                            ) : (
                                                "Criar Empresa"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Lista de Empresas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredEmpresas.length === 0 ? (
                            <div className="text-center py-8">
                                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">
                                    {searchTerm ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>ID Evento</TableHead>
                                        <TableHead>Dias</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEmpresas.map((empresa) => (
                                        <TableRow key={empresa.id}>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    {empresa.id.slice(0, 8)}...
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{empresa.nome}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    {empresa.id_evento || "-"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(empresa.days) && empresa.days.length > 0 ? (
                                                        empresa.days.map((day, index) => {
                                                            // Converter YYYY-MM-DD para DD/MM
                                                            const date = new Date(day)
                                                            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                                                            return (
                                                                <Badge key={index} variant="outline" className="text-xs">
                                                                    {dateStr}
                                                                </Badge>
                                                            )
                                                        })
                                                    ) : (
                                                        <span className="text-gray-500 text-sm">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditEmpresa(empresa)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteEmpresa(empresa)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Editar Empresa</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpdateEmpresa} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome da Empresa *</label>
                                    <Input
                                        value={formData.nome}
                                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">ID do Evento</label>
                                    <Select value={formData.id_evento} onValueChange={(value) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            id_evento: value,
                                            days: [] // Limpar dias quando evento mudar
                                        }))
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um evento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.isArray(eventos) && eventos.length > 0 ? (
                                                eventos.map((evento: any) => (
                                                    <SelectItem key={evento.id} value={evento.id}>
                                                        {evento.name}
                                                    </SelectItem>
                                                ))
                                            ) : null}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Dias de Trabalho</label>
                                {formData.id_evento ? (
                                    availableDays.length > 0 ? (
                                        <>
                                            <div className="mb-2">
                                                <p className="text-sm text-gray-600">
                                                    Evento selecionado tem {availableDays.length} dias disponíveis
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                {availableDays.map((dayObj) => (
                                                    <div key={dayObj.value} className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`edit-${dayObj.value}`}
                                                            checked={Array.isArray(formData.days) && formData.days.includes(dayObj.value)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFormData(prev => ({ ...prev, days: [...(prev.days || []), dayObj.value] }))
                                                                } else {
                                                                    setFormData(prev => ({ ...prev, days: (prev.days || []).filter(d => d !== dayObj.value) }))
                                                                }
                                                            }}
                                                            className="rounded"
                                                        />
                                                        <label htmlFor={`edit-${dayObj.value}`} className="text-sm">{dayObj.label}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-500">Selecione um evento para ver os dias disponíveis</p>
                                    )
                                ) : (
                                    <p className="text-sm text-gray-500">Selecione um evento primeiro para ver os dias disponíveis</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
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
                                    disabled={updateEmpresaMutation.isPending}
                                >
                                    {updateEmpresaMutation.isPending ? (
                                        <>
                                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Atualizando...
                                        </>
                                    ) : (
                                        "Atualizar Empresa"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}