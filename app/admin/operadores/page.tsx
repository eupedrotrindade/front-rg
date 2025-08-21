/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState } from 'react'
import { OperatorsManagement } from '../components/operators-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { UserCheck, Settings, Activity, Calendar, Info, Key, RefreshCw, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import { useClerk } from "@clerk/nextjs"
import { useDefaultPassword } from "@/features/configuracoes/api/query/use-configuracoes-gerais"

const AdminOperadoresPage = () => {
  const { user } = useClerk()
  const { data: defaultPassword, isLoading: loadingDefaultPassword } = useDefaultPassword()

  // Estados para os dialogs
  const [updateAllPasswordsOpen, setUpdateAllPasswordsOpen] = useState(false)
  const [changeDefaultPasswordOpen, setChangeDefaultPasswordOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Estados para alteração da senha padrão
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Estados para mostrar/ocultar senhas
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Função para atualizar senha de todos os operadores
  const handleUpdateAllPasswords = async () => {
    try {
      setLoading(true)
      const response = await apiClient.post('/operadores/update-all-passwords', {
        performedBy: `${user?.id}|${user?.primaryEmailAddress?.emailAddress}`
      })

      toast.success(`${response.data.updatedCount} operadores tiveram suas senhas atualizadas para a senha padrão`)
      setUpdateAllPasswordsOpen(false)
    } catch (error: any) {
      console.error('Erro ao atualizar senhas:', error)
      const message = error.response?.data?.error || 'Erro ao atualizar senhas dos operadores'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // Função para alterar senha padrão
  const handleChangeDefaultPassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Nova senha e confirmação não coincidem')
      return
    }

    if (newPassword.length < 4) {
      toast.error('Nova senha deve ter pelo menos 4 caracteres')
      return
    }

    try {
      setLoading(true)
      await apiClient.put('/configuracoes-gerais/default-password', {
        oldPassword,
        newPassword,
        performedBy: `${user?.id}|${user?.primaryEmailAddress?.emailAddress}`
      })

      toast.success('Senha padrão alterada com sucesso')
      setChangeDefaultPasswordOpen(false)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowOldPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (error: any) {
      console.error('Erro ao alterar senha padrão:', error)
      const message = error.response?.data?.error || 'Erro ao alterar senha padrão'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

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

        {/* Botões de gerenciamento de senhas */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => setUpdateAllPasswordsOpen(true)}
            disabled={loadingDefaultPassword}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Senhas dos Operadores
          </Button>
          <Button
            onClick={() => setChangeDefaultPasswordOpen(true)}
            disabled={loadingDefaultPassword}
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <Key className="h-4 w-4 mr-2" />
            Alterar Senha Padrão
          </Button>
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

      {/* Dialog para atualizar senhas de todos os operadores */}
      <Dialog open={updateAllPasswordsOpen} onOpenChange={setUpdateAllPasswordsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Senhas dos Operadores</DialogTitle>
            <DialogDescription>
              Esta ação irá alterar a senha de todos os operadores para a senha padrão configurada no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Atenção:</p>
                  <ul className="space-y-1">
                    <li>• Todos os operadores terão suas senhas alteradas</li>
                    <li>• A nova senha será a senha padrão configurada no sistema</li>
                    <li>• Esta ação não pode ser desfeita</li>
                    <li>• Os operadores precisarão usar a nova senha padrão no próximo login</li>
                    <li>• A senha padrão será obtida automaticamente das configurações gerais</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateAllPasswordsOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateAllPasswords}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Atualizando...' : 'Confirmar Atualização'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para alterar senha padrão */}
      <Dialog open={changeDefaultPasswordOpen} onOpenChange={setChangeDefaultPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha Padrão</DialogTitle>
            <DialogDescription>
              Digite a senha atual e a nova senha padrão que será usada para novos operadores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha Atual
              </label>
              <div className="relative">
                <Input
                  type={showOldPassword ? "text" : "password"}
                  placeholder="Digite a senha atual"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  disabled={loading}
                >
                  {showOldPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha Padrão
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Digite a nova senha padrão"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  minLength={4}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirme a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  minLength={4}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p>Esta senha será usada automaticamente para todos os novos operadores criados no sistema.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangeDefaultPasswordOpen(false)
                setOldPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setShowOldPassword(false)
                setShowNewPassword(false)
                setShowConfirmPassword(false)
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangeDefaultPassword}
              disabled={loading || !oldPassword || !newPassword || !confirmPassword}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminOperadoresPage