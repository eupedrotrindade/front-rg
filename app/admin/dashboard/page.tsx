/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useEventHistories } from "@/features/eventos/api/query/use-event-histories"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  MapPin,
  Settings,
  Users,
  UserCheck,
  Shield,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  UserMinus,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  Database,
  FileText,
  Globe
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Event as EventType, EventHistory, PaginationParams } from "@/features/eventos/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { EventConfigModal } from './components/event-config-modal'
import { SystemHistoryDashboard } from './components/system-history-dashboard'
import { UsersManagement } from './components/users-management'
import { OperatorsManagement } from './components/operators-management'

const AdminDashboard = () => {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState("overview")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

  const router = useRouter()

  const paginationParams: PaginationParams = {
    page,
    limit,
    search: search.trim() || undefined,
    sortBy: "startDate",
    sortOrder: "desc"
  }

  const { data: eventosResponse, isLoading } = useEventos(paginationParams)
  const { data: systemHistoryResponse, isLoading: isHistoryLoading } = useEventHistories({
    page: 1,
    limit: 10,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  })

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
    return eventos.filter((evento: EventType) => evento.status === statusFilter)
  }, [eventos, statusFilter])

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

  const handleEventConfig = (evento: EventType) => {
    setSelectedEvent(evento)
    setIsConfigModalOpen(true)
  }

  const handleEventView = (evento: EventType) => {
    router.push(`/eventos/${evento.id}`)
  }

  const handleEventEdit = (evento: EventType) => {
    router.push(`/eventos/${evento.id}/editar`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-6"></div>
              <p className="text-lg text-muted-foreground">Carregando dashboard administrativo...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const recentActivities = systemHistoryResponse?.data?.slice(0, 5) || []
  const totalUsers = 0 // Será implementado com Clerk
  const totalOperators = 0 // Será implementado com API

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
              <p className="text-gray-600 mt-2">Gerencie eventos, usuários, operadores e sistema</p>
              {user && (
                <p className="text-sm text-gray-500 mt-1">
                  Conectado como: {user.firstName} {user.lastName} ({user.emailAddresses[0]?.emailAddress})
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Eventos</p>
                  <p className="text-2xl font-bold text-gray-900">{pagination?.total || eventos.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Eventos Ativos</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {eventos.filter((e: { status: string }) => e.status === 'active').length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuários</p>
                  <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Operadores</p>
                  <p className="text-2xl font-bold text-orange-600">{totalOperators}</p>
                </div>
                <Settings className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Atividades Hoje</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {systemHistoryResponse?.pagination?.total || 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sistema</p>
                  <p className="text-2xl font-bold text-green-600">Online</p>
                </div>
                <Globe className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Navegação */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="operators">Operadores</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Atividades Recentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Atividades Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-600">{activity.entityType} - {activity.performedBy}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentActivities.length === 0 && (
                      <p className="text-gray-500 text-center py-4">Nenhuma atividade recente</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Métricas do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Eventos Ativos</span>
                      <span className="font-semibold">{eventos.filter((e: { status: string }) => e.status === 'active').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total de Usuários</span>
                      <span className="font-semibold">{totalUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Operadores Ativos</span>
                      <span className="font-semibold">{totalOperators}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Atividades Hoje</span>
                      <span className="font-semibold">{systemHistoryResponse?.pagination?.total || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            {/* Filtros */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 items-center">
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

                  <div className="min-w-[150px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Mais filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Eventos */}
            <Card>
              <CardHeader>
                <CardTitle>Eventos do Sistema</CardTitle>
                <CardDescription>
                  Gerencie todos os eventos, operadores e configurações específicas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredEventos.map((evento: any) => {
                    const statusConfig = getStatusConfig(evento.status)

                    return (
                      <div
                        key={evento.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900">{evento.name}</h3>
                              <Badge className={statusConfig.className}>
                                {statusConfig.label}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(evento.startDate)}</span>
                              </div>

                              {evento.venue && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{evento.venue}</span>
                                </div>
                              )}

                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>Participantes: --</span>
                              </div>
                            </div>

                            {evento.description && (
                              <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                                {evento.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEventConfig(evento)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Configurar
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEventView(evento)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEventEdit(evento)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEventConfig(evento)}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Configurações Avançadas
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {filteredEventos.length === 0 && !isLoading && (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum evento encontrado
                      </h3>
                      <p className="text-gray-600">
                        {search.trim()
                          ? "Tente ajustar os filtros de pesquisa"
                          : "Não há eventos cadastrados no sistema"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="operators">
            <OperatorsManagement />
          </TabsContent>

          <TabsContent value="system">
            <SystemHistoryDashboard />
          </TabsContent>
        </Tabs>

        {/* Modal de Configurações */}
        {selectedEvent && (
          <EventConfigModal
            evento={selectedEvent}
            open={isConfigModalOpen}
            onOpenChange={setIsConfigModalOpen}
          />
        )}
      </div>
    </div>
  )
}

export default AdminDashboard