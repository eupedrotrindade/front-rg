'use client'

import React, { useState, useMemo } from 'react'
import { useEventHistories } from "@/features/eventos/api/query/use-event-histories"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  Database,
  Clock,
  Eye,
  Download,
  RefreshCw,
  FileText,
  BarChart3,
  Server,
  Code,
  Monitor,
  Globe,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Trash2,
  Edit,
  Plus,
  TrendingUp,
  Shield
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format, parseISO, isToday, isYesterday, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { EventHistory } from "@/features/eventos/types"

// Configuração de cores e ícones por tipo de entidade
const ENTITY_CONFIG = {
  event: { color: "bg-blue-500", icon: Calendar, label: "Evento" },
  participant: { color: "bg-green-500", icon: User, label: "Participante" },
  manager: { color: "bg-purple-500", icon: User, label: "Gerente" },
  staff: { color: "bg-orange-500", icon: User, label: "Staff" },
  wristband: { color: "bg-pink-500", icon: Activity, label: "Pulseira" },
  wristband_model: { color: "bg-pink-400", icon: Activity, label: "Modelo Pulseira" },
  vehicle: { color: "bg-gray-500", icon: Server, label: "Veículo" },
  attendance: { color: "bg-cyan-500", icon: CheckCircle, label: "Presença" },
  operator: { color: "bg-indigo-500", icon: User, label: "Operador" },
  coordinator: { color: "bg-yellow-500", icon: User, label: "Coordenador" },
  company: { color: "bg-red-500", icon: Database, label: "Empresa" },
  credential: { color: "bg-teal-500", icon: FileText, label: "Credencial" },
  movement_credential: { color: "bg-teal-400", icon: FileText, label: "Mov. Credencial" },
  radio: { color: "bg-violet-500", icon: Zap, label: "Rádio" },
  import_request: { color: "bg-amber-500", icon: Download, label: "Importação" },
} as const

// Configuração de cores para ações
const ACTION_CONFIG = {
  created: { color: "bg-green-100 text-green-800", icon: Plus },
  updated: { color: "bg-blue-100 text-blue-800", icon: Edit },
  deleted: { color: "bg-red-100 text-red-800", icon: Trash2 },
  status_updated: { color: "bg-purple-100 text-purple-800", icon: RefreshCw },
  check_in: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  check_out: { color: "bg-orange-100 text-orange-800", icon: XCircle },
  recorded: { color: "bg-cyan-100 text-cyan-800", icon: Activity },
} as const

