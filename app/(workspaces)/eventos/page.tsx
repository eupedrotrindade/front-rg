/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, MapPin, Clock, Settings, ImageIcon, DoorOpen, MoreVertical, Edit, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import EventoEditDialog from "@/features/eventos/components/evento-edit-dialog"
import Image from "next/image"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useMemo } from 'react';
import { Event as EventType, PaginationParams } from "@/features/eventos/types"
import { useDeleteEvento } from "@/features/eventos/api/mutation/use-delete-evento"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import HeaderWorkspace from "@/components/layout/header-work"
import { SimpleEventDay } from "@/public/types/simple-event-days"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


const EventosPage = () => {
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(12)
    const [search, setSearch] = useState("")
    const [sortBy, setSortBy] = useState("name")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
    const [statusFilter, setStatusFilter] = useState<string>("all")

    const paginationParams: PaginationParams = {
        page,
        limit,
        search: search.trim() || undefined,
        sortBy,
        sortOrder
    }

    const { data: eventosResponse, isLoading } = useEventos(paginationParams)
    const router = useRouter()
    const [editingEvent, setEditingEvent] = useState<EventType | null>(null)
    const [deletingEvent, setDeletingEvent] = useState<EventType | null>(null)
    const { mutate: deleteEvento, isPending: isDeleting } = useDeleteEvento()

    // Processar dados da resposta
    const { eventos, pagination } = useMemo(() => {
        if (!eventosResponse) return { eventos: [], pagination: null }

        // Se for resposta paginada
        if (Array.isArray(eventosResponse)) {
            return { eventos: eventosResponse, pagination: null }
        }

        // Se for uma resposta com paginação
        if (typeof eventosResponse === 'object' && 'data' in eventosResponse) {
            return {
                eventos: (eventosResponse as any).data || [],
                pagination: (eventosResponse as any).pagination
            }
        }

        return { eventos: [], pagination: null }
    }, [eventosResponse])

    // Filtrar eventos localmente por status se necessário
    const filteredEventos = useMemo(() => {
        if (statusFilter === "all") return eventos
        return eventos.filter((evento: EventType) => evento.status === statusFilter)
    }, [eventos, statusFilter])

    const handleEventClick = (evento: EventType) => {
        router.push(`/eventos/${evento.id}`)
    }

    const handleDeleteEvent = (evento: EventType) => {
        setDeletingEvent(evento)
    }

    const confirmDelete = () => {
        if (!deletingEvent) return

        deleteEvento(
            {
                id: deletingEvent.id,
                performedBy: "current-user" // TODO: Pegar do contexto de autenticação
            },
            {
                onSuccess: () => {
                    toast.success("Evento excluído com sucesso!")
                    setDeletingEvent(null)
                },
                onError: (error) => {
                    console.error("Erro ao excluir evento:", error)
                    toast.error("Erro ao excluir evento. Tente novamente.")
                },
            }
        )
    }

    const formatDate = (date: string | Date | undefined) => {
        if (!date) return ""
        const dateObj = typeof date === "string" ? new Date(date) : date
        return dateObj.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
    }

    const formatDateRange = (startDate: string | Date | undefined, endDate: string | Date | undefined) => {
        if (!startDate && !endDate) return ""
        if (!endDate || startDate === endDate) return formatDate(startDate)
        return `${formatDate(startDate)} - ${formatDate(endDate)}`
    }

    // Função simplificada para exibir data do evento (sempre por turno)
    const getEventDateDisplay = (evento: EventType): string => {
        // Priorizar campos de data diretos
        if (evento.startDate) {
            if (evento.endDate && evento.startDate !== evento.endDate) {
                return formatDateRange(evento.startDate, evento.endDate)
            }
            return formatDate(evento.startDate)
        }

        // Fallback para preparationStartDate
        if (evento.preparationStartDate) {
            return formatDate(evento.preparationStartDate)
        }

        return 'Data a definir'
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "active":
                return { label: "Ativo", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" }
            case "draft":
                return { label: "Rascunho", className: "bg-amber-500/10 text-amber-700 border-amber-200" }
            case "completed":
                return { label: "Concluído", className: "bg-blue-500/10 text-blue-700 border-blue-200" }
            case "cancelled":
                return { label: "Cancelado", className: "bg-red-500/10 text-red-700 border-red-200" }
            default:
                return { label: status, className: "bg-gray-500/10 text-gray-700 border-gray-200" }
        }
    }

    // Handlers para paginação
    const handlePreviousPage = () => {
        setPage(prev => Math.max(1, prev - 1))
    }

    const handleNextPage = () => {
        if (pagination && page < pagination.totalPages) {
            setPage(prev => prev + 1)
        }
    }

    const handleLimitChange = (newLimit: string) => {
        setLimit(parseInt(newLimit))
        setPage(1) // Reset para primeira página
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-6"></div>
                    <p className="text-lg text-muted-foreground">Carregando seus eventos...</p>
                </div>
            </div>
        )
    }

    const hasEventos = Array.isArray(filteredEventos) && filteredEventos.length > 0

    return (
        <div className="min-h-screen">
            <HeaderWorkspace />
            <div className="container mx-auto px-4 py-8 space-y-8">
                {/* Header com Filtros */}
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm font-medium">
                            <Calendar className="h-4 w-4" />
                            Dashboard de Eventos
                        </div>
                    </div>

                    {/* Filtros e Pesquisa */}
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            {/* Pesquisa */}
                            <div className="flex-1 min-w-[250px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Pesquisar eventos..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Filtro por Status */}
                            <div className="min-w-[150px]">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="active">Ativo</SelectItem>
                                        <SelectItem value="draft">Rascunho</SelectItem>
                                        <SelectItem value="completed">Concluído</SelectItem>
                                        <SelectItem value="cancelled">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Ordenação */}
                            <div className="min-w-[150px]">
                                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                                    const [field, order] = value.split('-')
                                    setSortBy(field)
                                    setSortOrder(order as "asc" | "desc")
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Ordenar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name-asc">Nome A-Z</SelectItem>
                                        <SelectItem value="name-desc">Nome Z-A</SelectItem>
                                        <SelectItem value="startDate-desc">Mais Recente</SelectItem>
                                        <SelectItem value="startDate-asc">Mais Antigo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Itens por página */}
                            <div className="min-w-[100px]">
                                <Select value={limit.toString()} onValueChange={handleLimitChange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="6">6 por página</SelectItem>
                                        <SelectItem value="12">12 por página</SelectItem>
                                        <SelectItem value="24">24 por página</SelectItem>
                                        <SelectItem value="48">48 por página</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Estatísticas */}
                        {pagination && (
                            <div className="mt-4 text-sm text-gray-600">
                                Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, pagination.total)} de {pagination.total} eventos
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid de Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Card de Criação */}
                    <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 group" onClick={() => { window.location.href = `${window.origin}/eventos/criar` }}>
                        <CardContent className="flex flex-col items-center justify-center p-8 min-h-[500px] ">
                            <div className="rounded-full bg-purple-600 p-4 mb-6 group-hover:scale-110 transition-transform">
                                <Plus className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="font-bold text-xl mb-3 text-gray-800">Criar Novo Evento</h3>
                            <p className="text-sm text-gray-600 text-center leading-relaxed">
                                Comece um novo projeto e configure seu workspace personalizado
                            </p>
                        </CardContent>
                    </Card>

                    {/* Cards dos Eventos */}
                    {hasEventos &&
                        filteredEventos.map((evento) => {
                            const statusConfig = getStatusConfig(evento.status)
                            return (
                                <div
                                    key={evento.id}
                                    className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl group cursor-pointer relative"
                                    onClick={() => handleEventClick(evento)}
                                >
                                    {/* Badge de Status */}
                                    <div className="absolute top-4 left-4 z-10">
                                        <Badge className={statusConfig.className}>
                                            {statusConfig.label}
                                        </Badge>
                                    </div>

                                    {/* Menu de Ações */}
                                    <div className="absolute top-4 right-4 z-10">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm hover:bg-white"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreVertical className="h-4 w-4 text-gray-700" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/eventos/${evento.id}/editar`);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteEvent(evento);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Área da imagem */}
                                    <div className="relative bg-gradient-to-br from-purple-100 to-purple-200 aspect-square p-8">
                                        <div className="w-full h-full flex items-center justify-center">
                                            {evento.bannerUrl ? (
                                                <Image
                                                    src={evento.bannerUrl}
                                                    alt={evento.name}
                                                    width={300}
                                                    height={300}
                                                    className="object-contain max-w-full max-h-full rounded-md"
                                                />
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon className="h-16 w-16 text-purple-400 mx-auto mb-2" />
                                                    <span className="text-purple-600 text-sm">Sem imagem</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Logo RG no canto inferior direito */}
                                        <div className="absolute bottom-4 right-4">
                                            <div className="bg-white rounded-full px-3 py-1 shadow-sm">
                                                <span className="text-purple-700 text-xs font-bold">RG</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conteúdo inferior */}
                                    <div className="p-6">
                                        {/* Título e Descrição */}
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                                            {evento.name}
                                        </h3>

                                        {evento.description && (
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                {evento.description}
                                            </p>
                                        )}

                                        {/* Informações do Evento */}
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                <Calendar className="h-4 w-4" />
                                                <span>{getEventDateDisplay(evento)}</span>
                                            </div>

                                            {evento.venue && (
                                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                    <MapPin className="h-4 w-4" />
                                                    <span className="truncate">{evento.venue}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Botão de Ação */}
                                        <Button
                                            className="w-full bg-purple-700 hover:bg-purple-800 text-white"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEventClick(evento);
                                            }}
                                        >
                                            Acessar Evento
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                </div>

                {/* Paginação */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4">
                        <div className="text-sm text-gray-600">
                            Página {page} de {pagination.totalPages}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreviousPage}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Anterior
                            </Button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= pagination.totalPages - 2) {
                                        pageNum = pagination.totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={page === pageNum ? "default" : "outline"}
                                            size="sm"
                                            className="w-8 h-8 p-0"
                                            onClick={() => setPage(pageNum)}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextPage}
                                disabled={!pagination.hasNext}
                            >
                                Próxima
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>

                        <div className="text-sm text-gray-600">
                            Total: {pagination.total} eventos
                        </div>
                    </div>
                )}

                {/* Dialog de Edição */}
                {editingEvent && (
                    <EventoEditDialog
                        evento={editingEvent}
                        onClose={() => setEditingEvent(null)}
                    />
                )}

                {/* Dialog de Confirmação de Exclusão */}
                <AlertDialog open={!!deletingEvent} onOpenChange={(open) => !open && setDeletingEvent(null)}>
                    <AlertDialogContent className="bg-white text-black">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja excluir o evento &quot;{deletingEvent?.name}&quot;?
                                Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {isDeleting ? "Excluindo..." : "Excluir"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Estado vazio */}
                {!hasEventos && !isLoading && (
                    <div className="text-center py-16">
                        <div className="max-w-md mx-auto">
                            <div className="rounded-full bg-gradient-to-r from-purple-100 to-blue-100 p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                                <Calendar className="h-12 w-12 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-gray-800">
                                {search.trim() ? "Nenhum evento encontrado" : "Nenhum evento encontrado"}
                            </h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                {search.trim()
                                    ? "Tente ajustar os filtros de pesquisa ou criar um novo evento"
                                    : "Comece criando seu primeiro evento para acessar ferramentas de gestão e workspace personalizado"
                                }
                            </p>
                            {search.trim() && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearch("")
                                        setStatusFilter("all")
                                        setPage(1)
                                    }}
                                    className="mb-4"
                                >
                                    Limpar Filtros
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default EventosPage