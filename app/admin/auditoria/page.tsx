'use client'

import React from 'react'
import { SystemHistoryDashboard } from '../components/system-history-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Eye, Lock, AlertTriangle, FileSearch, Clock, Users, Activity } from "lucide-react"

const AdminAuditoriaPage = () => {
  return (
    <div className="space-y-6">
      {/* Header com informações sobre auditoria */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Auditoria e Segurança</h1>
          <p className="text-gray-600 mt-2">
            Sistema completo de auditoria e monitoramento de segurança
          </p>
        </div>

        {/* Cards explicativos sobre auditoria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Shield className="h-5 w-5" />
                Sistema de Auditoria
              </CardTitle>
              <CardDescription className="text-red-700">
                Monitoramento completo de todas as atividades e alterações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-red-700">
                <h4 className="font-medium text-red-800">Recursos de Segurança:</h4>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Rastreamento completo de ações
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Logs imutáveis de auditoria
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Detecção de atividades suspeitas
                  </li>
                  <li className="flex items-center gap-2">
                    <FileSearch className="h-4 w-4" />
                    Busca avançada por critérios
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Activity className="h-5 w-5" />
                Monitoramento em Tempo Real
              </CardTitle>
              <CardDescription className="text-blue-700">
                Visualização e análise de atividades do sistema em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-700">
                <h4 className="font-medium text-blue-800">Capacidades:</h4>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline de atividades em tempo real
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Rastreamento por usuário
                  </li>
                  <li className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Análise de padrões de uso
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Alertas de segurança automáticos
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações sobre compliance e regulamentações */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <FileSearch className="h-5 w-5" />
              Compliance e Regulamentações
            </CardTitle>
            <CardDescription className="text-green-700">
              Sistema preparado para atender requisitos de compliance e auditoria externa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">Dados Auditados:</h4>
                <ul className="space-y-1 text-green-700">
                  <li>• Todas as operações CRUD</li>
                  <li>• Login e logout de usuários</li>
                  <li>• Alterações em permissões</li>
                  <li>• Acessos a dados sensíveis</li>
                  <li>• Operações administrativas</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">Metadados Coletados:</h4>
                <ul className="space-y-1 text-green-700">
                  <li>• Timestamp preciso</li>
                  <li>• IP do usuário</li>
                  <li>• User-Agent do navegador</li>
                  <li>• Dados antes/depois</li>
                  <li>• Contexto da operação</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">Retenção:</h4>
                <ul className="space-y-1 text-green-700">
                  <li>• Logs permanentes</li>
                  <li>• Backup automático</li>
                  <li>• Exportação para compliance</li>
                  <li>• Arquivamento seguro</li>
                  <li>• Relatórios regulatórios</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas de segurança */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Alertas e Monitoramento de Segurança
            </CardTitle>
            <CardDescription className="text-amber-700">
              Sistema automatizado de detecção de atividades suspeitas e alertas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-amber-800">Tipos de Alertas:</h4>
                <div className="space-y-2 text-sm text-amber-700">
                  <div className="flex items-center gap-2 p-2 bg-amber-100 rounded">
                    <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                    <span>Múltiplas tentativas de login falharam</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-amber-100 rounded">
                    <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                    <span>Acesso fora do horário habitual</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-amber-100 rounded">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                    <span>Volume anormal de operações</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-amber-100 rounded">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <span>Alterações em dados críticos</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-amber-800">Ações Automáticas:</h4>
                <div className="space-y-2 text-sm text-amber-700">
                  <p>• Notificação imediata para administradores</p>
                  <p>• Log detalhado da atividade suspeita</p>
                  <p>• Bloqueio temporário em casos críticos</p>
                  <p>• Escalação para equipe de segurança</p>
                  <p>• Relatório automático para compliance</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard de auditoria (reutilizar o SystemHistoryDashboard) */}
      <SystemHistoryDashboard />
    </div>
  )
}

export default AdminAuditoriaPage