export const SystemHistoryDashboard = () => {
  const [filters, setFilters] = useState({
    search: '',
    entityType: 'all',
    action: 'all',
    performedBy: '',
    startDate: '',
    endDate: '',
  })

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    sortBy: 'timestamp',
    sortOrder: 'desc' as 'asc' | 'desc',
  })

  const [selectedActivity, setSelectedActivity] = useState<EventHistory | null>(null)
  const [activityDetailsOpen, setActivityDetailsOpen] = useState(false)

  // Query para buscar histórico
  const { data: historyResponse, isLoading, refetch } = useEventHistories({
    ...pagination,
  })

  // Processar dados
  const { activities, paginationInfo } = useMemo(() => {
    if (!historyResponse) return { activities: [], paginationInfo: null }

    return {
      activities: historyResponse.data || [],
      paginationInfo: historyResponse.pagination
    }
  }, [historyResponse])

  // Estatísticas
  const stats = useMemo(() => {
    const today = activities.filter(a => isToday(new Date(a.timestamp)))
    const thisWeek = activities.filter(a => {
      const date = new Date(a.timestamp)
      return date >= startOfWeek(new Date()) && date <= endOfWeek(new Date())
    })

    const byEntityType = activities.reduce((acc, activity) => {
      acc[activity.entityType] = (acc[activity.entityType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byAction = activities.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: paginationInfo?.total || 0,
      today: today.length,
      thisWeek: thisWeek.length,
      byEntityType,
      byAction
    }
  }, [activities, paginationInfo])

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)

    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm')}`
    }

    if (isYesterday(date)) {
      return `Ontem às ${format(date, 'HH:mm')}`
    }

    return format(date, "dd 'de' MMM 'às' HH:mm", { locale: ptBR })
  }

  const getEntityConfig = (entityType: keyof typeof ENTITY_CONFIG) => {
    return ENTITY_CONFIG[entityType] || {
      color: "bg-gray-500",
      icon: Database,
      label: entityType
    }
  }

  const getActionConfig = (action: string) => {
    const key = action.toLowerCase().replace(/\s+/g, '_') as keyof typeof ACTION_CONFIG
    return ACTION_CONFIG[key] || {
      color: "bg-gray-100 text-gray-800",
      icon: Activity
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Convert "all" values to empty strings for API
  const apiFilters = useMemo(() => {
    return {
      ...filters,
      entityType: filters.entityType === 'all' ? '' : filters.entityType,
      action: filters.action === 'all' ? '' : filters.action,
    }
  }, [filters])

  const handleViewDetails = (activity: EventHistory) => {
    setSelectedActivity(activity)
    setActivityDetailsOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Histórico do Sistema</h2>
          <p className="text-gray-600">Monitore todas as atividades e alterações do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Atividades</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-2xl font-bold text-green-600">{stats.today}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Esta Semana</p>
                <p className="text-2xl font-bold text-purple-600">{stats.thisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tipos de Entidade</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Object.keys(stats.byEntityType).length}
                </p>
              </div>
              <Database className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Pesquisar atividades..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filters.entityType} onValueChange={(value) => handleFilterChange('entityType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(ENTITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="created">Criado</SelectItem>
                <SelectItem value="updated">Atualizado</SelectItem>
                <SelectItem value="deleted">Deletado</SelectItem>
                <SelectItem value="check_in">Check-in</SelectItem>
                <SelectItem value="check_out">Check-out</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Data inicial"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />

            <Input
              type="date"
              placeholder="Data final"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Atividades */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>
            Histórico completo de todas as atividades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Realizada por</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Carregando atividades...
                    </div>
                  </TableCell>
                </TableRow>
              ) : activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-center">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhuma atividade encontrada
                      </h3>
                      <p className="text-gray-600">
                        {filters.search || (filters.entityType !== 'all') || (filters.action !== 'all')
                          ? "Tente ajustar os filtros de pesquisa"
                          : "Não há atividades registradas no sistema"
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => {
                  const entityConfig = getEntityConfig(activity.entityType as keyof typeof ENTITY_CONFIG)
                  const actionConfig = getActionConfig(activity.action)
                  const EntityIcon = entityConfig.icon
                  const ActionIcon = actionConfig.icon

                  return (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", entityConfig.color)}>
                            <EntityIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{activity.description}</p>
                            <p className="text-xs text-gray-500">ID: {activity.entityId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entityConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionConfig.color}>
                          <ActionIcon className="h-3 w-3 mr-1" />
                          {activity.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {activity.performedBy}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {formatDate(activity.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(activity)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
      {paginationInfo && paginationInfo.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Página {pagination.page} de {paginationInfo.totalPages}
            ({paginationInfo.total} atividades)
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!paginationInfo.hasNext}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Atividade */}
      <Dialog open={activityDetailsOpen} onOpenChange={setActivityDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes da Atividade</DialogTitle>
            <DialogDescription>
              Informações completas sobre a atividade selecionada
            </DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Informações básicas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Entidade</label>
                    <p className="font-medium">{getEntityConfig(selectedActivity.entityType as keyof typeof ENTITY_CONFIG).label}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Ação</label>
                    <p className="font-medium">{selectedActivity.action}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Realizada por</label>
                    <p className="font-medium">{selectedActivity.performedBy}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Data/Hora</label>
                    <p className="font-medium">{formatDate(selectedActivity.timestamp)}</p>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-sm font-medium text-gray-600">Descrição</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">
                    {selectedActivity.description}
                  </p>
                </div>

                {/* Dados adicionais */}
                {selectedActivity.additionalData && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dados Adicionais</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedActivity.additionalData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}