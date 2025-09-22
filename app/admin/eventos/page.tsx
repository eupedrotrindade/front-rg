/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo } from 'react'
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Settings,
  Plus,
  Download,
  Upload,
  Trash2,
  Copy,
  Archive,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3
} from "lucide-react"
import { useRouter } from "next/navigation"

import { toast } from "sonner"
import { EventConfigModal } from '../components/event-config-modal'
import { Event } from '@/app/utils/interfaces/eventos'

const AdminEventosPage = () => {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState("startDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false)



  const { data: eventosResponse, isLoading } = useEventos()

  const { eventos, pagination } = useMemo(() => {
    if (!eventosResponse) return { eventos: [], pagination: null }

    if (Array.isArray(eventosResponse)) {
      return { eventos: eventosResponse, pagination: null }
    }

    if (typeof eventosResponse === 'object' && 'data' in eventosResponse) {
      return {
        eventos: (eventosResponse as any).data || [],
        pagination: (eventosResponse as any).pagination
      }
    }

    return { eventos: [], pagination: null }
  }, [eventosResponse])

  const filteredEventos = useMemo(() => {
    if (statusFilter === "all") return eventos
    return eventos.filter((evento: Event) => evento.status === statusFilter)
  }, [eventos, statusFilter])

  const stats = useMemo(() => {
    const total = eventos.length
    const active = eventos.filter((e: { status: string }) => e.status === 'active').length
    const draft = eventos.filter((e: { status: string }) => e.status === 'draft').length
    const completed = eventos.filter((e: { status: string }) => e.status === 'completed').length
    const cancelled = eventos.filter((e: { status: string }) => e.status === 'cancelled').length

    return { total, active, draft, completed, cancelled }
  }, [eventos])

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Data a definir"
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { label: "Ativo", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CheckCircle }
      case "draft":
        return { label: "Rascunho", className: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Edit }
      case "completed":
        return { label: "Concluído", className: "bg-blue-500/10 text-blue-700 border-blue-200", icon: CheckCircle }
      case "cancelled":
        return { label: "Cancelado", className: "bg-red-500/10 text-red-700 border-red-200", icon: XCircle }
      default:
        return { label: status, className: "bg-gray-500/10 text-gray-700 border-gray-200", icon: Clock }
    }
  }

  const handleEventConfig = (evento: Event) => {
    setSelectedEvent(evento)
    setIsConfigModalOpen(true)
  }

  const handleEventView = (evento: Event) => {
    router.push(`/eventos/${evento.id}`)
  }

  const handleEventEdit = (evento: Event) => {
    router.push(`/eventos/${evento.id}/editar`)
  }

  const handleEventDetails = (evento: Event) => {
    setSelectedEvent(evento)
    setEventDetailsOpen(true)
  }

  const handleDuplicateEvent = (evento: Event) => {
    // Implementar duplicação de evento
    toast.success(`Evento "${evento.name}" duplicado com sucesso`)
  }

  const handleArchiveEvent = (evento: Event) => {
    // Implementar arquivamento de evento
    toast.success(`Evento "${evento.name}" arquivado com sucesso`)
  }

  const handleDeleteEvent = (evento: Event) => {
    // Implementar exclusão de evento
    toast.success(`Evento "${evento.name}" excluído com sucesso`)
  }

  const handleExportEvents = () => {
    // Implementar exportação
    toast.success("Exportação iniciada. Você receberá um email quando estiver pronta.")
  }

  const handleImportEvents = () => {
    // Implementar importação
    toast.info("Funcionalidade de importação em desenvolvimento")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Eventos</h1>
          <p className="text-gray-600 mt-2">Administre todos os eventos do sistema</p>
        </div>
        <div className="flex gap-2">

        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ativos</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rascunhos</p>
                <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
              </div>
              <Edit className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelados</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

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
                <SelectItem value="createdAt-desc">Criado Recentemente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={limit.toString()} onValueChange={(value) => {
              setLimit(parseInt(value))
              setPage(1)
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="15">15 por página</SelectItem>
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Eventos</CardTitle>
          <CardDescription>
            Todos os eventos registrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Participantes</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando eventos...
                  </TableCell>
                </TableRow>
              ) : filteredEventos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum evento encontrado
                      </h3>
                      <p className="text-gray-600">
                        {search.trim() || statusFilter !== "all"
                          ? "Tente ajustar os filtros de pesquisa"
                          : "Crie seu primeiro evento para começar"
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEventos.map((evento: Event) => {
                  const statusConfig = getStatusConfig(evento.status)
                  const StatusIcon = statusConfig.icon

                  return (
                    <TableRow key={evento.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{evento.name}</p>
                            <p className="text-sm text-gray-500 truncate max-w-[200px]">
                              {evento.description || "Sem descrição"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(evento.startDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {evento.venue ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="truncate max-w-[150px]">{evento.venue}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Não definido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{evento.capacity || "Ilimitado"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {formatDate(evento.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEventEdit(evento)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar Evento
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteEvent(evento)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir Evento
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Página {page} de {pagination.totalPages} ({pagination.total} eventos)
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => prev + 1)}
              disabled={!pagination.hasNext}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Configurações */}
      {selectedEvent && (
        <EventConfigModal
          evento={{
            ...selectedEvent,
            setupStartDate: typeof selectedEvent.setupStartDate === 'string'
              ? selectedEvent.setupStartDate
              : selectedEvent.setupStartDate?.toISOString(),
            setupEndDate: typeof selectedEvent.setupEndDate === 'string'
              ? selectedEvent.setupEndDate
              : selectedEvent.setupEndDate?.toISOString(),
          }}
          open={isConfigModalOpen}
          onOpenChange={setIsConfigModalOpen}
        />
      )}

      {/* Modal de Detalhes */}
      <Dialog open={eventDetailsOpen} onOpenChange={setEventDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
            <DialogDescription>
              Informações completas do evento selecionado
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nome</label>
                  <p className="font-medium">{selectedEvent.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusConfig(selectedEvent.status).className}>
                      {getStatusConfig(selectedEvent.status).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Data de Início</label>
                  <p className="font-medium">{formatDate(selectedEvent.startDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Data de Fim</label>
                  <p className="font-medium">{formatDate(selectedEvent.endDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Local</label>
                  <p className="font-medium">{selectedEvent.venue || "Não definido"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Capacidade</label>
                  <p className="font-medium">{selectedEvent.capacity || "Ilimitado"}</p>
                </div>
              </div>

              {selectedEvent.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Descrição</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">
                    {selectedEvent.description}
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

export default AdminEventosPage