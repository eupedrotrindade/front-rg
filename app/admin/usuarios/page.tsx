'use client'

import React, { useState, useMemo } from 'react'
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
  Users,
  Shield,
  UserCheck,
  Search,
  Mail,
  Calendar,
  Image as ImageIcon,
  Loader2,
  UserPlus,
  MoreVertical,
  Eye,
  Trash2,
  RefreshCw
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useAllCoordenadores } from "@/features/eventos/api/query/use-coordenadores"
import { useDeleteUser } from "@/features/eventos/api/mutation/use-delete-user"
import { Coordenador } from "@/features/eventos/types"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import ModalAdicionarUsuario from "@/components/admin/modal-adicionar-usuario"
import Image from 'next/image'

const AdminUsuariosPage = () => {
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const queryClient = useQueryClient()

  // Usar hook de coordenadores (que são os usuários)
  const { data: usuarios = [], isLoading, error, refetch } = useAllCoordenadores()

  // Hook para deletar usuário
  const deleteUserMutation = useDeleteUser()

  // Debug: Log dos dados recebidos
  React.useEffect(() => {
    console.log('📊 Dados de usuários recebidos:', usuarios)
    console.log('📈 Total de usuários:', usuarios.length)
    console.log('⏳ Loading:', isLoading)
    console.log('❌ Error:', error)
  }, [usuarios, isLoading, error])

  // Filtrar usuários baseado na busca
  const filteredUsuarios = useMemo(() => {
    if (!search.trim()) return usuarios

    const searchLower = search.toLowerCase()
    return usuarios.filter(usuario =>
      usuario.firstName?.toLowerCase().includes(searchLower) ||
      usuario.lastName?.toLowerCase().includes(searchLower) ||
      usuario.email?.toLowerCase().includes(searchLower) ||
      usuario.id?.includes(search)
    )
  }, [usuarios, search])

  // Estatísticas dos usuários
  const usuarioStats = useMemo(() => {
    const totalUsuarios = usuarios.length
    const usuariosComEventos = usuarios.filter(user =>
      user.metadata?.eventos && user.metadata.eventos.length > 0
    ).length
    const usuariosSemEventos = totalUsuarios - usuariosComEventos

    return {
      total: totalUsuarios,
      comEventos: usuariosComEventos,
      semEventos: usuariosSemEventos
    }
  }, [usuarios])

  const formatName = (user: Coordenador) => {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Nome não disponível'
  }

  const handleViewUser = (user: Coordenador) => {
    toast.info(`Visualizando usuário: ${formatName(user)}`)
  }

  const handleDeleteUser = (user: Coordenador) => {
    const userConfirmed = confirm(`⚠️ ATENÇÃO: EXCLUSÃO PERMANENTE

Tem certeza que deseja DELETAR COMPLETAMENTE o usuário:
${formatName(user)} (${user.email})

Esta ação irá:
• Remover o usuário do sistema Clerk
• Apagar todos os dados do usuário
• Esta ação NÃO PODE ser desfeita

Digite 'DELETAR' se tem certeza absoluta:`)

    if (userConfirmed && window.prompt("Digite 'DELETAR' para confirmar:") === 'DELETAR') {
      deleteUserMutation.mutate(user.id)
    }
  }

  const handleRefresh = async () => {
    try {
      // Invalidar cache e refazer busca
      await queryClient.invalidateQueries({ queryKey: ['all-coordenadores'] })
      await refetch()
      toast.success('Lista de usuários atualizada!')
    } catch (error) {
      toast.error('Erro ao atualizar lista')
    }
  }

  const handleUserCreated = async () => {
    // Atualizar lista automaticamente após criação
    await handleRefresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
            <p className="text-gray-600 mt-2">
              Sistema de usuários coordenadores integrado com autenticação
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-gray-500">
              Última atualização: {new Date().toLocaleTimeString('pt-BR')}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar
              </Button>
              <Button onClick={() => setModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
          </div>
        </div>

        {/* Card explicativo */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Shield className="h-5 w-5" />
              Sistema de Coordenadores
            </CardTitle>
            <CardDescription className="text-blue-700">
              Gerenciamento de usuários coordenadores que podem gerenciar eventos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">Funcionalidades:</h4>
                <ul className="space-y-1 text-blue-700">
                  <li className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Visualizar coordenadores registrados
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Monitorar eventos associados
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Verificar data de cadastro
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">Dados Disponíveis:</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• Nome e sobrenome</li>
                  <li>• Email de acesso</li>
                  <li>• Foto de perfil</li>
                  <li>• Eventos associados</li>
                  <li>• Data de cadastro</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{usuarioStats.total}</p>
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
                <p className="text-2xl font-bold text-green-600">{usuarioStats.comEventos}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sem Eventos</p>
                <p className="text-2xl font-bold text-orange-600">{usuarioStats.semEventos}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold text-blue-600">
                  {isLoading ? '...' : 'Online'}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de usuários */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Usuários Coordenadores
            </CardTitle>
            <CardDescription>
              Gerencie os coordenadores do sistema
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Busca */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, email ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando usuários...
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-red-600">
                    Erro ao carregar usuários: {error.message}
                  </TableCell>
                </TableRow>
              ) : filteredUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    {search ? `Nenhum usuário encontrado para "${search}"` : 'Nenhum usuário cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {usuario.imageUrl ? (
                          <Image
                            src={usuario.imageUrl}
                            alt={formatName(usuario)}
                            width={50}
                            height={50}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{formatName(usuario)}</div>
                          <div className="text-sm text-gray-500">ID: {usuario.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {usuario.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <Badge variant="secondary">
                          {usuario.metadata?.eventos?.length || 0} eventos
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewUser(usuario)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(usuario)}
                            className="text-red-600"
                            disabled={deleteUserMutation.isPending}
                          >
                            {deleteUserMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Removendo...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal para adicionar usuário */}
      <ModalAdicionarUsuario
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUserCreated={handleUserCreated}
      />
    </div>
  )
}

export default AdminUsuariosPage