"use client"

import React, { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Activity, Search, Filter, Calendar, User, Database,
  Clock, Eye, Download, RefreshCw, FileText, BarChart3,
  Server, Code, Monitor, Globe, AlertCircle,
  CheckCircle, XCircle, Zap, Trash2, Edit, Plus
} from "lucide-react"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

// Importar hooks e tipos
import { useEventHistories } from "@/features/eventos/api/query/use-event-histories"
import type { EventHistory } from "@/features/eventos/types"

// Importar componentes personalizados
import EventHistoryTimeline from "./components/EventHistoryTimeline"
import EventHistoryFilters from "./components/EventHistoryFilters"

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
}

// Configuração de cores para ações
const ACTION_CONFIG = {
  created: { color: "bg-green-100 text-green-800", icon: Plus },
  updated: { color: "bg-blue-100 text-blue-800", icon: Edit },
  deleted: { color: "bg-red-100 text-red-800", icon: Trash2 },
  status_updated: { color: "bg-purple-100 text-purple-800", icon: RefreshCw },
  check_in: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  check_out: { color: "bg-orange-100 text-orange-800", icon: XCircle },
  recorded: { color: "bg-cyan-100 text-cyan-800", icon: Activity },
}

// Função para formatar bytes
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Componente principal da página
export default function HistoricoPage() {
  const params = useParams()
  const eventId = params.id as string

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    entityType: '',
    action: '',
    performedBy: '',
    startDate: '',
    endDate: '',
  })

  // Estados para paginação e ordenação
  const [paginacao, setPaginacao] = useState({
    page: 1,
    limit: 25,
    sortBy: 'timestamp',
    sortOrder: 'desc' as 'asc' | 'desc',
  })

  // Estado para modal de detalhes
  const [selectedHistory, setSelectedHistory] = useState<EventHistory | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Estados para estatísticas e visualização
  const [statsTab, setStatsTab] = useState('overview')
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table')

  // Buscar dados usando o hook
  const { data, isLoading: loading, error, refetch } = useEventHistories({
    ...paginacao,
    ...filtros,
  })

  // Estatísticas calculadas
  const stats = useMemo(() => {
    if (!data?.data) return null

    const histories = data.data
    const totalActions = histories.length

    // Contagem por tipo de entidade
    const byEntity = histories.reduce((acc, h) => {
      acc[h.entityType] = (acc[h.entityType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Contagem por ação
    const byAction = histories.reduce((acc, h) => {
      acc[h.action] = (acc[h.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Contagem por usuário
    const byUser = histories.reduce((acc, h) => {
      acc[h.performedBy] = (acc[h.performedBy] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Métodos HTTP mais usados
    const byMethod = histories
      .filter(h => h.additionalData?.method)
      .reduce((acc, h) => {
        const method = h.additionalData!.method!
        acc[method] = (acc[method] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return {
      totalActions,
      byEntity: Object.entries(byEntity).sort(([, a], [, b]) => b - a),
      byAction: Object.entries(byAction).sort(([, a], [, b]) => b - a),
      byUser: Object.entries(byUser).sort(([, a], [, b]) => b - a),
      byMethod: Object.entries(byMethod).sort(([, a], [, b]) => b - a),
    }
  }, [data])

  // Handlers
  const handleFilterChange = (key: string, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value }))
    setPaginacao(prev => ({ ...prev, page: 1 }))
  }

  const handleSortChange = (sortBy: string) => {
    setPaginacao(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
      page: 1,
    }))
  }

  const exportToCSV = () => {
    if (!data?.data) return

    const headers = ['Timestamp', 'Entidade', 'Ação', 'Usuário', 'Descrição', 'IP', 'Método']
    const csvData = data.data.map(h => [
      format(parseISO(h.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      ENTITY_CONFIG[h.entityType as keyof typeof ENTITY_CONFIG]?.label || h.entityType,
      h.action,
      h.performedBy,
      h.description,
      h.additionalData?.ip || '',
      h.additionalData?.method || '',
    ])

    const csvContent = [headers, ...csvData].map(row =>
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historico-eventos-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Arquivo CSV exportado com sucesso!')
  }

  return (

    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-purple-900">
            Histórico de Eventos
          </h1>
          <p className="text-purple-600 mt-1">
            Acompanhe todas as ações realizadas no sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'timeline')}>
            <TabsList>
              <TabsTrigger value="table" className="gap-2">
                <FileText className="h-4 w-4" />
                Tabela
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* <Button
            onClick={refetch}
            variant="outline"
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Atualizar
          </Button> */}
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="gap-2"
            disabled={!data?.data?.length}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={statsTab} onValueChange={setStatsTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Geral</TabsTrigger>
                <TabsTrigger value="entities">Entidades</TabsTrigger>
                <TabsTrigger value="users">Usuários</TabsTrigger>
                <TabsTrigger value="technical">Técnico</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-900">{stats.totalActions}</div>
                    <div className="text-blue-600 text-sm">Total de Ações</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-900">{stats.byAction.length}</div>
                    <div className="text-green-600 text-sm">Tipos de Ação</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-900">{stats.byEntity.length}</div>
                    <div className="text-purple-600 text-sm">Entidades</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-900">{stats.byUser.length}</div>
                    <div className="text-orange-600 text-sm">Usuários Ativos</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="entities">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {stats.byEntity.map(([entity, count]) => {
                    const config = ENTITY_CONFIG[entity as keyof typeof ENTITY_CONFIG]
                    const Icon = config?.icon || Database
                    return (
                      <div key={entity} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", config?.color || "bg-gray-400")} />
                          <span className="text-sm font-medium">
                            {config?.label || entity}
                          </span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="users">
                <div className="space-y-2">
                  {stats.byUser.slice(0, 10).map(([user, count]) => (
                    <div key={user} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{user}</span>
                      </div>
                      <Badge variant="secondary">{count} ações</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="technical">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Métodos HTTP</h4>
                    <div className="space-y-2">
                      {stats.byMethod.map(([method, count]) => (
                        <div key={method} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-mono">{method}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Top Ações</h4>
                    <div className="space-y-2">
                      {stats.byAction.slice(0, 5).map(([action, count]) => (
                        <div key={action} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{action}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <EventHistoryFilters
        filters={filtros}
        onFilterChange={handleFilterChange}
        onClearFilters={() => {
          setFiltros({
            busca: '',
            entityType: '',
            action: '',
            performedBy: '',
            startDate: '',
            endDate: '',
          })
          setPaginacao(prev => ({ ...prev, page: 1 }))
        }}
        totalCount={data?.pagination.total}
        isLoading={loading}
      />

      {/* Conteúdo Principal - Tabela ou Timeline */}
      {viewMode === 'timeline' ? (
        <Card>
          <CardContent className="p-6">
            {loading && (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            )}

            {error && (
              <div className="flex justify-center items-center py-8 text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error instanceof Error ? error.message : 'Erro ao carregar dados'}
              </div>
            )}

            {data && !loading && (
              <EventHistoryTimeline
                histories={data.data}
                onViewDetails={(history) => {
                  setSelectedHistory(history)
                  setDetailsOpen(true)
                }}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {loading && (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            )}

            {error && (
              <div className="flex justify-center items-center py-8 text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error instanceof Error ? error.message : 'Erro ao carregar dados'}
              </div>
            )}

            {data && !loading && (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSortChange('timestamp')}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Data/Hora
                            {paginacao.sortBy === 'timestamp' && (
                              <span className="text-xs">
                                {paginacao.sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Entidade</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Detalhes Técnicos</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.data.map((history) => {
                        const entityConfig = ENTITY_CONFIG[history.entityType as keyof typeof ENTITY_CONFIG]
                        const actionConfig = ACTION_CONFIG[history.action as keyof typeof ACTION_CONFIG]
                        const EntityIcon = entityConfig?.icon || Database
                        const ActionIcon = actionConfig?.icon || Activity

                        return (
                          <TableRow key={history.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">
                                  {format(parseISO(history.timestamp), 'dd/MM/yyyy', { locale: ptBR })}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {format(parseISO(history.timestamp), 'HH:mm:ss', { locale: ptBR })}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", entityConfig?.color || "bg-gray-400")} />
                                <EntityIcon className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium">
                                  {entityConfig?.label || history.entityType}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge
                                className={cn("gap-1", actionConfig?.color || "bg-gray-100 text-gray-800")}
                                variant="secondary"
                              >
                                <ActionIcon className="h-3 w-3" />
                                {history.action}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="text-sm">{history.performedBy}</span>
                              </div>
                            </TableCell>

                            <TableCell className="max-w-xs">
                              <div className="text-sm truncate" title={history.description}>
                                {history.description}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex gap-1 text-xs">
                                {history.additionalData?.method && (
                                  <Badge variant="outline" className="text-xs">
                                    {history.additionalData.method}
                                  </Badge>
                                )}
                                {history.additionalData?.statusCode && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      history.additionalData.statusCode < 300
                                        ? "border-green-300 text-green-700"
                                        : history.additionalData.statusCode < 400
                                          ? "border-blue-300 text-blue-700"
                                          : "border-red-300 text-red-700"
                                    )}
                                  >
                                    {history.additionalData.statusCode}
                                  </Badge>
                                )}
                                {history.additionalData?.ip && (
                                  <Badge variant="outline" className="text-xs">
                                    <Globe className="h-3 w-3 mr-1" />
                                    IP
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedHistory(history)
                                  setDetailsOpen(true)
                                }}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-gray-600">
                    Mostrando {((paginacao.page - 1) * paginacao.limit) + 1} a{' '}
                    {Math.min(paginacao.page * paginacao.limit, data.pagination.total)} de{' '}
                    {data.pagination.total} registros
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.pagination.hasPrev}
                      onClick={() => setPaginacao(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Anterior
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, paginacao.page - 2) + i
                        if (pageNum > data.pagination.totalPages) return null

                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === paginacao.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPaginacao(prev => ({ ...prev, page: pageNum }))}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.pagination.hasNext}
                      onClick={() => setPaginacao(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-black">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Detalhes do Histórico
            </DialogTitle>
            <DialogDescription>
              Informações completas da ação realizada
            </DialogDescription>
          </DialogHeader>

          {selectedHistory && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">ID</label>
                      <div className="font-mono text-sm">{selectedHistory.id}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Timestamp</label>
                      <div className="text-sm">
                        {format(parseISO(selectedHistory.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Entidade</label>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          ENTITY_CONFIG[selectedHistory.entityType as keyof typeof ENTITY_CONFIG]?.color || "bg-gray-400"
                        )} />
                        {ENTITY_CONFIG[selectedHistory.entityType as keyof typeof ENTITY_CONFIG]?.label || selectedHistory.entityType}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">ID da Entidade</label>
                      <div className="font-mono text-sm">{selectedHistory.entityId}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ação</label>
                      <Badge className={ACTION_CONFIG[selectedHistory.action as keyof typeof ACTION_CONFIG]?.color || "bg-gray-100 text-gray-800"}>
                        {selectedHistory.action}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Realizada por</label>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        {selectedHistory.performedBy}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Descrição</label>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                      {selectedHistory.description}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados Adicionais */}
              {selectedHistory.additionalData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code className="h-5 w-5 text-blue-600" />
                      Dados Técnicos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="request">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="request">Requisição</TabsTrigger>
                        <TabsTrigger value="response">Resposta</TabsTrigger>
                        <TabsTrigger value="system">Sistema</TabsTrigger>
                        <TabsTrigger value="raw">JSON Completo</TabsTrigger>
                      </TabsList>

                      <TabsContent value="request" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Método HTTP</label>
                            <Badge variant="outline" className="mt-1">
                              {selectedHistory.additionalData.method || 'N/A'}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Caminho</label>
                            <div className="font-mono text-sm mt-1">
                              {selectedHistory.additionalData.path || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Status Code</label>
                            <Badge
                              className={cn(
                                "mt-1",
                                selectedHistory.additionalData.statusCode && selectedHistory.additionalData.statusCode < 300
                                  ? "bg-green-100 text-green-800"
                                  : selectedHistory.additionalData.statusCode && selectedHistory.additionalData.statusCode < 400
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                              )}
                            >
                              {selectedHistory.additionalData.statusCode || 'N/A'}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">IP do Cliente</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Globe className="h-4 w-4 text-gray-500" />
                              <span className="font-mono text-sm">
                                {selectedHistory.additionalData.ip || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {selectedHistory.additionalData.headers && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Headers HTTP</label>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <div className="grid grid-cols-1 gap-2 text-xs">
                                {Object.entries(selectedHistory.additionalData.headers).map(([key, value]) => (
                                  <div key={key} className="flex">
                                    <span className="font-semibold w-32 text-gray-600">{key}:</span>
                                    <span className="font-mono">{value || 'N/A'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedHistory.additionalData.requestBody && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Corpo da Requisição</label>
                            <ScrollArea className="mt-2 h-32 p-3 bg-gray-50 rounded-lg">
                              <pre className="text-xs font-mono">
                                {JSON.stringify(selectedHistory.additionalData.requestBody, null, 2)}
                              </pre>
                            </ScrollArea>
                          </div>
                        )}

                        {selectedHistory.additionalData.userAgent && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">User Agent</label>
                            <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono">
                              {selectedHistory.additionalData.userAgent}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="response" className="space-y-4">
                        {selectedHistory.additionalData.responseData && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Dados de Resposta</label>
                            <ScrollArea className="mt-2 h-40 p-3 bg-gray-50 rounded-lg">
                              <pre className="text-xs font-mono">
                                {JSON.stringify(selectedHistory.additionalData.responseData, null, 2)}
                              </pre>
                            </ScrollArea>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="system" className="space-y-4">
                        {selectedHistory.additionalData.metadata && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-600">Versão do Node.js</label>
                                <div className="font-mono text-sm mt-1">
                                  {selectedHistory.additionalData.metadata.nodeVersion || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">Plataforma</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Monitor className="h-4 w-4 text-gray-500" />
                                  <span>{selectedHistory.additionalData.metadata.platform || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            {selectedHistory.additionalData.metadata.memoryUsage && (
                              <div>
                                <label className="text-sm font-medium text-gray-600">Uso de Memória</label>
                                <div className="mt-2 grid grid-cols-3 gap-4">
                                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="text-sm font-medium text-blue-900">RSS</div>
                                    <div className="text-xs text-blue-600">
                                      {formatBytes(selectedHistory.additionalData.metadata.memoryUsage.rss)}
                                    </div>
                                  </div>
                                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-sm font-medium text-green-900">Heap Total</div>
                                    <div className="text-xs text-green-600">
                                      {formatBytes(selectedHistory.additionalData.metadata.memoryUsage.heapTotal)}
                                    </div>
                                  </div>
                                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="text-sm font-medium text-orange-900">Heap Used</div>
                                    <div className="text-xs text-orange-600">
                                      {formatBytes(selectedHistory.additionalData.metadata.memoryUsage.heapUsed)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {selectedHistory.additionalData.routeInfo && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Informações da Rota</label>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                <div className="flex">
                                  <span className="font-semibold w-24 text-gray-600">Chave:</span>
                                  <span className="font-mono">{selectedHistory.additionalData.routeInfo.routeKey}</span>
                                </div>
                                <div className="flex">
                                  <span className="font-semibold w-24 text-gray-600">Entidade:</span>
                                  <span>{selectedHistory.additionalData.routeInfo.entityType}</span>
                                </div>
                                <div className="flex">
                                  <span className="font-semibold w-24 text-gray-600">Tipo:</span>
                                  <span>{selectedHistory.additionalData.routeInfo.actionType}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="raw">
                        <ScrollArea className="h-96 p-3 bg-gray-50 rounded-lg">
                          <pre className="text-xs font-mono">
                            {JSON.stringify(selectedHistory.additionalData, null, 2)}
                          </pre>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>

  )
}