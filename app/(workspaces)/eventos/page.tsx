"use client"

import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, MapPin, Clock, Settings, ImageIcon, DoorOpen, MoreVertical, Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import EventoCreateDialog from "@/features/eventos/components/evento-create-dialog"
import EventoEditDialog from "@/features/eventos/components/evento-edit-dialog"
import Image from "next/image"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from 'react';
import { Event as EventType } from "@/features/eventos/types"
import { useDeleteEvento } from "@/features/eventos/api/mutation/use-delete-evento"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import HeaderWorkspace from "@/components/layout/header-work"

export interface Event {
    id: string
    slug?: string
    name: string
    description?: string
    bannerUrl?: string
    totalDays?: number
    startDate?: string | Date
    endDate?: string | Date
    setupStartDate?: string | Date
    setupEndDate?: string | Date
    preparationStartDate?: string | Date
    preparationEndDate?: string | Date
    finalizationStartDate?: string | Date
    finalizationEndDate?: string | Date
    venue?: string
    address?: string
    status: string
    visibility?: string
    categories?: string[]
    capacity?: number
    registrationLink?: string
    qrCodeTemplate?: "default" | "custom"
    isActive?: boolean
    createdAt?: string | Date
    updatedAt?: string | Date
}

const EventosPage = () => {
    const { data: eventos, isLoading } = useEventos()
    const router = useRouter()
    const [editingEvent, setEditingEvent] = useState<EventType | null>(null)
    const [deletingEvent, setDeletingEvent] = useState<EventType | null>(null)
    const { mutate: deleteEvento, isPending: isDeleting } = useDeleteEvento()

    const handleEventClick = (evento: EventType) => {
        router.push(`/eventos/${evento.id}`)
    }

    const handleCreateEvent = () => {
        router.push("/eventos/criar")
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

    const hasEventos = Array.isArray(eventos) && eventos.length > 0

    return (
        <div className="min-h-screen">
            <HeaderWorkspace />
            <div className="container mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        Dashboard de Eventos
                    </div>
                    <h1 className="text-4xl font-bold text-purple-950">
                        Meus Eventos
                    </h1>
                    <p className="text-lg text-purple-800 max-w-2xl mx-auto">
                        Gerencie seus eventos, acesse workspaces e acompanhe o progresso de cada projeto
                    </p>
                </div>

                {/* Grid de Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Card de Criação */}
                    <EventoCreateDialog />

                    {/* Cards dos Eventos */}
                    {hasEventos &&
                        eventos.map((evento) => {
                            const statusConfig = getStatusConfig(evento.status)
                            return (
                                <Card
                                    key={evento.id}
                                    className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group bg-white border-0 shadow-md hover:shadow-purple-200/50 overflow-hidden"
                                    onClick={() => handleEventClick(evento)}
                                >
                                    {/* Banner/Header do Card */}
                                    <div className="relative h-32 bg-gradient-to-r from-purple-400 via-purple-500 to-blue-500 overflow-hidden">
                                        {evento.bannerUrl ? (
                                            <Image
                                                src={evento.bannerUrl}
                                                alt={evento.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                width={1000}
                                                height={1000}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="h-12 w-12 text-white/70" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 flex items-center gap-2">
                                            <Badge className={`${statusConfig.className} border font-medium bg-emerald-300 text-emerald-900`}>{statusConfig.label}</Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 bg-white  text-black border-0"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem
                                                        className="cursor-pointer bg-white"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingEvent(evento);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer bg-red-500 text-white "
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
                                        {evento.totalDays && (
                                            <div className="absolute top-3 left-3">
                                                <Badge className="bg-white text-black border-white/30">{evento.totalDays} dias</Badge>
                                            </div>
                                        )}
                                    </div>

                                    <CardHeader className="pb-3">
                                        <CardTitle className="line-clamp-2 group-hover:text-purple-600 transition-colors text-lg">
                                            {evento.name}
                                        </CardTitle>
                                        {evento.description && (
                                            <CardDescription className="line-clamp-2 text-sm">{evento.description}</CardDescription>
                                        )}
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        {/* Informações principais */}
                                        <div className="space-y-3">
                                            {evento.venue && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <MapPin className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                                    <span className="truncate font-medium">{evento.venue}</span>
                                                </div>
                                            )}


                                        </div>

                                        {/* Seção de Datas */}
                                        <div className="space-y-2 pt-2 border-t border-gray-100">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cronograma</h4>


                                            {(evento.setupStartDate || evento.setupEndDate) && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Settings className="h-3 w-3 text-orange-500 flex-shrink-0" />
                                                    <span className="text-gray-700 font-medium">Montagem:</span>
                                                    <span className="text-gray-600 text-xs">
                                                        {formatDateRange(evento.setupStartDate, evento.setupEndDate)}
                                                    </span>
                                                </div>
                                            )}
                                            {(evento.preparationStartDate || evento.preparationEndDate) && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                                    <span className="text-gray-700 font-medium">Evento:</span>
                                                    <span className="text-gray-600 text-xs">
                                                        {formatDateRange(evento.preparationStartDate, evento.preparationEndDate)}
                                                    </span>
                                                </div>
                                            )}
                                            {(evento.finalizationStartDate || evento.finalizationEndDate) && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <DoorOpen className="h-3 w-3 text-red-500 flex-shrink-0" />
                                                    <span className="text-gray-700 font-medium">Desmontagem:</span>
                                                    <span className="text-gray-600 text-xs">
                                                        {formatDateRange(evento.finalizationStartDate, evento.finalizationEndDate)}
                                                    </span>
                                                </div>
                                            )}

                                        </div>

                                        {/* Categorias */}
                                        {evento.categories && evento.categories.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-2">
                                                {evento.categories.slice(0, 2).map((category, index) => (
                                                    <Badge
                                                        key={index}
                                                        variant="secondary"
                                                        className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200"
                                                    >
                                                        {category}
                                                    </Badge>
                                                ))}
                                                {evento.categories.length > 2 && (
                                                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                                        +{evento.categories.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                </div>

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
                            <h3 className="text-2xl font-bold mb-4 text-gray-800">Nenhum evento encontrado</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Comece criando seu primeiro evento para acessar ferramentas de gestão e workspace personalizado
                            </p>
                            <Button
                                onClick={handleCreateEvent}
                                size="lg"
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Criar Primeiro Evento
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default EventosPage
