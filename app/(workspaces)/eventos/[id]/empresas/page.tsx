'use client'

import React, { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Unlink, Building, Mail, Phone, MapPin, Users, FileText, Calendar } from "lucide-react"
import { toast } from "sonner"
import { useEmpresasByEvent, useAllEmpresas } from "@/features/eventos/api/query"
import { useVincularEmpresaEvento, useCreateEmpresa } from "@/features/eventos/api/mutation"
import { desvincularEmpresaEvento } from "@/features/eventos/actions/create-empresa"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import type { CreateEmpresaRequest } from "@/features/eventos/types"
import EventLayout from "@/components/dashboard/dashboard-layout"

export default function EventoEmpresasPage() {
    const params = useParams()
    const eventId = String(params.id)

    const [searchTerm, setSearchTerm] = useState("")
    const [isVincularDialogOpen, setIsVincularDialogOpen] = useState(false)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [selectedEmpresaId, setSelectedEmpresaId] = useState("")
    const [formData, setFormData] = useState<CreateEmpresaRequest>({
        nome: "",
        cnpj: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        responsavel: "",
        observacoes: ""
    })

    // Hooks
    const { data: empresasVinculadas = [], isLoading: isLoadingVinculadas } = useEmpresasByEvent(eventId)
    const { data: todasEmpresas = [] } = useAllEmpresas()
    const { data: eventos } = useEventos()
    const vincularMutation = useVincularEmpresaEvento()
    const createEmpresaMutation = useCreateEmpresa()

    // Buscar dados do evento
    const evento = Array.isArray(eventos)
        ? eventos.find((e) => String(e.id) === String(eventId))
        : undefined

    // Filtrar empresas vinculadas
    const filteredEmpresasVinculadas = (empresasVinculadas || []).filter(empresa =>
        empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresa.cnpj?.includes(searchTerm) ||
        empresa.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresa.responsavel?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Empresas disponíveis para vincular (não vinculadas ainda)
    const empresasDisponiveis = (todasEmpresas || []).filter(empresa =>
        !(empresasVinculadas || []).some(vinculada => vinculada.id === empresa.id)
    )

    const handleVincular = async () => {
        if (!selectedEmpresaId) {
            toast.error("Selecione uma empresa")
            return
        }

        try {
            await vincularMutation.mutateAsync({
                empresaId: selectedEmpresaId,
                eventoId: eventId
            })
            setIsVincularDialogOpen(false)
            setSelectedEmpresaId("")
        } catch (error) {
            console.error("Erro ao vincular empresa:", error)
        }
    }

    const handleDesvincular = async (empresaId: string) => {
        if (confirm("Tem certeza que deseja desvincular esta empresa do evento?")) {
            try {
                await desvincularEmpresaEvento(empresaId, eventId)
                toast.success("Empresa desvinculada com sucesso!")
                // Recarregar dados
                window.location.reload()
            } catch (error) {
                console.error("Erro ao desvincular empresa:", error)
                toast.error("Erro ao desvincular empresa")
            }
        }
    }

    const handleCreateEmpresa = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const novaEmpresa = await createEmpresaMutation.mutateAsync(formData)
            if (novaEmpresa) {
                // Vincular automaticamente ao evento
                await vincularMutation.mutateAsync({
                    empresaId: novaEmpresa.id,
                    eventoId: eventId
                })
                setIsCreateDialogOpen(false)
                resetForm()
                toast.success("Empresa criada e vinculada ao evento com sucesso!")
            }
        } catch (error) {
            console.error("Erro ao criar empresa:", error)
        }
    }

    const resetForm = () => {
        setFormData({
            nome: "",
            cnpj: "",
            email: "",
            telefone: "",
            endereco: "",
            cidade: "",
            estado: "",
            cep: "",
            responsavel: "",
            observacoes: ""
        })
    }

    return (
        <EventLayout
            eventId={eventId}
            eventName={evento?.name || "Empresas"}
        >
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Empresas do Evento
                            </h1>
                            <p className="text-gray-600">
                                {evento ? `Gerencie as empresas vinculadas ao evento "${evento.name}"` : "Gerencie as empresas vinculadas a este evento"}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-blue-600">
                                <Calendar className="h-3 w-3 mr-1" />
                                {evento ? evento.name : "Evento"}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Empresas Vinculadas</p>
                                    <p className="text-3xl font-bold">{(empresasVinculadas || []).length}</p>
                                </div>
                                <Building className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Disponíveis</p>
                                    <p className="text-3xl font-bold">{empresasDisponiveis.length}</p>
                                </div>
                                <Plus className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Com CNPJ</p>
                                    <p className="text-3xl font-bold">{(empresasVinculadas || []).filter(e => e.cnpj).length}</p>
                                </div>
                                <FileText className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Ativas</p>
                                    <p className="text-3xl font-bold">{(empresasVinculadas || []).filter(e => e.isActive).length}</p>
                                </div>
                                <Users className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="Buscar empresas vinculadas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => resetForm()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nova Empresa
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Nova Empresa</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateEmpresa} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Nome da Empresa *</label>
                                            <Input
                                                value={formData.nome}
                                                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">CNPJ</label>
                                            <Input
                                                value={formData.cnpj}
                                                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Email</label>
                                            <Input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Telefone</label>
                                            <Input
                                                value={formData.telefone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Responsável</label>
                                            <Input
                                                value={formData.responsavel}
                                                onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">CEP</label>
                                            <Input
                                                value={formData.cep}
                                                onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Endereço</label>
                                        <Input
                                            value={formData.endereco}
                                            onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Cidade</label>
                                            <Input
                                                value={formData.cidade}
                                                onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Estado</label>
                                            <Input
                                                value={formData.estado}
                                                onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Observações</label>
                                        <textarea
                                            value={formData.observacoes}
                                            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsCreateDialogOpen(false)
                                                resetForm()
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={createEmpresaMutation.isPending}
                                        >
                                            {createEmpresaMutation.isPending ? (
                                                <>
                                                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    Criando...
                                                </>
                                            ) : (
                                                "Criar Empresa"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isVincularDialogOpen} onOpenChange={setIsVincularDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={empresasDisponiveis.length === 0}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Vincular Empresa
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Vincular Empresa ao Evento</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Selecionar Empresa</label>
                                        <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Escolha uma empresa" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {empresasDisponiveis.map((empresa) => (
                                                    <SelectItem key={empresa.id} value={empresa.id}>
                                                        <div className="flex items-center">
                                                            <span>{empresa.nome}</span>
                                                            {empresa.cnpj && (
                                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                                    {empresa.cnpj}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsVincularDialogOpen(false)
                                                setSelectedEmpresaId("")
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleVincular}
                                            disabled={!selectedEmpresaId || vincularMutation.isPending}
                                        >
                                            {vincularMutation.isPending ? (
                                                <>
                                                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    Vinculando...
                                                </>
                                            ) : (
                                                "Vincular"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Empresas Vinculadas ao Evento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingVinculadas ? (
                            <div className="text-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
                                <p className="text-gray-600">Carregando empresas...</p>
                            </div>
                        ) : filteredEmpresasVinculadas.length === 0 ? (
                            <div className="text-center py-8">
                                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">
                                    {searchTerm ? "Nenhuma empresa encontrada" : "Nenhuma empresa vinculada a este evento"}
                                </p>
                                {!searchTerm && empresasDisponiveis.length > 0 && (
                                    <Button
                                        onClick={() => setIsVincularDialogOpen(true)}
                                        className="mt-4"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Vincular Primeira Empresa
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Empresa</TableHead>
                                        <TableHead>CNPJ</TableHead>
                                        <TableHead>Contato</TableHead>
                                        <TableHead>Localização</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEmpresasVinculadas.map((empresa) => (
                                        <TableRow key={empresa.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{empresa.nome}</p>
                                                    {empresa.responsavel && (
                                                        <p className="text-sm text-gray-600">Resp: {empresa.responsavel}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {empresa.cnpj ? (
                                                    <Badge variant="secondary" className="font-mono text-xs">
                                                        {empresa.cnpj}
                                                    </Badge>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {empresa.email && (
                                                        <div className="flex items-center text-sm">
                                                            <Mail className="h-3 w-3 mr-1" />
                                                            {empresa.email}
                                                        </div>
                                                    )}
                                                    {empresa.telefone && (
                                                        <div className="flex items-center text-sm">
                                                            <Phone className="h-3 w-3 mr-1" />
                                                            {empresa.telefone}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {empresa.cidade && empresa.estado ? (
                                                    <div className="flex items-center text-sm">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {empresa.cidade}, {empresa.estado}
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={empresa.isActive ? "default" : "secondary"}>
                                                    {empresa.isActive ? "Ativa" : "Inativa"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDesvincular(empresa.id)}
                                                >
                                                    <Unlink className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Informações do Evento */}
                {evento && (
                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Informações do Evento
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Nome do Evento</p>
                                    <p className="text-lg font-semibold">{evento.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Status</p>
                                    <Badge variant={evento.isActive ? "default" : "secondary"}>
                                        {evento.isActive ? "Ativo" : "Inativo"}
                                    </Badge>
                                </div>
                                {evento.description && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm font-medium text-gray-600">Descrição</p>
                                        <p className="text-sm text-gray-700">{evento.description}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </EventLayout>
    )
} 