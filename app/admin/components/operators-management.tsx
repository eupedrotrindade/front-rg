/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  UserCheck,
  Search,
  UserPlus,
  MoreVertical,
  Settings,
  Edit,
  Trash2,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Calendar,
  Users,
  Loader2
} from "lucide-react"
import { Operator } from "@/features/operadores/types"
import { useOperators } from "@/features/operadores/api/query/use-operators"
import { toast } from "sonner"

interface OperatorFormData {
  nome: string
  cpf: string
  senha: string
  id_events?: string // Opcional para criação
}

export const OperatorsManagement = () => {
  // Usar hook real do sistema
  const { data: operators = [], isLoading, error } = useOperators()

  const [search, setSearch] = useState("")
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null)
  const [operatorDetailsOpen, setOperatorDetailsOpen] = useState(false)
  const [createOperatorOpen, setCreateOperatorOpen] = useState(false)
  const [editOperatorOpen, setEditOperatorOpen] = useState(false)
  const [formData, setFormData] = useState<OperatorFormData>({
    nome: "",
    cpf: "",
    senha: ""
  })

  // Filtrar operadores baseado na busca
  const filteredOperators = useMemo(() => {
    if (!search.trim()) return operators

    const searchLower = search.toLowerCase()
    return operators.filter(operator =>
      operator.nome?.toLowerCase().includes(searchLower) ||
      operator.cpf?.includes(search) ||
      operator.id?.includes(search)
    )
  }, [operators, search])

  // Estatísticas dos operadores
  const operatorStats = useMemo(() => {
    const totalOperators = operators.length
    const operatorsWithEvents = operators.filter(op => op.id_events && op.id_events.trim()).length
    const operatorsWithoutEvents = totalOperators - operatorsWithEvents

    return {
      total: totalOperators,
      withEvents: operatorsWithEvents,
      withoutEvents: operatorsWithoutEvents
    }
  }, [operators])

  const handleCreateOperator = async () => {
    try {
      // Aqui você implementaria a lógica para criar operador via API
      // Por exemplo: await createOperatorMutation(formData)

      toast.success("Operador criado com sucesso")
      setCreateOperatorOpen(false)
      setFormData({ nome: "", cpf: "", senha: "" })

      // Invalidar query para recarregar dados
      // queryClient.invalidateQueries(['operators'])
    } catch (error) {
      console.error("Erro ao criar operador:", error)
      toast.error("Erro ao criar operador")
    }
  }

  const handleEditOperator = async () => {
    if (!selectedOperator) return

    try {
      // Aqui você implementaria a lógica para editar operador via API
      // Por exemplo: await updateOperatorMutation({ id: selectedOperator.id, ...formData })

      toast.success("Operador atualizado com sucesso")
      setEditOperatorOpen(false)
      setSelectedOperator(null)

      // Invalidar query para recarregar dados
      // queryClient.invalidateQueries(['operators'])
    } catch (error) {
      console.error("Erro ao atualizar operador:", error)
      toast.error("Erro ao atualizar operador")
    }
  }

  const handleDeleteOperator = async (operatorId: string) => {
    try {
      // Aqui você implementaria a lógica para deletar operador via API
      // Por exemplo: await deleteOperatorMutation(operatorId)

      toast.success("Operador removido com sucesso")

      // Invalidar query para recarregar dados
      // queryClient.invalidateQueries(['operators'])
    } catch (error) {
      console.error("Erro ao remover operador:", error)
      toast.error("Erro ao remover operador")
    }
  }

  const getOperatorStatus = (operator: any) => {
    if (operator.ativo === false) {
      return { label: "Inativo", color: "bg-red-100 text-red-700", icon: XCircle }
    }

    // Verificar se tem ações recentes (últimas 24h)
    const hasRecentActivity = operator.acoes && operator.acoes.some((acao: { timestamp: string | number | Date }) => {
      const actionTime = new Date(acao.timestamp).getTime()
      const now = Date.now()
      return now - actionTime < 24 * 60 * 60 * 1000
    })

    if (hasRecentActivity) {
      return { label: "Ativo", color: "bg-green-100 text-green-700", icon: CheckCircle }
    }

    return { label: "Disponível", color: "bg-blue-100 text-blue-700", icon: Clock }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getEventsCount = (id_events: string) => {
    if (!id_events) return 0
    return id_events.split(',').filter(e => e.trim()).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciamento de Operadores</h2>
          <p className="text-gray-600">Gerencie operadores do sistema de eventos</p>
        </div>
        <Button onClick={() => setCreateOperatorOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Operador
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Operadores</p>
                <p className="text-2xl font-bold text-gray-900">{operatorStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Com Eventos</p>
                <p className="text-2xl font-bold text-green-600">
                  {operatorStats.withEvents}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sem Eventos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {operatorStats.withoutEvents}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Carregando</p>
                <p className="text-2xl font-bold text-blue-600">
                  {isLoading ? '...' : '0'}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Pesquisar operadores por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Operadores */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Operadores</CardTitle>
          <CardDescription>
            Operadores registrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Ações</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando operadores...
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-red-600">
                    Erro ao carregar operadores: {error.message}
                  </TableCell>
                </TableRow>
              ) : filteredOperators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {search ? `Nenhum operador encontrado para "${search}"` : 'Nenhum operador cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOperators.map((operator) => {

                  return (
                    <TableRow key={operator.id}>
                      <TableCell>
                        <div className="font-medium">{operator.nome || 'Nome não disponível'}</div>
                      </TableCell>
                      <TableCell>{operator.cpf || 'CPF não disponível'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {operator.id_events ? operator.id_events.split(',').length : 0} eventos
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-gray-400" />
                          {Array.isArray(operator.acoes) ? operator.acoes.length : 0} ações
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">ID: {operator.id}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOperator(operator)
                                setOperatorDetailsOpen(true)
                              }}
                            >
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOperator(operator)
                                setFormData({
                                  nome: operator.nome,
                                  cpf: operator.cpf,
                                  senha: "",
                                  id_events: operator.id_events
                                })
                                setEditOperatorOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteOperator(operator.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Criação de Operador */}
      <Dialog open={createOperatorOpen} onOpenChange={setCreateOperatorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Operador</DialogTitle>
            <DialogDescription>
              Adicione um novo operador ao sistema. Eventos podem ser atribuídos posteriormente através da edição.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Digite o nome completo"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                placeholder="Digite a senha"
              />
            </div>

            {/* Campo id_events removido da criação - operadores são criados sem eventos atribuídos */}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOperatorOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateOperator}>
                Criar Operador
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Operador */}
      <Dialog open={editOperatorOpen} onOpenChange={setEditOperatorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Operador</DialogTitle>
            <DialogDescription>
              Atualize as informações do operador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nome">Nome Completo</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Digite o nome completo"
              />
            </div>

            <div>
              <Label htmlFor="edit-cpf">CPF</Label>
              <Input
                id="edit-cpf"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="edit-senha">Nova Senha (deixe vazio para manter atual)</Label>
              <Input
                id="edit-senha"
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                placeholder="Digite a nova senha"
              />
            </div>

            <div>
              <Label htmlFor="edit-id_events">Eventos (IDs separados por vírgula)</Label>
              <Textarea
                id="edit-id_events"
                value={formData.id_events}
                onChange={(e) => setFormData(prev => ({ ...prev, id_events: e.target.value }))}
                placeholder="event-id-1, event-id-2"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOperatorOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditOperator}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Operador */}
      <Dialog open={operatorDetailsOpen} onOpenChange={setOperatorDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Operador</DialogTitle>
            <DialogDescription>
              Informações detalhadas do operador
            </DialogDescription>
          </DialogHeader>

          {selectedOperator && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedOperator.nome}</h3>
                <p className="text-gray-600">{selectedOperator.cpf}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge className={getOperatorStatus(selectedOperator).color}>
                      {getOperatorStatus(selectedOperator).label}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Eventos Atribuídos</label>
                  <p className="text-sm">{getEventsCount(selectedOperator.id_events)} eventos</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Total de Ações</label>
                  <p className="text-sm">{selectedOperator.acoes?.length || 0} ações realizadas</p>
                </div>

                {/* <div>
                  <label className="text-sm font-medium text-gray-600">Criado em</label>
                  <p className="text-sm">{formatDate(selectedOperator.created_at)}</p>
                </div> */}

                {/* <div>
                  <label className="text-sm font-medium text-gray-600">Última Atualização</label>
                  <p className="text-sm">{formatDate(selectedOperator.updated_at)}</p>
                </div> */}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}