/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Users,
  UserPlus,
  UserMinus,
  Shield,
  Lock,
  Unlock,
  Save,
  AlertTriangle,
  Plus,
  X,
  Edit,
  Trash2,
  Loader2
} from "lucide-react"

import { Operator } from "@/features/operadores/types"
import { useOperators } from "@/features/operadores/api/query/use-operators"
import { useOperatorsByEvent } from "@/features/operadores/api/query/use-operators-by-event"
import { toast } from "sonner"
import { Event } from '@/app/utils/interfaces/eventos'

interface EventConfigModalProps {
  evento: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EventConfig {
  allowNewRegistrations: boolean
  maxParticipants: number | null
  requireApproval: boolean
  notificationSettings: {
    emailNotifications: boolean
    smsNotifications: boolean
    webhookUrl: string
  }
  accessControl: {
    restrictedAccess: boolean
    allowedDomains: string[]
    blockedEmails: string[]
  }
}

export const EventConfigModal = ({ evento, open, onOpenChange }: EventConfigModalProps) => {
  const [activeTab, setActiveTab] = useState("general")

  // Usar hooks reais do sistema
  const { data: allOperators = [], isLoading: loadingAllOperators } = useOperators()
  const { data: eventOperators = [], isLoading: loadingEventOperators } = useOperatorsByEvent({
    eventId: evento.id
  })

  // Operadores disponíveis que ainda não estão no evento
  const availableOperators = useMemo(() => {
    const eventOperatorIds = eventOperators.map(op => op.id)
    return allOperators.filter(op => !eventOperatorIds.includes(op.id))
  }, [allOperators, eventOperators])

  const [config, setConfig] = useState<EventConfig>({
    allowNewRegistrations: true,
    maxParticipants: null,
    requireApproval: false,
    notificationSettings: {
      emailNotifications: true,
      smsNotifications: false,
      webhookUrl: ""
    },
    accessControl: {
      restrictedAccess: false,
      allowedDomains: [],
      blockedEmails: []
    }
  })

  const [selectedOperatorId, setSelectedOperatorId] = useState("")
  const [newDomain, setNewDomain] = useState("")
  const [newBlockedEmail, setNewBlockedEmail] = useState("")

  const handleConfigChange = (path: string, value: any) => {
    setConfig(prev => {
      const keys = path.split('.')
      const newConfig = { ...prev }
      let current: any = newConfig

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }

      current[keys[keys.length - 1]] = value
      return newConfig
    })
  }

  const addOperatorToEvent = async () => {
    if (!selectedOperatorId) {
      toast.error("Selecione um operador")
      return
    }

    try {
      // Aqui você implementaria a lógica para adicionar o operador ao evento via API
      // Por exemplo: await addOperatorToEventMutation({ eventId: evento.id, operatorId: selectedOperatorId })

      toast.success("Operador adicionado ao evento com sucesso")
      setSelectedOperatorId("")

      // Invalidar queries para atualizar a lista
      // queryClient.invalidateQueries(['operators-by-event', evento.id])
    } catch (error) {
      toast.error("Erro ao adicionar operador ao evento")
    }
  }

  const removeOperatorFromEvent = async (operatorId: string) => {
    try {
      // Aqui você implementaria a lógica para remover o operador do evento via API
      // Por exemplo: await removeOperatorFromEventMutation({ eventId: evento.id, operatorId })

      toast.success("Operador removido do evento com sucesso")

      // Invalidar queries para atualizar a lista
      // queryClient.invalidateQueries(['operators-by-event', evento.id])
    } catch (error) {
      toast.error("Erro ao remover operador do evento")
    }
  }

  const addDomain = () => {
    if (!newDomain.trim()) return

    setConfig(prev => ({
      ...prev,
      accessControl: {
        ...prev.accessControl,
        allowedDomains: [...prev.accessControl.allowedDomains, newDomain.trim()]
      }
    }))
    setNewDomain("")
  }

  const removeDomain = (domain: string) => {
    setConfig(prev => ({
      ...prev,
      accessControl: {
        ...prev.accessControl,
        allowedDomains: prev.accessControl.allowedDomains.filter(d => d !== domain)
      }
    }))
  }

  const addBlockedEmail = () => {
    if (!newBlockedEmail.trim()) return

    setConfig(prev => ({
      ...prev,
      accessControl: {
        ...prev.accessControl,
        blockedEmails: [...prev.accessControl.blockedEmails, newBlockedEmail.trim()]
      }
    }))
    setNewBlockedEmail("")
  }

  const removeBlockedEmail = (email: string) => {
    setConfig(prev => ({
      ...prev,
      accessControl: {
        ...prev.accessControl,
        blockedEmails: prev.accessControl.blockedEmails.filter(e => e !== email)
      }
    }))
  }

  const handleSave = () => {
    // Aqui você implementaria a lógica para salvar as configurações via API
    toast.success("Configurações salvas com sucesso!")
    onOpenChange(false)
  }

