'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Users, 
  Search, 
  UserPlus, 
  MoreVertical, 
  Shield, 
  UserX, 
  Mail, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Settings
} from "lucide-react"
import { toast } from "sonner"

interface ClerkUser {
  id: string
  firstName?: string
  lastName?: string
  emailAddress: string
  imageUrl?: string
  createdAt: number
  lastSignInAt?: number
  hasImage: boolean
  verified: boolean
  banned: boolean
}

export const UsersManagement = () => {
  const { user: currentUser } = useUser()
  const [users, setUsers] = useState<ClerkUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<ClerkUser | null>(null)
  const [userDetailsOpen, setUserDetailsOpen] = useState(false)

  // Função para buscar usuários do Clerk via API
  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        search: search.trim()
      })
      
      const response = await fetch(`/api/admin/users?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || [])
      } else {
        throw new Error('Erro ao buscar usuários')
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
      toast.error("Erro ao carregar usuários")
      
      // Fallback para dados mockados em caso de erro
      const mockUsers: ClerkUser[] = [
        {
          id: "1",
          firstName: "João",
          lastName: "Silva",
          emailAddress: "joao@exemplo.com",
          imageUrl: "",
          createdAt: Date.now() - 86400000,
          lastSignInAt: Date.now() - 3600000,
          hasImage: false,
          verified: true,
          banned: false
        },
        {
          id: "2",
          firstName: "Maria",
          lastName: "Santos",
          emailAddress: "maria@exemplo.com",
          imageUrl: "",
          createdAt: Date.now() - 172800000,
          lastSignInAt: Date.now() - 7200000,
          hasImage: false,
          verified: true,
          banned: false
        }
      ]
      
      setUsers(mockUsers)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [search])

  const filteredUsers = users.filter(user => 
    user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    user.emailAddress.toLowerCase().includes(search.toLowerCase())
  )

  const handleBanUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          action: 'ban'
        }),
      })
      
      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, banned: true } : user
        ))
        toast.success("Usuário banido com sucesso")
      } else {
        throw new Error('Erro ao banir usuário')
      }
    } catch (error) {
      console.error('Erro ao banir usuário:', error)
      toast.error("Erro ao banir usuário")
    }
  }

  const handleUnbanUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          action: 'unban'
        }),
      })
      
      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, banned: false } : user
        ))
        toast.success("Usuário desbaneado com sucesso")
      } else {
        throw new Error('Erro ao desbanir usuário')
      }
    } catch (error) {
      console.error('Erro ao desbanir usuário:', error)
      toast.error("Erro ao desbanir usuário")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId
        }),
      })
      
      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId))
        toast.success("Usuário removido com sucesso")
      } else {
        throw new Error('Erro ao remover usuário')
      }
    } catch (error) {
      console.error('Erro ao remover usuário:', error)
      toast.error("Erro ao remover usuário")
    }
  }

  const getUserInitials = (user: ClerkUser) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.emailAddress[0].toUpperCase()
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Nunca"
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getUserStatus = (user: ClerkUser) => {
    if (user.banned) return { label: "Banido", color: "bg-red-100 text-red-700", icon: XCircle }
    if (!user.verified) return { label: "Não Verificado", color: "bg-yellow-100 text-yellow-700", icon: Clock }
    if (user.lastSignInAt && Date.now() - user.lastSignInAt < 3600000) return { label: "Online", color: "bg-green-100 text-green-700", icon: CheckCircle }
    return { label: "Offline", color: "bg-gray-100 text-gray-700", icon: XCircle }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h2>
          <p className="text-gray-600">Gerencie usuários autenticados via Clerk</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verificados</p>
                <p className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.verified).length}
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
                <p className="text-sm font-medium text-gray-600">Online</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {users.filter(u => u.lastSignInAt && Date.now() - u.lastSignInAt < 3600000).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Banidos</p>
                <p className="text-2xl font-bold text-red-600">
                  {users.filter(u => u.banned).length}
                </p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
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
                placeholder="Pesquisar usuários..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Filtros Avançados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Usuários registrados no sistema via Clerk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando usuários...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const status = getUserStatus(user)
                  const StatusIcon = status.icon
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-gray-500">ID: {user.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {user.emailAddress}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(user.lastSignInAt)}
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
                                setSelectedUser(user)
                                setUserDetailsOpen(true)
                              }}
                            >
                              Ver Detalhes
                            </DropdownMenuItem>
                            {user.banned ? (
                              <DropdownMenuItem onClick={() => handleUnbanUser(user.id)}>
                                Desbanir Usuário
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleBanUser(user.id)}>
                                Banir Usuário
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Remover Usuário
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

      {/* Modal de Detalhes do Usuário */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações detalhadas do usuário selecionado
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.imageUrl} />
                  <AvatarFallback>{getUserInitials(selectedUser)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-gray-600">{selectedUser.emailAddress}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge className={getUserStatus(selectedUser).color}>
                      {getUserStatus(selectedUser).label}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Data de Cadastro</label>
                  <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Último Acesso</label>
                  <p className="text-sm">{formatDate(selectedUser.lastSignInAt)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Verificado</label>
                  <p className="text-sm">{selectedUser.verified ? "Sim" : "Não"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}