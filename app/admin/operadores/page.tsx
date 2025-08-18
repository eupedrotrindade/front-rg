'use client'

import React from 'react'
import { OperatorsManagement } from '../components/operators-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCheck, Settings, Activity, Calendar, Info } from "lucide-react"

const AdminOperadoresPage = () => {
  return (
    <div className="space-y-6">
      {/* Header com informações sobre o sistema de operadores */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Operadores</h1>
          <p className="text-gray-600 mt-2">
            Sistema interno para gerenciar operadores e coordenadores de eventos
          </p>
        </div>

        {/* Cards explicativos sobre o sistema de operadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <UserCheck className="h-5 w-5" />
                Sistema de Operadores
              </CardTitle>
              <CardDescription className="text-green-700">
                Gerenciamento independente para operadores do sistema de eventos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-green-700">
                <h4 className="font-medium text-green-800">Características:</h4>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Sistema independente do Clerk
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Atribuição específica por evento
                  </li>
                  <li className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Rastreamento completo de ações
                  </li>
                  <li className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Controle granular de permissões
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Info className="h-5 w-5" />
                Funcionalidades Disponíveis
              </CardTitle>
              <CardDescription className="text-blue-700">
                Todas as operações disponíveis para gerenciar operadores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-700">
                <h4 className="font-medium text-blue-800">Operações:</h4>
                <ul className="space-y-1">
                  <li>• Criar novos operadores no sistema</li>
                  <li>• Editar informações e credenciais</li>
                  <li>• Atribuir eventos específicos</li>
                  <li>• Monitorar atividades realizadas</li>
                  <li>• Ativar/desativar operadores</li>
                  <li>• Visualizar histórico completo</li>
                  <li>• Remover operadores quando necessário</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações técnicas sobre os operadores */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Settings className="h-5 w-5" />
              Estrutura de Dados dos Operadores
            </CardTitle>
            <CardDescription className="text-amber-700">
              Como os operadores são organizados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800">Informações Básicas:</h4>
                <ul className="space-y-1 text-amber-700">
                  <li>• Nome completo</li>
                  <li>• CPF (identificação única)</li>
                  <li>• Senha de acesso</li>
                  <li>• Data de criação</li>
                  <li>• Status (ativo/inativo)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800">Atribuições:</h4>
                <ul className="space-y-1 text-amber-700">
                  <li>• Eventos atribuídos</li>
                  <li>• Turnos específicos</li>
                  <li>• Períodos de trabalho</li>
                  <li>• Etapas do evento</li>
                  <li>• Permissões por evento</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800">Rastreamento:</h4>
                <ul className="space-y-1 text-amber-700">
                  <li>• Histórico de ações</li>
                  <li>• Log de atividades</li>
                  <li>• Timestamp das operações</li>
                  <li>• Dados das transações</li>
                  <li>• Relatórios de uso</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Componente de gerenciamento de operadores */}
      <OperatorsManagement />
    </div>
  )
}

export default AdminOperadoresPage