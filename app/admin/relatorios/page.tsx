'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Users, 
  Activity,
  TrendingUp,
  FileText,
  Mail,
  PieChart,
  LineChart,
  Filter,
  RefreshCw,
  Eye,
  Settings,
  Clock,
  Target,
  DollarSign,
  UserCheck,
  MapPin,
  Zap
} from "lucide-react"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useEventHistories } from "@/features/eventos/api/query/use-event-histories"
import { toast } from "sonner"

const AdminRelatoriosPage = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [reportType, setReportType] = useState("overview")
  const [selectedEvent, setSelectedEvent] = useState<string>("all")

  // Queries para dados
  const { data: eventosResponse } = useEventos({ page: 1, limit: 100 })
  const { data: historyResponse } = useEventHistories({
    page: 1,
    limit: 100,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  })

  const eventos = useMemo(() => {
    if (!eventosResponse) return []
    if (Array.isArray(eventosResponse)) return eventosResponse
    return (eventosResponse as any).data || []
  }, [eventosResponse])

  const activities = useMemo(() => {
    if (!historyResponse) return []
    return historyResponse.data || []
  }, [historyResponse])

  // Estatísticas gerais
  const generalStats = useMemo(() => {
    const totalEvents = eventos.length
    const activeEvents = eventos.filter(e => e.status === 'active').length
    const completedEvents = eventos.filter(e => e.status === 'completed').length
    const totalActivities = activities.length
    const todayActivities = activities.filter(a => {
      const activityDate = new Date(a.timestamp).toDateString()
      const today = new Date().toDateString()
      return activityDate === today
    }).length

    return {
      totalEvents,
      activeEvents,
      completedEvents,
      totalActivities,
      todayActivities
    }
  }, [eventos, activities])

  // Estatísticas por tipo de entidade
  const entityStats = useMemo(() => {
    const stats = activities.reduce((acc, activity) => {
      acc[activity.entityType] = (acc[activity.entityType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(stats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
  }, [activities])

  // Estatísticas por ação
  const actionStats = useMemo(() => {
    const stats = activities.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(stats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
  }, [activities])

  // Atividades por usuário
  const userStats = useMemo(() => {
    const stats = activities.reduce((acc, activity) => {
      acc[activity.performedBy] = (acc[activity.performedBy] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(stats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
  }, [activities])

  const handleExportReport = (type: string) => {
    toast.success(`Relatório ${type} exportado com sucesso!`)
  }

  const handleGenerateReport = () => {
    toast.success("Relatório personalizado gerado com sucesso!")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios e Analytics</h1>
          <p className="text-gray-600 mt-2">
            Análises detalhadas e relatórios do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => handleExportReport('completo')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Tudo
          </Button>
        </div>
      </div>

      {/* Filtros Globais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Relatório
          </CardTitle>
          <CardDescription>
            Configure o período e escopo dos relatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="event">Evento Específico</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
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
            <div className="flex items-end">
              <Button onClick={handleGenerateReport} className="w-full">
                <BarChart3 className="h-4 w-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Eventos</p>
                <p className="text-2xl font-bold text-gray-900">{generalStats.totalEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Eventos Ativos</p>
                <p className="text-2xl font-bold text-green-600">{generalStats.activeEvents}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-purple-600">{generalStats.completedEvents}</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Atividades Total</p>
                <p className="text-2xl font-bold text-orange-600">{generalStats.totalActivities}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-2xl font-bold text-indigo-600">{generalStats.todayActivities}</p>
              </div>
              <Clock className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Relatórios */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Atividades por Tipo de Entidade */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Atividades por Tipo de Entidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {entityStats.map(([entityType, count]) => (
                    <div key={entityType} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{entityType}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(count / entityStats[0][1]) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Ações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Principais Ações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actionStats.map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{action}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(count / actionStats[0][1]) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Relatório de Eventos
              </CardTitle>
              <CardDescription>
                Análise detalhada dos eventos do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventos.slice(0, 10).map((evento) => (
                    <TableRow key={evento.id}>
                      <TableCell className="font-medium">{evento.name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          evento.status === 'active' ? 'bg-green-100 text-green-700' :
                          evento.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          evento.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {evento.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(evento.startDate)}</TableCell>
                      <TableCell>{evento.venue || 'Não definido'}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleExportReport(`evento-${evento.id}`)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Relatório de Atividades
              </CardTitle>
              <CardDescription>
                Histórico detalhado de todas as atividades do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.slice(0, 15).map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.description}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {activity.entityType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {activity.action}
                        </span>
                      </TableCell>
                      <TableCell>{activity.performedBy}</TableCell>
                      <TableCell>
                        {new Date(activity.timestamp).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Relatório de Usuários Mais Ativos
              </CardTitle>
              <CardDescription>
                Usuários com maior número de atividades no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userStats.map(([user, count], index) => (
                  <div key={user} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{user}</p>
                        <p className="text-sm text-gray-600">{count} atividades</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" 
                          style={{ width: `${(count / userStats[0][1]) * 100}%` }}
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleExportReport(`usuario-${user}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Métricas de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Atividades por Dia</span>
                    <span className="text-lg font-bold text-green-600">
                      {Math.round(generalStats.totalActivities / 30)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Eventos Ativos (%)</span>
                    <span className="text-lg font-bold text-blue-600">
                      {Math.round((generalStats.activeEvents / generalStats.totalEvents) * 100) || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Taxa de Conclusão</span>
                    <span className="text-lg font-bold text-purple-600">
                      {Math.round((generalStats.completedEvents / generalStats.totalEvents) * 100) || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleExportReport('events-summary')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Resumo de Eventos
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleExportReport('activities-log')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar Log de Atividades
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleExportReport('users-report')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Relatório de Usuários
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleExportReport('performance-metrics')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Métricas de Performance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminRelatoriosPage