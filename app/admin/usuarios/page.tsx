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
import ModalEditarUsuario from "@/components/admin/modal-editar-usuario"
import Image from 'next/image'

const AdminUsuariosPage = () => {
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Coordenador | null>(null)
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

  // Classificar usuários por tipo
  const usuariosPorTipo = useMemo(() => {
    const masters = usuarios.filter(user => user.metadata?.role === 'admin')
    const coordenadoresGerais = usuarios.filter(user => user.metadata?.role === 'coordenador-geral')
    const coordenadoresEventos = usuarios.filter(user =>
      user.metadata?.eventos && user.metadata.eventos.length > 0
    )
    const semRole = usuarios.filter(user =>
      !user.metadata?.role && (!user.metadata?.eventos || user.metadata.eventos.length === 0)
    )

    return {
      masters,
      coordenadoresGerais,
      coordenadoresEventos,
      semRole,
      total: usuarios.length
    }
  }, [usuarios])

  // Estatísticas dos usuários
  const usuarioStats = useMemo(() => {
    return {
      total: usuarios.length,
      masters: usuariosPorTipo.masters.length,
      coordenadoresGerais: usuariosPorTipo.coordenadoresGerais.length,
      coordenadoresEventos: usuariosPorTipo.coordenadoresEventos.length,
      semRole: usuariosPorTipo.semRole.length
    }
  }, [usuarios, usuariosPorTipo])

  const formatName = (user: Coordenador) => {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Nome não disponível'
  }

  const getUserRole = (user: Coordenador) => {
    if (user.metadata?.role === 'admin') return 'Master'
    if (user.metadata?.role === 'coordenador-geral') return 'Coordenador Geral'
    if (user.metadata?.eventos && user.metadata.eventos.length > 0) return 'Coordenador de Evento'
    return 'Sem Role'
  }

  const getUserRoleColor = (user: Coordenador) => {
    if (user.metadata?.role === 'admin') return 'bg-red-100 text-red-800'
    if (user.metadata?.role === 'coordenador-geral') return 'bg-blue-100 text-blue-800'
    if (user.metadata?.eventos && user.metadata.eventos.length > 0) return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  const handleEditUser = (user: Coordenador) => {
    setSelectedUser(user)
    setEditModalOpen(true)
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

  const handleUserUpdated = async () => {
    // Atualizar lista automaticamente após edição
    await handleRefresh()
    setEditModalOpen(false)
    setSelectedUser(null)
  }

  // Função para renderizar seção de usuários
  const renderUserSection = (title: string, users: Coordenador[], sectionId: string) => {
    if (users.length === 0) return null

    const filteredUsers = users.filter(user =>
      formatName(user).toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.id?.includes(search)
    )

    if (filteredUsers.length === 0 && search) return null

    return (
      <Card key={sectionId} className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {sectionId === 'masters' && <Shield className="h-5 w-5 text-red-600" />}
            {sectionId === 'coordenadoresGerais' && <UserCheck className="h-5 w-5 text-blue-600" />}
            {sectionId === 'coordenadoresEventos' && <Calendar className="h-5 w-5 text-green-600" />}
            {sectionId === 'semRole' && <Users className="h-5 w-5 text-gray-600" />}
            {title} ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role/Eventos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((usuario) => (
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
                    <div className="flex flex-col gap-2">
                      <Badge className={getUserRoleColor(usuario)}>
                        {getUserRole(usuario)}
                      </Badge>
                      {usuario.metadata?.eventos && usuario.metadata.eventos.length > 0 && (
                        <div className="text-xs text-gray-600">
                          {usuario.metadata.eventos.map(evento => evento.nome_evento).join(', ')}
                        </div>
                      )}
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
                        <DropdownMenuItem
                          onClick={() => handleEditUser(usuario)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Editar
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
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




      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <p className="text-sm font-medium text-gray-600">Masters</p>
                <p className="text-2xl font-bold text-red-600">{usuarioStats.masters}</p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Coord. Gerais</p>
                <p className="text-2xl font-bold text-blue-600">{usuarioStats.coordenadoresGerais}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Coord. Eventos</p>
                <p className="text-2xl font-bold text-green-600">{usuarioStats.coordenadoresEventos}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sem Role</p>
                <p className="text-2xl font-bold text-orange-600">{usuarioStats.semRole}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca Global */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, email ou ID em todas as seções..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seções de Usuários */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando usuários...
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-red-600">
              Erro ao carregar usuários: {error.message}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Masters */}
          {renderUserSection('Masters (Administradores)', usuariosPorTipo.masters, 'masters')}

          {/* Coordenadores Gerais */}
          {renderUserSection('Coordenadores Gerais', usuariosPorTipo.coordenadoresGerais, 'coordenadoresGerais')}

          {/* Coordenadores de Eventos */}
          {renderUserSection('Coordenadores de Eventos', usuariosPorTipo.coordenadoresEventos, 'coordenadoresEventos')}

          {/* Usuários sem Role */}
          {renderUserSection('Usuários sem Role Definido', usuariosPorTipo.semRole, 'semRole')}

          {/* Mensagem quando não há usuários */}
          {usuarioStats.total === 0 && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-gray-500">
                  Nenhum usuário cadastrado no sistema
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mensagem quando busca não retorna resultados */}
          {search && usuarioStats.total > 0 &&
            !usuariosPorTipo.masters.some(u => formatName(u).toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.id?.includes(search)) &&
            !usuariosPorTipo.coordenadoresGerais.some(u => formatName(u).toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.id?.includes(search)) &&
            !usuariosPorTipo.coordenadoresEventos.some(u => formatName(u).toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.id?.includes(search)) &&
            !usuariosPorTipo.semRole.some(u => formatName(u).toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.id?.includes(search)) && (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center text-gray-500">
                    Nenhum usuário encontrado para &quot;{search}&quot;
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}

      {/* Modal para adicionar usuário */}
      <ModalAdicionarUsuario
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUserCreated={handleUserCreated}
      />

      {/* Modal para editar usuário */}
      <ModalEditarUsuario
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  )
}

export default AdminUsuariosPage