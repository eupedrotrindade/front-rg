"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
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
import { useCoordenadoresByEvent } from "@/features/eventos/api/query/use-coordenadores-by-event"
import { useAllCoordenadores } from "@/features/eventos/api/query/use-coordenadores"
import { useCreateCoordenador, useAssignCoordenador, useUpdateCoordenador, useDeleteCoordenador } from "@/features/eventos/api/mutation"

interface Coordenador {
    id: string
    email: string
    firstName: string
    lastName: string
    imageUrl: string
    createdAt: string
    metadata: {
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
    const { user } = useUser()
    const { data: eventos = [] } = useEventos()
    const { data: coordenadores = [], isLoading } = useCoordenadoresByEvent({ eventId })

    const [searchTerm, setSearchTerm] = useState("")
    const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null)
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

    const { data: allCoordenadores = [], isLoading: loadingAllCoordenadores } = useAllCoordenadores()

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

    // Buscar dados do evento
    useEffect(() => {
        if (eventos && Array.isArray(eventos)) {
            const evento = eventos.find((e: Evento) => e.id === eventId)
            if (evento) {
                setSelectedEvento(evento)
                setNomeEvento(evento.name || "Evento")
            }
        }
    }, [eventos, eventId])

    // Filtrar coordenadores
    const filteredCoordenadores = (coordenadores || []).filter((coordenador: Coordenador) => {
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

    // Abrir modal de edição
    const openEditDialog = (coordenador: Coordenador) => {
        const eventoAtual = coordenador.metadata.eventos?.find(e => e.id === eventId)
        setEditForm({
            firstName: coordenador.firstName,
            lastName: coordenador.lastName,
            role: eventoAtual?.role || "coordenador"
        })
        setSelectedCoordenador(coordenador)
        setEditDialogOpen(true)
    }

    // Abrir modal de exclusão
    const openDeleteDialog = (coordenador: Coordenador) => {
        setSelectedCoordenador(coordenador)
        setDeleteDialogOpen(true)
    }

    const getRoleBadge = (coordenador: Coordenador) => {
        const eventoAtual = coordenador.metadata.eventos?.find(e => e.id === eventId)
        const role = eventoAtual?.role || "coordenador"

        return (
            <Badge variant={role === "coordenador_geral" ? "default" : "secondary"}>
                {role === "coordenador_geral" ? "Coordenador Geral" : "Coordenador"}
            </Badge>
        )
    }

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
    }

    if (isLoading && (coordenadores || []).length === 0) {
        return (
            <EventLayout eventId={String(params.id)} eventName={nomeEvento}>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Carregando coordenadores...</span>
                </div>
            </EventLayout>
        )
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={nomeEvento}>
            <div className="container mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Coordenadores</h1>
                        <p className="text-gray-600 mt-1">Evento: {nomeEvento}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Coordenador
                        </Button>
                        <Button variant="outline" onClick={openAssignDialog}>
                            <User className="h-4 w-4 mr-2" />
                            Atribuir Coordenador
                        </Button>
                    </div>
                </div>

                {/* Filtros */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Filtros
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Buscar por nome ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabela */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Coordenadores do Evento
                        </CardTitle>
                        <CardDescription>
                            {filteredCoordenadores.length} coordenador(es) encontrado(s)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Coordenador</TableHead>
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
                                            <div className="flex items-center gap-3">
                                                {coordenador.imageUrl ? (
                                                    <img
                                                        src={coordenador.imageUrl}
                                                        alt={`${coordenador.firstName} ${coordenador.lastName}`}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <span className="text-sm font-medium text-blue-600">
                                                            {getInitials(coordenador.firstName, coordenador.lastName)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium">
                                                        {coordenador.firstName} {coordenador.lastName}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                                {coordenador.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getRoleBadge(coordenador)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                {new Date(coordenador.createdAt).toLocaleDateString('pt-BR')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditDialog(coordenador)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDeleteDialog(coordenador)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Modal de Criação */}
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogContent className="max-w-md bg-white text-gray-900">
                        <DialogHeader>
                            <DialogTitle>Criar Novo Coordenador</DialogTitle>
                            <DialogDescription>
                                Crie um novo coordenador do zero. Uma nova conta será criada no Clerk.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <Input
                                    type="email"
                                    placeholder="coordenador@exemplo.com"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                    <Input
                                        placeholder="Nome"
                                        value={createForm.firstName}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome *</label>
                                    <Input
                                        placeholder="Sobrenome"
                                        value={createForm.lastName}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                                <Input
                                    type="password"
                                    placeholder="Senha temporária"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Senha temporária que será alterada no primeiro login
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                                <Select
                                    value={createForm.role}
                                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, role: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coordenador">Coordenador</SelectItem>
                                        <SelectItem value="coordenador_geral">Coordenador Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleCreateCoordenador} disabled={createCoordenadorMutation.isPending}>
                                    {createCoordenadorMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Plus className="h-4 w-4 mr-2" />
                                    )}
                                    {createCoordenadorMutation.isPending ? "Criando..." : "Criar"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Atribuição */}
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                    <DialogContent className="max-w-md bg-white text-gray-900">
                        <DialogHeader>
                            <DialogTitle>Atribuir Coordenador Existente</DialogTitle>
                            <DialogDescription>
                                Selecione um coordenador já existente no Clerk para atribuir a este evento.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Coordenador *</label>
                                {loadingAllCoordenadores ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        <span>Carregando coordenadores...</span>
                                    </div>
                                ) : (
                                    <Select
                                        value={assignForm.coordenadorId}
                                        onValueChange={(value) => setAssignForm(prev => ({ ...prev, coordenadorId: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um coordenador" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(allCoordenadores || []).map((coordenador) => (
                                                <SelectItem key={coordenador.id} value={coordenador.id}>
                                                    <div className="flex items-center gap-2">
                                                        {coordenador.imageUrl ? (
                                                            <img
                                                                src={coordenador.imageUrl}
                                                                alt={`${coordenador.firstName} ${coordenador.lastName}`}
                                                                className="w-6 h-6 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                                                <span className="text-xs font-medium text-blue-600">
                                                                    {getInitials(coordenador.firstName, coordenador.lastName)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-medium">
                                                                {coordenador.firstName} {coordenador.lastName}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {coordenador.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                                <Select
                                    value={assignForm.role}
                                    onValueChange={(value) => setAssignForm(prev => ({ ...prev, role: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coordenador">Coordenador</SelectItem>
                                        <SelectItem value="coordenador_geral">Coordenador Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleAssignCoordenador} disabled={assignCoordenadorMutation.isPending || loadingAllCoordenadores}>
                                    {assignCoordenadorMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    {assignCoordenadorMutation.isPending ? "Atribuindo..." : "Atribuir"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Edição */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Coordenador</DialogTitle>
                            <DialogDescription>
                                Atualize as informações do coordenador.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                    <Input
                                        placeholder="Nome"
                                        value={editForm.firstName}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome *</label>
                                    <Input
                                        placeholder="Sobrenome"
                                        value={editForm.lastName}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                                <Select
                                    value={editForm.role}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coordenador">Coordenador</SelectItem>
                                        <SelectItem value="coordenador_geral">Coordenador Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleEditCoordenador} disabled={updateCoordenadorMutation.isPending}>
                                    {updateCoordenadorMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    {updateCoordenadorMutation.isPending ? "Salvando..." : "Salvar"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Exclusão */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmar Remoção</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja remover o coordenador &quot;{selectedCoordenador?.firstName} {selectedCoordenador?.lastName}&quot; deste evento?
                                O usuário continuará existindo no sistema, mas não terá mais acesso a este evento.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteCoordenador} disabled={deleteCoordenadorMutation.isPending}>
                                {deleteCoordenadorMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                {deleteCoordenadorMutation.isPending ? "Removendo..." : "Remover"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}
