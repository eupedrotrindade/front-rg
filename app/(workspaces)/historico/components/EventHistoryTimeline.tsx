"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Calendar, User, Database, Activity, Clock, Eye,
  CheckCircle, XCircle, Edit, Plus, Trash2, RefreshCw,
  Globe, Monitor, Code
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { EventHistory } from "@/features/eventos/types"

interface EventHistoryTimelineProps {
  histories: EventHistory[]
  onViewDetails: (history: EventHistory) => void
}

// Configuração de cores e ícones
const ENTITY_CONFIG = {
  event: { color: "bg-blue-500", icon: Calendar, label: "Evento" },
  participant: { color: "bg-green-500", icon: User, label: "Participante" },
  manager: { color: "bg-purple-500", icon: User, label: "Gerente" },
  staff: { color: "bg-orange-500", icon: User, label: "Staff" },
  wristband: { color: "bg-pink-500", icon: Activity, label: "Pulseira" },
  wristband_model: { color: "bg-pink-400", icon: Activity, label: "Modelo Pulseira" },
  vehicle: { color: "bg-gray-500", icon: Database, label: "Veículo" },
  attendance: { color: "bg-cyan-500", icon: CheckCircle, label: "Presença" },
  operator: { color: "bg-indigo-500", icon: User, label: "Operador" },
  coordinator: { color: "bg-yellow-500", icon: User, label: "Coordenador" },
  company: { color: "bg-red-500", icon: Database, label: "Empresa" },
  credential: { color: "bg-teal-500", icon: Activity, label: "Credencial" },
  movement_credential: { color: "bg-teal-400", icon: Activity, label: "Mov. Credencial" },
  radio: { color: "bg-violet-500", icon: Activity, label: "Rádio" },
  import_request: { color: "bg-amber-500", icon: Database, label: "Importação" },
}

const ACTION_CONFIG = {
  created: { color: "bg-green-100 text-green-800 border-green-300", icon: Plus, label: "Criado" },
  updated: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: Edit, label: "Atualizado" },
  deleted: { color: "bg-red-100 text-red-800 border-red-300", icon: Trash2, label: "Deletado" },
  status_updated: { color: "bg-purple-100 text-purple-800 border-purple-300", icon: RefreshCw, label: "Status Alterado" },
  check_in: { color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle, label: "Check-in" },
  check_out: { color: "bg-orange-100 text-orange-800 border-orange-300", icon: XCircle, label: "Check-out" },
  recorded: { color: "bg-cyan-100 text-cyan-800 border-cyan-300", icon: Activity, label: "Registrado" },
}

export default function EventHistoryTimeline({ histories, onViewDetails }: EventHistoryTimelineProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        {histories.map((history, index) => {
          const entityConfig = ENTITY_CONFIG[history.entityType as keyof typeof ENTITY_CONFIG]
          const actionConfig = ACTION_CONFIG[history.action as keyof typeof ACTION_CONFIG]
          const EntityIcon = entityConfig?.icon || Database
          const ActionIcon = actionConfig?.icon || Activity

          const isLast = index === histories.length - 1

          return (
            <div key={history.id} className="relative flex gap-4 pb-8">
              {/* Timeline Line */}
              {!isLast && (
                <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200" />
              )}

              {/* Timeline Node */}
              <div className="relative z-10 flex-shrink-0">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg",
                  entityConfig?.color || "bg-gray-500"
                )}>
                  <EntityIcon className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Content Card */}
              <Card className="flex-1 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn("gap-1", actionConfig?.color || "bg-gray-100 text-gray-800")}>
                          <ActionIcon className="h-3 w-3" />
                          {actionConfig?.label || history.action}
                        </Badge>
                        
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span>{entityConfig?.label || history.entityType}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-900 mb-3 leading-relaxed">
                        {history.description}
                      </p>

                      {/* Meta Information */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {/* User */}
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-xs bg-gray-200">
                                {history.performedBy.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{history.performedBy}</span>
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <time dateTime={history.timestamp}>
                              {format(parseISO(history.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </time>
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(history)}
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Detalhes
                        </Button>
                      </div>

                      {/* Technical Badges */}
                      {history.additionalData && (
                        <div className="flex gap-1 mt-3">
                          {history.additionalData.method && (
                            <Badge variant="outline" className="text-xs h-5">
                              {history.additionalData.method}
                            </Badge>
                          )}
                          {history.additionalData.statusCode && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs h-5",
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
                          {history.additionalData.ip && (
                            <Badge variant="outline" className="text-xs h-5">
                              <Globe className="h-2 w-2 mr-1" />
                              IP
                            </Badge>
                          )}
                          {history.additionalData.userAgent && (
                            <Badge variant="outline" className="text-xs h-5">
                              <Monitor className="h-2 w-2 mr-1" />
                              UA
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}

        {/* Empty State */}
        {histories.length === 0 && (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum histórico encontrado
            </h3>
            <p className="text-gray-500">
              Não há ações registradas para os filtros aplicados.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}