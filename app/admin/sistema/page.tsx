'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Server,
  Database,
  Settings,
  Monitor,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Shield,
  RefreshCw,
  Save,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Globe,
  Lock,
  Mail,
  Bell,
  Key,
  FileText,
  Activity,
  BarChart3,
  TrendingUp
} from "lucide-react"
import { toast } from "sonner"
import {
  useSystemInfo,
  useSystemConfig,
  useSystemStats,
  useSystemHealth,
  useUpdateSystemConfig,
  useRestartSystem,
  useCreateSystemBackup,
  useExportSystemLogs
} from "@/features/sistema/api/query/use-system"
import { SystemConfig } from "@/features/sistema/types"

const AdminSistemaPage = () => {
  const { user } = useUser()
  const [localConfig, setLocalConfig] = useState<SystemConfig | null>(null)

  // Hooks para dados do sistema
  const { data: systemInfo, isLoading: loadingSystemInfo, refetch: refetchSystemInfo } = useSystemInfo()
  const { data: systemConfig, isLoading: loadingSystemConfig, refetch: refetchSystemConfig } = useSystemConfig()
  const { data: systemStats, isLoading: loadingSystemStats } = useSystemStats()
  const { data: systemHealth } = useSystemHealth()

  // Mutations
  const updateConfigMutation = useUpdateSystemConfig()
  const restartSystemMutation = useRestartSystem()
  const createBackupMutation = useCreateSystemBackup()
  const exportLogsMutation = useExportSystemLogs()

  // Estado de loading combinado
  const loading = updateConfigMutation.isPending || restartSystemMutation.isPending || createBackupMutation.isPending

  // Inicializar configuração local quando dados chegarem
  useEffect(() => {
    if (systemConfig && !localConfig) {
      setLocalConfig(systemConfig)
    }
  }, [systemConfig, localConfig])

  const handleSaveConfig = async () => {
    if (!localConfig || !user?.id) {
      toast.error('Configuração ou usuário não disponível')
      return
    }

    try {
      await updateConfigMutation.mutateAsync({
        config: localConfig,
        performedBy: user.id
      })
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar configurações')
      console.error('Erro ao salvar:', error)
    }
  }

  const handleRestartSystem = async () => {
    if (!user?.id) {
      toast.error('Usuário não identificado')
      return
    }

    if (confirm('Tem certeza que deseja reiniciar o sistema? Isso pode causar indisponibilidade temporária.')) {
      try {
        const reason = prompt('Motivo do restart (opcional):') || 'Restart manual via admin'
        await restartSystemMutation.mutateAsync({
          reason,
          performedBy: user.id
        })
        toast.success('Reinicialização do sistema iniciada')
      } catch (error) {
        toast.error('Erro ao reiniciar sistema')
        console.error('Erro ao reiniciar:', error)
      }
    }
  }

  const handleBackupNow = async () => {
    if (!user?.id) {
      toast.error('Usuário não identificado')
      return
    }

    try {
      await createBackupMutation.mutateAsync({ performedBy: user.id })
      toast.success('Backup manual iniciado')
    } catch (error) {
      toast.error('Erro ao iniciar backup')
      console.error('Erro ao criar backup:', error)
    }
  }

  const handleExportLogs = async () => {
    try {
      const blob = await exportLogsMutation.mutateAsync({})
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        toast.success('Logs exportados com sucesso!')
      }
    } catch (error) {
      toast.error('Erro ao exportar logs')
      console.error('Erro ao exportar:', error)
    }
  }

  const handleRefreshData = () => {
    refetchSystemInfo()
    refetchSystemConfig()
    toast.success('Dados atualizados!')
  }

  const getStatusIcon = (percentage: number, threshold: number = 80) => {
    if (percentage < threshold) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (percentage < 90) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <XCircle className="h-4 w-4 text-red-600" />
  }

  const getStatusColor = (percentage: number, threshold: number = 80) => {
    if (percentage < threshold) return 'text-green-600'
    if (percentage < 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatBytes = (bytes: number) => {
    const gb = bytes / 1024
    return `${gb.toFixed(1)} GB`
  }

  const formatUptime = (uptime: string) => {
    return uptime
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
          <p className="text-gray-600 mt-2">
            Monitoramento e configuração do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshData} disabled={loadingSystemInfo || loadingSystemConfig}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingSystemInfo || loadingSystemConfig ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleRestartSystem} className="text-red-600">
            <Server className="h-4 w-4 mr-2" />
            Reiniciar Sistema
          </Button>
        </div>
      </div>

      {/* Card de Debug/Status API (temporário para desenvolvimento) */}
      {(loadingSystemInfo || loadingSystemConfig || loadingSystemStats) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Status das APIs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p><strong>System Info:</strong> {loadingSystemInfo ? 'Carregando...' : 'OK'}</p>
                <p><strong>Dados:</strong> {systemInfo ? 'Disponível' : 'Indisponível'}</p>
              </div>
              <div>
                <p><strong>System Config:</strong> {loadingSystemConfig ? 'Carregando...' : 'OK'}</p>
                <p><strong>Dados:</strong> {systemConfig ? 'Disponível' : 'Indisponível'}</p>
              </div>
              <div>
                <p><strong>System Stats:</strong> {loadingSystemStats ? 'Carregando...' : 'OK'}</p>
                <p><strong>Dados:</strong> {systemStats ? 'Disponível' : 'Indisponível'}</p>
              </div>
            </div>
            {systemHealth && (
              <div className="mt-2">
                <p><strong>Health Status:</strong> {systemHealth.status}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CPU</p>
                {loadingSystemInfo ? (
                  <p className="text-2xl font-bold text-gray-400">--</p>
                ) : (
                  <p className={`text-2xl font-bold ${getStatusColor(systemInfo?.cpuUsage || 0)}`}>
                    {systemInfo?.cpuUsage || 0}%
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {loadingSystemInfo ? (
                  <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  getStatusIcon(systemInfo?.cpuUsage || 0)
                )}
                <Cpu className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Memória</p>
                {loadingSystemInfo ? (
                  <p className="text-2xl font-bold text-gray-400">--</p>
                ) : (
                  <p className={`text-2xl font-bold ${getStatusColor(systemInfo?.memoryUsage?.percentage || 0)}`}>
                    {systemInfo?.memoryUsage?.percentage || 0}%
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {loadingSystemInfo ? '--' : `${formatBytes(systemInfo?.memoryUsage?.used || 0)} / ${formatBytes(systemInfo?.memoryUsage?.total || 0)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {loadingSystemInfo ? (
                  <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  getStatusIcon(systemInfo?.memoryUsage?.percentage || 0)
                )}
                <MemoryStick className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disco</p>
                {loadingSystemInfo ? (
                  <p className="text-2xl font-bold text-gray-400">--</p>
                ) : (
                  <p className={`text-2xl font-bold ${getStatusColor(systemInfo?.diskUsage?.percentage || 0)}`}>
                    {systemInfo?.diskUsage?.percentage || 0}%
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {loadingSystemInfo ? '--' : `${formatBytes(systemInfo?.diskUsage?.used || 0)} / ${formatBytes(systemInfo?.diskUsage?.total || 0)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {loadingSystemInfo ? (
                  <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  getStatusIcon(systemInfo?.diskUsage?.percentage || 0)
                )}
                <HardDrive className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Uptime</p>
                {loadingSystemInfo ? (
                  <p className="text-lg font-bold text-gray-400">--</p>
                ) : (
                  <p className="text-lg font-bold text-green-600">{systemInfo?.uptime || '--'}</p>
                )}
                <p className="text-xs text-gray-500">
                  Versão {systemInfo?.version || '--'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {loadingSystemInfo ? (
                  <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Ambiente</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ambiente:</span>
                  {loadingSystemInfo ? (
                    <span className="text-sm text-gray-400">--</span>
                  ) : (
                    <Badge variant={systemInfo?.environment === 'production' ? 'default' : 'secondary'}>
                      {systemInfo?.environment || '--'}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Node.js:</span>
                  <span className="text-sm font-medium">{systemInfo?.nodeVersion || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Versão:</span>
                  <span className="text-sm font-medium">{systemInfo?.version || '--'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Banco de Dados</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conexões Ativas:</span>
                  <span className="text-sm font-medium">{systemInfo?.dbConnections || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-sm text-green-600">Conectado</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Último Restart</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Data:</span>
                  <span className="text-sm font-medium">
                    {systemInfo?.lastRestart ? new Date(systemInfo.lastRestart).toLocaleDateString('pt-BR') : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Hora:</span>
                  <span className="text-sm font-medium">
                    {systemInfo?.lastRestart ? new Date(systemInfo.lastRestart).toLocaleTimeString('pt-BR') : '--'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Tabs defaultValue="maintenance" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="logging">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Modo de Manutenção
              </CardTitle>
              <CardDescription>
                Configure o modo de manutenção do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenance-mode">Ativar modo de manutenção</Label>
                  <p className="text-sm text-gray-600">
                    Bloqueia o acesso ao sistema para todos os usuários exceto administradores
                  </p>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={localConfig?.maintenance?.enabled || false}
                  onCheckedChange={(checked) =>
                    setLocalConfig(prev => prev ? ({
                      ...prev,
                      maintenance: { ...prev.maintenance, enabled: checked }
                    }) : null)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance-message">Mensagem de manutenção</Label>
                <Textarea
                  id="maintenance-message"
                  value={localConfig?.maintenance?.message || ''}
                  onChange={(e) => {
                    setLocalConfig(prev => prev ? ({
                      ...prev,
                      maintenance: { ...prev.maintenance, message: e.target.value }
                    }) : null);
                  }}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
              <CardDescription>
                Configure as políticas de segurança do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Rate Limiting</Label>
                  <p className="text-sm text-gray-600">
                    Limita o número de requisições por minuto por IP
                  </p>
                </div>
                <Switch
                  checked={localConfig?.security.rateLimiting}
                  onCheckedChange={(checked) =>
                    setLocalConfig(prev => prev ? ({
                      ...prev,
                      security: { ...prev.security, rateLimiting: checked }
                    }) : null)
                  }
                />
              </div>

              {localConfig?.security.rateLimiting && (
                <div className="space-y-2">
                  <Label htmlFor="max-requests">Máximo de requisições por minuto</Label>
                  <Input
                    id="max-requests"
                    type="number"
                    value={localConfig?.security.maxRequestsPerMinute}
                    onChange={(e) => {
                      setLocalConfig(prev => prev ? ({
                        ...prev,
                        security: { ...prev.security, maxRequestsPerMinute: parseInt(e.target.value) }
                      }) : null);
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Timeout de sessão (horas)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={localConfig?.security.sessionTimeout}
                  onChange={(e) => {
                    setLocalConfig(prev => prev ? ({
                      ...prev,
                      security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                    }) : null);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações e Alertas
              </CardTitle>
              <CardDescription>
                Configure as notificações automáticas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Alertas por email</Label>
                  <p className="text-sm text-gray-600">
                    Enviar alertas importantes por email
                  </p>
                </div>
                <Switch
                  checked={localConfig?.notifications.emailAlerts}
                  onCheckedChange={(checked) =>
                    setLocalConfig(prev => prev ? ({
                      ...prev,
                      notifications: { ...prev.notifications, emailAlerts: checked }
                    }) : null)
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpu-threshold">Limite CPU (%)</Label>
                  <Input
                    id="cpu-threshold"
                    type="number"
                    value={localConfig?.notifications.alertThresholds.cpuUsage}
                    onChange={(e) => {
                      setLocalConfig(prev => prev ? ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          alertThresholds: {
                            ...prev.notifications.alertThresholds,
                            cpuUsage: parseInt(e.target.value)
                          }
                        }
                      }) : null);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memory-threshold">Limite Memória (%)</Label>
                  <Input
                    id="memory-threshold"
                    type="number"
                    value={localConfig?.notifications.alertThresholds.memoryUsage}
                    onChange={(e) => {
                      setLocalConfig(prev => prev ? ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          alertThresholds: {
                            ...prev.notifications.alertThresholds,
                            memoryUsage: parseInt(e.target.value)
                          }
                        }
                      }) : null);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configurações de Backup
              </CardTitle>
              <CardDescription>
                Configure os backups automáticos do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Backup automático</Label>
                  <p className="text-sm text-gray-600">
                    Realizar backups automáticos do banco de dados
                  </p>
                </div>
                <Switch
                  checked={localConfig?.backup.enabled}
                  onCheckedChange={(checked) =>
                    setLocalConfig(prev => prev ? ({
                      ...prev,
                      backup: { ...prev.backup, enabled: checked }
                    }) : null)
                  }
                />
              </div>

              {localConfig?.backup.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="backup-frequency">Frequência</Label>
                    <Select
                      value={localConfig?.backup.frequency}
                      onValueChange={(value) => {
                        setLocalConfig(prev => prev ? ({
                          ...prev,
                          backup: {
                            ...prev.backup,
                            frequency: value as "hourly" | "daily" | "weekly" | "monthly"
                          }
                        }) : null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">A cada hora</SelectItem>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retention-days">Retenção (dias)</Label>
                    <Input
                      id="retention-days"
                      type="number"
                      value={localConfig?.backup.retentionDays}
                      onChange={(e) => {
                        setLocalConfig(prev => prev ? ({
                          ...prev,
                          backup: { ...prev.backup, retentionDays: parseInt(e.target.value) }
                        }) : null);
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={handleBackupNow} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Backup Manual
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configurações de Log
              </CardTitle>
              <CardDescription>
                Configure o sistema de logs do aplicativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="log-level">Nível de log</Label>
                <Select
                  value={localConfig?.logging.level}
                  onValueChange={(value: 'error' | 'warn' | 'info' | 'debug') => {
                    setLocalConfig(prev => prev ? ({
                      ...prev,
                      logging: { ...prev.logging, level: value }
                    }) : null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Log em arquivo</Label>
                  <p className="text-sm text-gray-600">
                    Salvar logs em arquivos locais
                  </p>
                </div>
                <Switch
                  checked={localConfig?.logging.enableFileLogging}
                  onCheckedChange={(checked) =>
                    setLocalConfig(prev => prev ? ({
                      ...prev,
                      logging: { ...prev.logging, enableFileLogging: checked }
                    }) : null)
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleExportLogs} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botão de salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSaveConfig} disabled={loading || loadingSystemConfig || !localConfig}>
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {loadingSystemConfig ? 'Carregando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  )
}

export default AdminSistemaPage