"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"

import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, Search, Edit, Trash2, User, Mail, Calendar, Users } from "lucide-react"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useAllCoordenadores } from "@/features/eventos/api/query/use-coordenadores"
import { useCreateCoordenador, useAssignCoordenador, useUpdateCoordenador, useDeleteCoordenador } from "@/features/eventos/api/mutation"
import Image from "next/image"

export interface Coordenador {
    id: string
    email: string
    firstName: string
    lastName: string
    imageUrl: string
    createdAt: string
    metadata?: {
        role?: string
        eventos?: Array<{
            role: string
            id: string
            nome_evento: string
        }>
    }
}

interface Evento {
    id: string
    name: string
    status: string
}

export default function CoordenadoresPage() {
    const params = useParams()
    const eventId = params.id as string
    const { data: eventos = [] } = useEventos()
    const { data: allCoordenadores = [], isLoading: loadingAllCoordenadores } = useAllCoordenadores()

    const [searchTerm, setSearchTerm] = useState("")
    const [nomeEvento, setNomeEvento] = useState("")

    // Estados para modais
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [assignDialogOpen, setAssignDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedCoordenador, setSelectedCoordenador] = useState<Coordenador | null>(null)

    // Estados para formulários
    const [createForm, setCreateForm] = useState({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "coordenador"
    })

    const [assignForm, setAssignForm] = useState({
        coordenadorId: "",
        role: "coordenador"
    })

    // Separar coordenadores-gerais dos coordenadores específicos do evento
    const coordenadoresGerais = useMemo(() => {
        return allCoordenadores.filter(coord => {
            return coord.metadata?.role === 'coordenador-geral' || coord.metadata?.role === 'admin'
        })
    }, [allCoordenadores])

    const eventoCoordenadores = useMemo(() => {
        return allCoordenadores.filter(coord => {
            // Não incluir coordenadores-gerais ou admins na lista de coordenadores do evento
            if (coord.metadata?.role === 'coordenador-geral' || coord.metadata?.role === 'admin') return false
            // Verificar se tem eventos específicos para este evento
            return coord.metadata?.eventos?.some((ev: { id: string }) => ev.id === eventId) ||
                coord.metadata?.eventos?.some(ev => ev.id === eventId)
        })
    }, [allCoordenadores, eventId])

    const availableUsers = useMemo(() => {
        return allCoordenadores.filter(user => {
            // Não permitir adicionar admin ou coordenador-geral como coordenador normal
            if (user.metadata?.role === 'admin' || user.metadata?.role === 'coordenador-geral') return false
            return !eventoCoordenadores.some(coord => coord.id === user.id)
        })
    }, [allCoordenadores, eventoCoordenadores])

    // Hooks de mutation
    const createCoordenadorMutation = useCreateCoordenador()
    const assignCoordenadorMutation = useAssignCoordenador()
    const updateCoordenadorMutation = useUpdateCoordenador()
    const deleteCoordenadorMutation = useDeleteCoordenador()

    const [editForm, setEditForm] = useState({
        firstName: "",
        lastName: "",
        role: "coordenador"
    })

    // Buscar dados do evento com tratamento robusto
    const evento = useMemo(() => {
        const foundEvent = Array.isArray(eventos)
            ? eventos.find((e: Evento) => String(e.id) === String(eventId))
            : undefined

        // Debug temporário para verificar estrutura dos dados
        if (foundEvent) {
            console.log('🔍 Evento encontrado em coordenadores:', {
                id: foundEvent.id,
                name: foundEvent.name,
                status: foundEvent.status,
                montagem: foundEvent.montagem,
                evento: foundEvent.evento,
                desmontagem: foundEvent.desmontagem
            })
        }

        return foundEvent
    }, [eventos, eventId])

    // Função helper para garantir que os dados sejam arrays válidos
    const ensureArray = useCallback((data: unknown): unknown[] => {
        if (!data) return []

        // Se for string, tentar fazer parse
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data)
                return Array.isArray(parsed) ? parsed : []
            } catch (error) {
                console.warn('⚠️ Dados não são JSON válido:', data)
                return []
            }
        }

        // Se já for array, retornar como está
        if (Array.isArray(data)) {
            return data
        }

        // Se for objeto, tentar extrair dados
        if (typeof data === 'object' && data !== null) {
            console.warn('⚠️ Dados inesperados para dias do evento:', data)
            return []
        }

        return []
    }, [])

    // Atualizar nome do evento quando evento mudar
    useEffect(() => {
        if (evento) {
            setNomeEvento(evento.name || "Evento")
        }
    }, [evento])

    // Filtrar coordenadores do evento (excluindo coordenadores-gerais)
    const filteredCoordenadores = eventoCoordenadores.filter((coordenador: Coordenador) => {
        const fullName = `${coordenador.firstName} ${coordenador.lastName}`.toLowerCase()
        const email = coordenador.email.toLowerCase()
        const searchLower = searchTerm.toLowerCase()

        return fullName.includes(searchLower) || email.includes(searchLower)
    })

    // Filtrar coordenadores-gerais para busca
    const filteredCoordenadoresGerais = coordenadoresGerais.filter((coordenador: Coordenador) => {
        const fullName = `${coordenador.firstName} ${coordenador.lastName}`.toLowerCase()
        const email = coordenador.email.toLowerCase()
        const searchLower = searchTerm.toLowerCase()

        return fullName.includes(searchLower) || email.includes(searchLower)
    })

    // Criar coordenador
    const handleCreateCoordenador = async () => {
        if (!createForm.email || !createForm.firstName || !createForm.lastName || !createForm.password) {
            toast.error("Preencha todos os campos obrigatórios")
            return
        }

        // Verificar se o usuário já existe e tem role global
        const existingUser = allCoordenadores.find(coord => coord.email === createForm.email)
        if (existingUser) {
            const metadata = existingUser.metadata as { role?: string }
            if (metadata?.role === 'admin' || metadata?.role === 'coordenador-geral') {
                toast.error(`Este usuário já possui a função global de ${metadata.role}`)
                return
            }
        }

        createCoordenadorMutation.mutate({
            email: createForm.email,
            firstName: createForm.firstName,
            lastName: createForm.lastName,
            password: createForm.password,
            role: createForm.role as "coordenador" | "coordenador_geral",
            eventId: String(eventId),
            nome_evento: nomeEvento
        }, {
            onSuccess: () => {
                setCreateDialogOpen(false)
                setCreateForm({ email: "", firstName: "", lastName: "", password: "", role: "coordenador" })
            }
        })
    }

    // Abrir modal de atribuição
    const openAssignDialog = () => {
        setAssignDialogOpen(true)
    }

    // Atribuir coordenador existente
    const handleAssignCoordenador = async () => {
        if (!assignForm.coordenadorId) {
            toast.error("Selecione um coordenador")
            return
        }

        const selectedCoordenador = (allCoordenadores || []).find(c => c.id === assignForm.coordenadorId)
        if (!selectedCoordenador) {
            toast.error("Coordenador não encontrado")
            return
        }

        // Verificar se o usuário já tem role global
        const metadata = selectedCoordenador.metadata as { role?: string }
        if (metadata?.role === 'admin' || metadata?.role === 'coordenador-geral') {
            toast.error(`Este usuário já possui a função global de ${metadata.role} e não pode ser atribuído como coordenador normal`)
            return
        }

        console.log("Payload assign:", {
            coordenadorId: assignForm.coordenadorId,
            email: selectedCoordenador.email,
            firstName: selectedCoordenador.firstName,
            lastName: selectedCoordenador.lastName,
            role: assignForm.role as "coordenador" | "coordenador_geral",
            eventId: String(eventId),
            nome_evento: nomeEvento
        });
        assignCoordenadorMutation.mutate({
            coordenadorId: assignForm.coordenadorId,
            email: selectedCoordenador.email,
            firstName: selectedCoordenador.firstName,
            lastName: selectedCoordenador.lastName,
            role: assignForm.role as "coordenador" | "coordenador_geral",
            eventId: String(eventId),
            nome_evento: nomeEvento
        }, {
            onSuccess: () => {
                setAssignDialogOpen(false)
                setAssignForm({ coordenadorId: "", role: "coordenador" })
            }
        })
    }

    // Editar coordenador
    const handleEditCoordenador = async () => {
        if (!selectedCoordenador) return

        updateCoordenadorMutation.mutate({
            id: selectedCoordenador.id,
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            role: editForm.role as "coordenador" | "coordenador_geral"
        }, {
            onSuccess: () => {
                setEditDialogOpen(false)
                setSelectedCoordenador(null)
            }
        })
    }

    // Excluir coordenador
    const handleDeleteCoordenador = async () => {
        if (!selectedCoordenador) return

        deleteCoordenadorMutation.mutate(selectedCoordenador.id, {
            onSuccess: () => {
                setDeleteDialogOpen(false)
                setSelectedCoordenador(null)
            }
        })
    }

    // Se não há evento, mostrar loading
    if (!evento) {
        return (
            <EventLayout
                eventId={eventId}
                eventName="Carregando..."
            >
                <div className="p-4">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Carregando coordenadores do evento...</p>
                        </div>
                    </div>
                </div>
            </EventLayout>
        )
    }

    return (
        <EventLayout
            eventId={eventId}
            eventName={evento.name || "Coordenadores"}
        >
            <div className="p-4">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Coordenadores do Evento
                            </h1>
                            <p className="text-gray-600">
                                Gerencie os coordenadores do evento &quot;{evento.name}&quot;
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-blue-600">
                                <Users className="h-3 w-3 mr-1" />
                                Coordenadores
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de Coordenadores</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{filteredCoordenadores.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Coordenadores Ativos</CardTitle>
                            <User className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{filteredCoordenadores.filter(c => c.metadata?.eventos?.some(e => e.id === eventId)).length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Status do Evento</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold capitalize">{evento.status || "N/A"}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Barra de ações */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                        <Input
                            placeholder="Buscar coordenadores..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64"
                        />
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            onClick={() => setCreateDialogOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Novo Coordenador
                        </Button>
                        <Button
                            variant="outline"
                            onClick={openAssignDialog}
                            className="flex items-center gap-2"
                        >
                            <User className="h-4 w-4" />
                            Atribuir Existente
                        </Button>
                    </div>
                </div>

                {/* Seção Coordenadores-Gerais */}
                {filteredCoordenadoresGerais.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Coordenadores-Gerais</CardTitle>
                            <CardDescription>
                                Coordenadores com acesso a todos os eventos
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Função</TableHead>
                                        <TableHead>Data de Criação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCoordenadoresGerais.map((coordenador) => (
                                        <TableRow key={coordenador.id}>
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    <div className="relative">
                                                        {coordenador.imageUrl ? (
                                                            <Image
                                                                src={coordenador.imageUrl}
                                                                alt={`${coordenador.firstName} ${coordenador.lastName}`}
                                                                width={40}
                                                                height={40}
                                                                className="rounded-full"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                                <User className="h-5 w-5 text-gray-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">
                                                            {coordenador.firstName} {coordenador.lastName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Mail className="h-4 w-4 text-gray-400" />
                                                    <span>{coordenador.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="default" className="bg-blue-600">
                                                    {(coordenador.metadata as { role?: string })?.role || "coordenador-geral"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(coordenador.createdAt).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Tabela de coordenadores do evento */}
                <Card>
                    <CardHeader>
                        <CardTitle>Coordenadores do Evento</CardTitle>
                        <CardDescription>
                            Coordenadores específicos atribuídos a este evento
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingAllCoordenadores ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : filteredCoordenadores.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">Nenhum coordenador encontrado</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Função</TableHead>
                                        <TableHead>Data de Criação</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCoordenadores.map((coordenador) => (
                                        <TableRow key={coordenador.id}>
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    <div className="relative">
                                                        {coordenador.imageUrl ? (
                                                            <Image
                                                                src={coordenador.imageUrl}
                                                                alt={`${coordenador.firstName} ${coordenador.lastName}`}
                                                                width={40}
                                                                height={40}
                                                                className="rounded-full"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                                <User className="h-5 w-5 text-gray-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">
                                                            {coordenador.firstName} {coordenador.lastName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Mail className="h-4 w-4 text-gray-400" />
                                                    <span>{coordenador.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {coordenador.metadata?.eventos?.find(e => e.id === eventId)?.role || "N/A"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(coordenador.createdAt).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedCoordenador(coordenador)
                                                            setEditForm({
                                                                firstName: coordenador.firstName,
                                                                lastName: coordenador.lastName,
                                                                role: coordenador.metadata?.eventos?.find(e => e.id === eventId)?.role || "coordenador"
                                                            })
                                                            setEditDialogOpen(true)
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedCoordenador(coordenador)
                                                            setDeleteDialogOpen(true)
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Modal Criar Coordenador */}
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogContent className=" bg-white text-gray-800 max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Criar Novo Coordenador</DialogTitle>
                            <DialogDescription>
                                Crie um novo coordenador para este evento
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Email</label>
                                <Input
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome</label>
                                    <Input
                                        value={createForm.firstName}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                                        placeholder="Nome"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Sobrenome</label>
                                    <Input
                                        value={createForm.lastName}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                                        placeholder="Sobrenome"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Senha</label>
                                <Input
                                    type="password"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="Senha"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Função</label>
                                <Select value={createForm.role} onValueChange={(value) => setCreateForm(prev => ({ ...prev, role: value }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coordenador">Coordenador</SelectItem>
                                        <SelectItem value="coordenador_geral">Coordenador Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleCreateCoordenador} disabled={createCoordenadorMutation.isPending}>
                                {createCoordenadorMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Criando...
                                    </>
                                ) : (
                                    "Criar Coordenador"
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal Atribuir Coordenador */}
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                    <DialogContent className="bg-white text-gray-800 max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Atribuir Coordenador Existente</DialogTitle>
                            <DialogDescription>
                                Atribua um coordenador existente a este evento
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Coordenador</label>
                                <Select value={assignForm.coordenadorId} onValueChange={(value) => setAssignForm(prev => ({ ...prev, coordenadorId: value }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um coordenador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableUsers.map((coordenador) => (
                                            <SelectItem key={coordenador.id} value={coordenador.id}>
                                                {coordenador.firstName} {coordenador.lastName} ({coordenador.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Função</label>
                                <Select value={assignForm.role} onValueChange={(value) => setAssignForm(prev => ({ ...prev, role: value }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coordenador">Coordenador</SelectItem>
                                        <SelectItem value="coordenador_geral">Coordenador Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleAssignCoordenador} disabled={assignCoordenadorMutation.isPending}>
                                {assignCoordenadorMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Atribuindo...
                                    </>
                                ) : (
                                    "Atribuir Coordenador"
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal Editar Coordenador */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Coordenador</DialogTitle>
                            <DialogDescription>
                                Edite as informações do coordenador
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome</label>
                                    <Input
                                        value={editForm.firstName}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                                        placeholder="Nome"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Sobrenome</label>
                                    <Input
                                        value={editForm.lastName}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                                        placeholder="Sobrenome"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Função</label>
                                <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coordenador">Coordenador</SelectItem>
                                        <SelectItem value="coordenador_geral">Coordenador Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleEditCoordenador} disabled={updateCoordenadorMutation.isPending}>
                                {updateCoordenadorMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Salvando...
                                    </>
                                ) : (
                                    "Salvar Alterações"
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal Confirmar Exclusão */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir este coordenador? Esta ação não pode ser desfeita.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteCoordenador}
                                disabled={deleteCoordenadorMutation.isPending}
                            >
                                {deleteCoordenadorMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Excluindo...
                                    </>
                                ) : (
                                    "Excluir Coordenador"
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}
