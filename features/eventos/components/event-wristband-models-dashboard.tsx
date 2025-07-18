/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Eye, Search, Filter, Edit, Copy, Download, MoreHorizontal, X, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { HexColorPicker } from "react-colorful"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useEventWristbandModels } from '@/features/eventos/api/query/use-event-wristband-models';
import { useCreateEventWristbandModel } from '@/features/eventos/api/mutation/use-create-event-wristband-model';
import { useDeleteEventWristbandModel } from '@/features/eventos/api/mutation/use-delete-event-wristband-model';
import { useUpdateEventWristbandModel } from '@/features/eventos/api/mutation/use-update-event-wristband-model';
import { useEventos } from '@/features/eventos/api/query/use-eventos';

interface WristbandModel {
    id: string
    credentialType: string
    color: string
    status: "active" | "inactive"
    eventId: string
    eventName?: string
    createdAt?: string
    description?: string
}

interface CreateEventWristbandModelInput {
    credentialType: string
    color: string
    status: "active" | "inactive"
    eventId: string
    description?: string
}

interface Filters {
    search: string
    eventId: string
    status: string
    credentialType: string
}

const EventWristbandModelsDashboard = () => {
    const { data: models = [], isLoading, isError } = useEventWristbandModels();
    const createMutation = useCreateEventWristbandModel();
    const deleteMutation = useDeleteEventWristbandModel();
    const updateMutation = useUpdateEventWristbandModel();
    const { data: eventos = [], isLoading: loadingEventos } = useEventos();

    const [openCreate, setOpenCreate] = useState(false)
    const [openEdit, setOpenEdit] = useState<WristbandModel | null>(null)
    const [openDetails, setOpenDetails] = useState<WristbandModel | null>(null)
    const [selectedModels, setSelectedModels] = useState<string[]>([])
    const [showFilters, setShowFilters] = useState(false)

    const [form, setForm] = useState<CreateEventWristbandModelInput>({
        credentialType: "",
        color: "#FF6B6B",
        status: "active",
        eventId: "",
        description: "",
    })

    const [filters, setFilters] = useState<Filters>({
        search: "",
        eventId: "",
        status: "",
        credentialType: "",
    })

    const [colorPickerOpen, setColorPickerOpen] = useState(false)
    const [sortBy, setSortBy] = useState<"name" | "date" | "event">("date")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

    // Get unique credential types for filter
    const uniqueCredentialTypes = useMemo(() => {
        return Array.from(new Set(models.map((m: WristbandModel) => m.credentialType)))
    }, [models])

    // Filtered and sorted models
    const filteredModels = useMemo(() => {
        const filtered = models.filter((model: WristbandModel) => {
            const matchesSearch =
                model.credentialType.toLowerCase().includes(filters.search.toLowerCase()) ||
                (getEventName(model.eventId).toLowerCase().includes(filters.search.toLowerCase()))
            const matchesEvent = !filters.eventId || model.eventId === filters.eventId
            const matchesStatus = !filters.status || model.status === filters.status
            const matchesType = !filters.credentialType || model.credentialType === filters.credentialType

            return matchesSearch && matchesEvent && matchesStatus && matchesType
        })

        // Sort
        filtered.sort((a: WristbandModel, b: WristbandModel) => {
            let comparison = 0
            switch (sortBy) {
                case "name":
                    comparison = a.credentialType.localeCompare(b.credentialType)
                    break
                case "date":
                    comparison = new Date(a.createdAt || "").getTime() - new Date(b.createdAt || "").getTime()
                    break
                case "event":
                    comparison = getEventName(a.eventId).localeCompare(getEventName(b.eventId))
                    break
            }
            return sortOrder === "asc" ? comparison : -comparison
        })

        return filtered
    }, [models, filters, sortBy, sortOrder])

    const getEventName = (eventId: string) => eventos.find(ev => ev.id === eventId)?.name || eventId;

    const handleCreate = async () => {
        if (!form.credentialType || !form.color || !form.eventId) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }
        try {
            const payload: CreateEventWristbandModelInput = {
                eventId: form.eventId,
                credentialType: form.credentialType,
                status: form.status,
                color: form.color,
            };
            if (form.description && form.description.trim() !== "") {
                (payload as any).description = form.description;
            }
            await createMutation.mutateAsync(payload);
            setForm({ credentialType: "", color: "#FF6B6B", status: "active", eventId: "", description: "" });
            setOpenCreate(false);
            toast.success("Modelo criado com sucesso!");
        } catch {
            toast.error("Erro ao criar modelo");
        }
    };

    const handleEdit = async () => {
        if (!openEdit || !form.credentialType || !form.color || !form.eventId) {
            toast.error("Preencha todos os campos obrigatórios")
            return
        }

        try {
            await updateMutation.mutateAsync({ id: openEdit.id, ...form })
            setOpenEdit(null)
            toast.success("Modelo atualizado com sucesso!")
        } catch {
            toast.error("Erro ao atualizar modelo")
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteMutation.mutateAsync(id)
            toast.success("Modelo excluído com sucesso!")
        } catch {
            toast.error("Erro ao excluir modelo")
        }
    }

    const handleBulkDelete = async () => {
        if (selectedModels.length === 0) return

        try {
            // Replace with your actual bulk delete
            console.log("Bulk deleting:", selectedModels)
            setSelectedModels([])
            toast.success(`${selectedModels.length} modelos excluídos com sucesso!`)
        } catch {
            toast.error("Erro ao excluir modelos")
        }
    }

    const handleDuplicate = (model: WristbandModel) => {
        setForm({
            credentialType: `${model.credentialType} (Cópia)`,
            color: model.color,
            status: model.status,
            eventId: model.eventId,
            description: model.description || "",
        })
        setOpenCreate(true)
    }

    const handleExport = () => {
        const csvContent = [
            ["Tipo", "Cor", "Status", "Evento", "Data de Criação", "Descrição"],
            ...filteredModels.map((model: { credentialType: any; color: any; status: any; eventId: string; createdAt: any; description: any }) => [
                model.credentialType,
                model.color,
                model.status,
                getEventName(model.eventId),
                model.createdAt || "",
                model.description || "",
            ]),
        ]
            .map((row) => row.join(","))
            .join("\n")

        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "modelos-pulseira.csv"
        a.click()
        URL.revokeObjectURL(url)
        toast.success("Dados exportados com sucesso!")
    }

    const clearFilters = () => {
        setFilters({ search: "", eventId: "", status: "", credentialType: "" })
    }

    const openEditDialog = (model: WristbandModel) => {
        setForm({
            credentialType: model.credentialType,
            color: model.color,
            status: model.status,
            eventId: model.eventId,
            description: model.description || "",
        })
        setOpenEdit(model)
    }

    const activeFiltersCount = Object.values(filters).filter(Boolean).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>

                    <p className="text-muted-foreground">
                        {filteredModels.length} de {models.length} modelos
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {selectedModels.length > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir ({selectedModels.length})
                        </Button>
                    )}

                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className={activeFiltersCount > 0 ? "bg-primary/10" : ""}
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                    </Button>

                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Modelo
                            </Button>
                        </DialogTrigger>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Filtros</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={clearFilters}>
                                    Limpar
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Buscar</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por tipo ou evento..."
                                        value={filters.search}
                                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Evento</Label>
                                <Select value={filters.eventId} onValueChange={(val) => setFilters((f) => ({ ...f, eventId: val }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos os eventos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os eventos</SelectItem>
                                        {eventos.map((evento) => (
                                            <SelectItem key={evento.id} value={evento.id}>
                                                {evento.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={filters.status} onValueChange={(val) => setFilters((f) => ({ ...f, status: val }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos os status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os status</SelectItem>
                                        <SelectItem value="active">Ativo</SelectItem>
                                        <SelectItem value="inactive">Inativo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo de Credencial</Label>
                                <Select
                                    value={filters.credentialType}
                                    onValueChange={(val) => setFilters((f) => ({ ...f, credentialType: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos os tipos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os tipos</SelectItem>
                                        {uniqueCredentialTypes.map((type) => (
                                            <SelectItem key={String(type)} value={String(type)}>
                                                {String(type)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Label>Ordenar por:</Label>
                                <Select value={sortBy} onValueChange={(val: "name" | "date" | "event") => setSortBy(val)}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="date">Data</SelectItem>
                                        <SelectItem value="name">Nome</SelectItem>
                                        <SelectItem value="event">Evento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                                <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                                {sortOrder === "asc" ? "Crescente" : "Decrescente"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Models Grid */}
            {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Carregando modelos...</div>
            ) : isError ? (
                <div className="text-center text-destructive py-8">Erro ao carregar modelos</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredModels.length > 0 ? (
                        filteredModels.map((model: WristbandModel, idx: number) => (
                            <Card key={model.id || idx} className="relative group hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={selectedModels.includes(model.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedModels((prev) => [...prev, model.id])
                                                    } else {
                                                        setSelectedModels((prev) => prev.filter((id) => id !== model.id))
                                                    }
                                                }}
                                            />
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                                    style={{ backgroundColor: model.color }}
                                                />
                                                <h3 className="font-semibold text-lg">{model.credentialType}</h3>
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setOpenDetails(model as WristbandModel)}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Ver Detalhes
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openEditDialog(model as WristbandModel)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDuplicate(model as WristbandModel)}>
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Duplicar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete((model as WristbandModel).id)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Badge
                                            variant={model.status === "active" ? "default" : "secondary"}
                                            className={model.status === "active" ? "bg-green-500 text-white" : ""}
                                        >
                                            {model.status === "active" ? "Ativo" : "Inativo"}
                                        </Badge>
                                        <Badge variant="outline" style={{ backgroundColor: model.color + "20", color: model.color }}>
                                            {model.color}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Evento</p>
                                        <p className="text-sm">{getEventName(model.eventId)}</p>
                                    </div>

                                    {model.description && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{model.description}</p>
                                        </div>
                                    )}

                                    {model.createdAt && (
                                        <p className="text-xs text-muted-foreground">
                                            Criado em {new Date(model.createdAt).toLocaleDateString("pt-BR")}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                            {activeFiltersCount > 0
                                ? "Nenhum modelo encontrado com os filtros aplicados"
                                : "Nenhum modelo cadastrado"}
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog
                open={openCreate || !!openEdit}
                onOpenChange={(open) => {
                    if (!open) {
                        setOpenCreate(false)
                        setOpenEdit(null)
                        setForm({ credentialType: "", color: "#FF6B6B", status: "active", eventId: "", description: "" })
                    }
                }}
            >
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{openEdit ? "Editar Modelo de Credencial" : "Novo Modelo de Credencial"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="credentialType">Tipo da Credencial *</Label>
                            <Input
                                id="credentialType"
                                placeholder="Ex: VIP, STAFF, GENERAL"
                                value={form.credentialType}
                                onChange={(e) => setForm((f) => ({ ...f, credentialType: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cor *</Label>
                            <div className="flex gap-3 items-center">
                                <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                                            style={{ backgroundColor: form.color }}
                                            title="Escolher cor"
                                        />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3">
                                        <HexColorPicker color={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
                                    </PopoverContent>
                                </Popover>

                                <div className="flex-1">
                                    <Input
                                        placeholder="#FF6B6B"
                                        value={form.color}
                                        onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                                        maxLength={7}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="eventId">Evento *</Label>
                            <Select
                                value={form.eventId}
                                onValueChange={(val) => setForm((f) => ({ ...f, eventId: val }))}
                                disabled={loadingEventos}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um evento" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Eventos Disponíveis</SelectLabel>
                                        {eventos.map((evento) => (
                                            <SelectItem key={evento.id} value={evento.id}>
                                                {evento.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={form.status}
                                onValueChange={(val: "active" | "inactive") => setForm((f) => ({ ...f, status: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Ativo</SelectItem>
                                    <SelectItem value="inactive">Inativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                                id="description"
                                placeholder="Descrição opcional do modelo..."
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <Button
                            className="w-full"
                            onClick={openEdit ? handleEdit : handleCreate}
                            disabled={!form.credentialType || !form.color || !form.eventId}
                        >
                            {openEdit ? "Atualizar Modelo" : "Criar Modelo"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={!!openDetails} onOpenChange={() => setOpenDetails(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalhes do Modelo</DialogTitle>
                    </DialogHeader>

                    {openDetails && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                                    style={{ backgroundColor: openDetails.color }}
                                />
                                <div>
                                    <h3 className="font-semibold text-lg">{openDetails.credentialType}</h3>
                                    <p className="text-sm text-muted-foreground">{openDetails.color}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                    <p className="mt-1">
                                        <Badge variant={openDetails.status === "active" ? "default" : "secondary"}>
                                            {openDetails.status === "active" ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </p>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Evento</Label>
                                    <p className="mt-1">{getEventName(openDetails.eventId)}</p>
                                </div>
                            </div>

                            {openDetails.description && (
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                                    <p className="mt-1 text-sm">{openDetails.description}</p>
                                </div>
                            )}

                            {openDetails.createdAt && (
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
                                    <p className="mt-1 text-sm">
                                        {new Date(openDetails.createdAt).toLocaleDateString("pt-BR", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default EventWristbandModelsDashboard