  const formatOperatorName = (operator: Operator) => {
    return operator.nome || 'Nome não disponível'
  }

  const formatOperatorId = (operator: Operator) => {
    return operator.cpf || operator.id
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Evento: {evento.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="operators">Operadores</TabsTrigger>
            <TabsTrigger value="access">Controle de Acesso</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Configure as opções principais do evento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Permitir novas inscrições</Label>
                    <p className="text-sm text-gray-600">
                      Usuários podem se inscrever no evento
                    </p>
                  </div>
                  <Switch
                    checked={config.allowNewRegistrations}
                    onCheckedChange={(checked) => handleConfigChange('allowNewRegistrations', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Limite máximo de participantes</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    placeholder="Deixe vazio para ilimitado"
                    value={config.maxParticipants || ""}
                    onChange={(e) => handleConfigChange('maxParticipants', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Requer aprovação manual</Label>
                    <p className="text-sm text-gray-600">
                      Inscrições precisam ser aprovadas por um coordenador
                    </p>
                  </div>
                  <Switch
                    checked={config.requireApproval}
                    onCheckedChange={(checked) => handleConfigChange('requireApproval', checked)}
                  />
                </div>

                {!config.allowNewRegistrations && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-800">
                      Novas inscrições estão bloqueadas para este evento
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operators" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Operadores do Evento</CardTitle>
                <CardDescription>
                  Adicione ou remova operadores com acesso a este evento específico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Adicionar operador ao evento */}
                {availableOperators.length > 0 && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Adicionar Operador ao Evento</h4>
                    <div className="flex gap-2">
                      <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um operador" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableOperators.map((operator) => (
                            <SelectItem key={operator.id} value={operator.id}>
                              {formatOperatorName(operator)} - {formatOperatorId(operator)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={addOperatorToEvent}
                        disabled={!selectedOperatorId || loadingAllOperators}
                      >
                        {loadingAllOperators ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        Adicionar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {loadingEventOperators && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Carregando operadores do evento...</span>
                  </div>
                )}

                {/* Lista de operadores do evento */}
                {!loadingEventOperators && (
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      Operadores do Evento ({eventOperators.length})
                    </h4>

                    {eventOperators.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum operador associado a este evento</p>
                        <p className="text-sm">Adicione operadores para gerenciar este evento</p>
                      </div>
                    ) : (
                      eventOperators.map((operator) => (
                        <div key={operator.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatOperatorName(operator)}</span>
                                <Badge variant="secondary">
                                  Operador
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                CPF: {operator.cpf}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: {operator.id}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeOperatorFromEvent(operator.id)}
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Info sobre operadores gerais */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Sobre Operadores</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Os operadores listados aqui são aqueles já cadastrados no sistema.
                        Para criar novos operadores, acesse a seção &quot;Operadores &quot; no menu principal.
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Total de operadores no sistema: <strong>{allOperators.length}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Controle de Acesso</CardTitle>
                <CardDescription>
                  Configure restrições de acesso e domínios permitidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Acesso restrito</Label>
                    <p className="text-sm text-gray-600">
                      Limitar acesso apenas a domínios específicos
                    </p>
                  </div>
                  <Switch
                    checked={config.accessControl.restrictedAccess}
                    onCheckedChange={(checked) => handleConfigChange('accessControl.restrictedAccess', checked)}
                  />
                </div>

                {config.accessControl.restrictedAccess && (
                  <div className="space-y-3">
                    <div>
                      <Label>Domínios permitidos</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="exemplo.com"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          className="flex-1"
                        />
                        <Button onClick={addDomain}>
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {config.accessControl.allowedDomains.map((domain) => (
                          <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                            {domain}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeDomain(domain)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Emails bloqueados</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="usuario@exemplo.com"
                      value={newBlockedEmail}
                      onChange={(e) => setNewBlockedEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={addBlockedEmail}>
                      <UserMinus className="h-4 w-4 mr-1" />
                      Bloquear
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.accessControl.blockedEmails.map((email) => (
                      <Badge key={email} variant="destructive" className="flex items-center gap-1">
                        {email}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeBlockedEmail(email)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Notificação</CardTitle>
                <CardDescription>
                  Configure como e quando enviar notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Notificações por email</Label>
                    <p className="text-sm text-gray-600">
                      Enviar emails para eventos importantes
                    </p>
                  </div>
                  <Switch
                    checked={config.notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => handleConfigChange('notificationSettings.emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Notificações por SMS</Label>
                    <p className="text-sm text-gray-600">
                      Enviar SMS para eventos críticos
                    </p>
                  </div>
                  <Switch
                    checked={config.notificationSettings.smsNotifications}
                    onCheckedChange={(checked) => handleConfigChange('notificationSettings.smsNotifications', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://api.exemplo.com/webhook"
                    value={config.notificationSettings.webhookUrl}
                    onChange={(e) => handleConfigChange('notificationSettings.webhookUrl', e.target.value)}
                  />
                  <p className="text-sm text-gray-600">
                    URL para receber notificações em tempo real
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}