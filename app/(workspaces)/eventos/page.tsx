/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, MapPin, Clock, Settings, ImageIcon, DoorOpen, MoreVertical, Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import EventoEditDialog from "@/features/eventos/components/evento-edit-dialog"
import Image from "next/image"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from 'react';
import { useUser } from "@clerk/nextjs";
import { Event as EventType } from "@/features/eventos/types"
import { useEffect } from 'react';
import { useDeleteEvento } from "@/features/eventos/api/mutation/use-delete-evento"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import HeaderWorkspace from "@/components/layout/header-work"
import { SimpleEventDay } from "@/public/types/simple-event-days"
import { formatEventDate, sortSimpleEventDays } from "@/lib/utils"


const EventosPage = () => {
    const { data: eventos, isLoading } = useEventos()
    const router = useRouter()
    const [editingEvent, setEditingEvent] = useState<EventType | null>(null)
    const [deletingEvent, setDeletingEvent] = useState<EventType | null>(null)
    const { mutate: deleteEvento, isPending: isDeleting } = useDeleteEvento()
    const { user } = useUser()

    // Definir título da página
    useEffect(() => {
        document.title = "Eventos - Painel Administrativo"
    }, [])

    // Controle de acesso baseado no metadata do Clerk
    const getUserRole = () => {
        return user?.publicMetadata?.role as string
    }

    const getUserEventos = () => {
        return user?.publicMetadata?.eventos as Array<{ id: string, role: string, nome_evento: string }>
    }

    const isAdmin = () => {
        return getUserRole() === "admin"
    }

    const isCoordenadorGeral = () => {
        return getUserRole() === "coordenador-geral"
    }

    const hasEventAccess = (eventoId: string) => {
        // Admin e coordenador-geral podem ver todos os eventos
        if (isAdmin() || isCoordenadorGeral()) return true

        const userEventos = getUserEventos()
        if (!userEventos || !Array.isArray(userEventos)) return true // fallback para usuários sem metadata

        return userEventos.some(evento => evento.id === eventoId)
    }

    const canAccessGeneralPanel = () => {
        // Apenas admin pode acessar o painel geral
        return isAdmin()
    }

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

    // Função para formatar dias flexíveis (nova estrutura) - suporta datetime
    const formatEventDays = (days: SimpleEventDay[] | null | undefined): string => {
        if (!days || !Array.isArray(days) || days.length === 0) return ""

        if (days.length === 1) {
            return formatDate(days[0].date)
        }

        // Ordenar datas (suporta tanto DD/MM/YYYY quanto ISO datetime)
        const sortedDays = days.map(day => {
            // Converter DD/MM/YYYY para Date (compatibilidade)
            if (day.date.includes('/')) {
                const [dayPart, month, year] = day.date.split('/');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(dayPart));
            }
            // Converter ISO datetime para Date
            return new Date(day.date);
        }).sort((a, b) => a.getTime() - b.getTime());

        const firstDate = formatDate(sortedDays[0]);
        const lastDate = formatDate(sortedDays[sortedDays.length - 1]);

        return `${firstDate} - ${lastDate}`
    }

    // Função para determinar se usar estrutura nova ou antiga
    const getEventDaysDisplay = (evento: EventType) => {
        // Verificar se tem estrutura nova
        const hasNewStructure = (evento as any).montagem || (evento as any).evento || (evento as any).desmontagem;

        if (hasNewStructure) {
            // Função auxiliar para parse de arrays que podem ser strings JSON
            const parseEventDays = (data: any) => {
                if (Array.isArray(data)) {
                    return data;
                } else if (typeof data === 'string' && data.trim().startsWith('[')) {
                    try {
                        return JSON.parse(data);
                    } catch {
                        return [];
                    }
                }
                return [];
            };

            return {
                montagem: parseEventDays((evento as any).montagem),
                evento: parseEventDays((evento as any).evento),
                desmontagem: parseEventDays((evento as any).desmontagem)
            };
        }

        // Usar estrutura antiga como fallback
        return null;
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-800 mx-auto mb-6"></div>
                    <p className="text-lg text-muted-foreground">Carregando seus eventos...</p>
                </div>
            </div>
        )
    }

    const hasEventos = Array.isArray(eventos) && eventos.length > 0

    const eventosOrdenados = hasEventos
        ? [...(eventos as EventType[])]
            .filter(evento => hasEventAccess(evento.id)) // Filtrar eventos baseado no acesso do usuário
            .sort((a, b) => {
                const aDate = new Date(a.createdAt ?? a.startDate ?? 0).getTime()
                const bDate = new Date(b.createdAt ?? b.startDate ?? 0).getTime()
                return bDate - aDate
            })
        : []

    return (
        <div className="min-h-screen">
            <HeaderWorkspace />
            <div className="container mx-auto px-4 py-8 space-y-8 justify-center flex flex-col">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        Dashboard de Eventos
                    </div>




                </div>
                {canAccessGeneralPanel() && (
                    <div className="w-full flex flex-col justify-center items-center">
                        <Button className="hover:bg-purple-900 bg-purple-800" onClick={() => { window.location.href = "/admin/eventos" }}>
                            Acessar Painel Geral
                        </Button>
                    </div>
                )}
                {/* Grid de Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Card de Criação */}
                    {canAccessGeneralPanel() && (<Card className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 group" onClick={() => { window.location.href = `${window.origin}/eventos/criar` }}>
                        <CardContent className="flex flex-col items-center justify-center p-6 min-h-[360px] ">
                            <div className="rounded-full bg-purple-800 p-4 mb-6 group-hover:scale-110 transition-transform">
                                <Plus className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="font-bold text-xl mb-3 text-gray-800">Criar Novo Evento</h3>
                            <p className="text-sm text-gray-600 text-center leading-relaxed">
                                Comece um novo projeto e configure seu workspace personalizado
                            </p>
                        </CardContent>
                    </Card>)}

                    {/* Cards dos Eventos */}
                    {hasEventos &&
                        eventosOrdenados.map((evento) => {
                            const statusConfig = getStatusConfig(evento.status)
                            return (
                                <div
                                    key={evento.id}
                                    className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl group cursor-pointer"
                                    onClick={() => handleEventClick(evento)}
                                >
                                    {/* Área da imagem com fundo roxo */}
                                    <div className="relative bg-transparent aspect-square p-8">
                                        {canAccessGeneralPanel() && (<div className="absolute top-4 right-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 bg-purple-800 backdrop-blur-sm text-black border-0 "
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreVertical className="h-4 w-4" color="white" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 border border-gray-200 bg-white">
                                                    <DropdownMenuItem
                                                        className="cursor-pointer "
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/eventos/${evento.id}/editar`);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    {/* <DropdownMenuItem
                                                        className="cursor-pointer bg-red-500 text-white rounded-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteEvent(evento);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Excluir
                                                    </DropdownMenuItem> */}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>)}

                                        <div className="w-full h-full flex items-center justify-center">
                                            {evento.bannerUrl ? (
                                                <Image
                                                    src={evento.bannerUrl}
                                                    alt={evento.name}
                                                    width={400}
                                                    height={400}
                                                    className="object-contain max-w-full max-h-full rounded-md"
                                                />
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon className="h-16 w-16 text-black/70 mx-auto mb-2" />
                                                    <span className="text-black/70 text-sm">Sem imagem</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Hashtag no topo */}
                                        <div className="absolute top-4 left-4">
                                            <span className="text-purple-700 text-sm font-semibold">#RGFazAcontecer!</span>
                                        </div>

                                        {/* Logo RG no canto inferior direito */}
                                        <div className="absolute bottom-4 right-4">
                                            <div className="bg-white rounded-full px-3 py-1">
                                                <span className="text-purple-700 text-xs font-bold">RG</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conteúdo inferior */}
                                    <div className="p-6 text-center">
                                        {/* Título */}
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                                            {evento.name}
                                        </h3>

                                        {/* Data */}
                                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-4">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {(() => {
                                                    // ✅ CORREÇÃO: Usar formatEventDate do utils para evitar problemas de fuso horário
                                                    const eventDays = getEventDaysDisplay(evento);
                                                    if (eventDays?.evento && eventDays.evento.length > 0) {
                                                        const ordered = sortSimpleEventDays(eventDays.evento as SimpleEventDay[]);
                                                        const firstDay = ordered[0];
                                                        const lastDay = ordered[ordered.length - 1];

                                                        if (eventDays.evento.length === 1) {
                                                            // Uma só data
                                                            return formatEventDate(firstDay.date);
                                                        } else {
                                                            // Range de datas
                                                            return `${formatEventDate(firstDay.date)} - ${formatEventDate(lastDay.date)}`;
                                                        }
                                                    }
                                                    if (evento.preparationStartDate) {
                                                        // Usar formatEventDate que já trata corretamente os fusos horários
                                                        return formatEventDate(evento.preparationStartDate);
                                                    }
                                                    return 'Data a definir';
                                                })()}
                                            </span>
                                        </div>

                                        {/* Botão */}
                                        <Button
                                            className="bg-purple-700 hover:bg-purple-800 text-white px-8 py-2 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEventClick(evento);
                                            }}
                                        >
                                            Acessar
                                        </Button>
                                    </div>
                                </div>
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
                    <AlertDialogContent className="bg-white text-black max-h-[80vh] overflow-y-auto">
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
                                <Calendar className="h-12 w-12 text-purple-800" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-gray-800">Nenhum evento encontrado</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Comece criando seu primeiro evento para acessar ferramentas de gestão e workspace personalizado
                            </p>

                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default EventosPage
