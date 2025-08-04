'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Calendar, Clock, User, Search, Plus, Check, X, RotateCcw, RefreshCw, Users, Car, Download, Upload, History, Package } from 'lucide-react'
import EventLayout from '@/components/dashboard/dashboard-layout'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { useEventVehiclesByEvent } from '@/features/eventos/api/query/use-event-vehicles-by-event'
import { useCreateEventVehicle, useUpdateEventVehicle, useDeleteEventVehicle, useRetrieveEventVehicle } from '@/features/eventos/api/mutation'
import { EventVehicle } from '@/features/eventos/actions/create-event-vehicle'
import ModalNovoVeiculo from '@/components/operador/modalNovoVeiculo'
import ModalHistoricoVeiculo from '@/components/operador/modalHistoricoVeiculo'

export default function VagasPage() {
    const params = useParams()
    const eventId = String(params.id)

    // Estados
    const [selectedDay, setSelectedDay] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [showOnlyActive, setShowOnlyActive] = useState(false)

    // Estados para modais
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingVeiculo, setEditingVeiculo] = useState<EventVehicle | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false)
    const [selectedVeiculoForHistorico, setSelectedVeiculoForHistorico] = useState<EventVehicle | null>(null)

    // Queries
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null

    const { data: veiculos = [], isLoading, error } = useEventVehiclesByEvent({
        eventId,
        search: searchTerm,
        statusFilter: showOnlyActive ? "retirada" : "all",
        empresaFilter: "all",
        diaFilter: selectedDay || "all"
    })

    // Mutations
    const createVehicleMutation = useCreateEventVehicle()
    const updateVehicleMutation = useUpdateEventVehicle()
    const deleteVehicleMutation = useDeleteEventVehicle()
    const retrieveVehicleMutation = useRetrieveEventVehicle()

    // Função para gerar dias do evento
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string }> => {
        if (!evento) return []

        const days: Array<{ id: string; label: string; date: string; type: string }> = []

        // Adicionar dias de montagem
        if (evento.setupStartDate && evento.setupEndDate) {
            const startDate = new Date(evento.setupStartDate)
            const endDate = new Date(evento.setupEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR')
                const dateISO = date.toISOString().split('T')[0] // YYYY-MM-DD
                days.push({
                    id: dateISO,
                    label: `${dateStr} (MONTAGEM)`,
                    date: dateStr,
                    type: 'setup'
                })
            }
        }

        // Adicionar dias de Evento
        if (evento.preparationStartDate && evento.preparationEndDate) {
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR')
                const dateISO = date.toISOString().split('T')[0] // YYYY-MM-DD
                days.push({
                    id: dateISO,
                    label: `${dateStr} (EVENTO)`,
                    date: dateStr,
                    type: 'preparation'
                })
            }
        }

        // Adicionar dias de finalização
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            const startDate = new Date(evento.finalizationStartDate)
            const endDate = new Date(evento.finalizationEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR')
                const dateISO = date.toISOString().split('T')[0] // YYYY-MM-DD
                days.push({
                    id: dateISO,
                    label: `${dateStr} (DESMONTAGEM)`,
                    date: dateStr,
                    type: 'finalization'
                })
            }
        }

        return days
    }, [evento])

    // Função para obter cor da tab baseada no tipo
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'setup':
                    return 'border-yellow-500 text-yellow-600 bg-yellow-50'
                case 'preparation':
                    return 'border-blue-500 text-blue-600 bg-blue-50'
                case 'finalization':
                    return 'border-purple-500 text-purple-600 bg-purple-50'
                default:
                    return 'border-purple-500 text-purple-600 bg-purple-50'
            }
        } else {
            switch (type) {
                case 'setup':
                    return 'hover:text-yellow-700 hover:border-yellow-300'
                case 'preparation':
                    return 'hover:text-blue-700 hover:border-blue-300'
                case 'finalization':
                    return 'hover:text-purple-700 hover:border-purple-300'
                default:
                    return 'hover:text-gray-700 hover:border-gray-300'
            }
        }
    }, [])

    // Filtrar veículos
    const filteredVeiculos = useMemo(() => {
        let filtered = veiculos

        // Filtrar por termo de busca
        if (searchTerm) {
            filtered = filtered.filter(veiculo =>
                (veiculo.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                (veiculo.placa?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                (veiculo.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                (veiculo.tipo_de_credencial?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
            )
        }

        // Filtrar apenas ativos
        if (showOnlyActive) {
            filtered = filtered.filter(veiculo => veiculo.retirada === 'retirada')
        }

        return filtered
    }, [veiculos, searchTerm, showOnlyActive])

    // Estatísticas
    const stats = useMemo(() => {
        const total = veiculos.length
        const retirados = veiculos.filter(v => v.retirada === 'retirada').length
        const pendentes = veiculos.filter(v => v.retirada === 'pendente').length
        const totalDias = Array.from(new Set(veiculos.map(v => v.dia))).length

        return {
            total,
            retirados,
            pendentes,
            totalDias
        }
    }, [veiculos])

    // Handlers para modais
    const handleOpenModal = (veiculo?: EventVehicle) => {
        if (veiculo) {
            setEditingVeiculo(veiculo)
            setIsEditing(true)
        } else {
            setEditingVeiculo(null)
            setIsEditing(false)
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingVeiculo(null)
        setIsEditing(false)
    }

    const handleOpenHistoricoModal = (veiculo: EventVehicle) => {
        setSelectedVeiculoForHistorico(veiculo)
        setIsHistoricoModalOpen(true)
    }

    const handleCloseHistoricoModal = () => {
        setIsHistoricoModalOpen(false)
        setSelectedVeiculoForHistorico(null)
    }

    const handleSaveVeiculo = async (data: Omit<EventVehicle, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => {
        try {
            if (isEditing && editingVeiculo) {
                await updateVehicleMutation.mutateAsync({
                    id: editingVeiculo.id,
                    data: {
                        empresa: data.empresa,
                        modelo: data.modelo,
                        placa: data.placa,
                        tipo_de_credencial: data.tipo_de_credencial,
                        retirada: data.retirada,
                        dia: data.dia
                    }
                })
            } else {
                await createVehicleMutation.mutateAsync({
                    eventId,
                    ...data
                })
            }
        } catch (error) {
            toast.error("Erro ao salvar veículo")
        }
    }

    const handleDeleteVeiculo = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este veículo?")) {
            try {
                await deleteVehicleMutation.mutateAsync(id)
            } catch (error) {
                // Erro já tratado pelos hooks
            }
        }
    }

    const handleEditVeiculo = (veiculo: EventVehicle) => {
        handleOpenModal(veiculo)
    }

    const handleRetrieveVeiculo = async (veiculo: EventVehicle) => {
        if (confirm(`Confirmar retirada do veículo ${veiculo.placa || veiculo.empresa}?`)) {
            try {
                await retrieveVehicleMutation.mutateAsync({
                    id: veiculo.id,
                    data: {
                        performedBy: 'operador' // TODO: Pegar do contexto de autenticação
                    }
                })
            } catch (error) {
                // Erro já tratado pelos hooks
            }
        }
    }

    // Função para obter status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'retirada':
                return <Badge className="bg-green-100 text-green-800">Retirada</Badge>
            case 'pendente':
                return <Badge className="bg-red-100 text-red-800">Pendente</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    if (!evento) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                </div>
            </div>
        )
    }

    return (
        <EventLayout eventId={eventId} eventName={evento.name}>
            <div className="p-8">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total de Veículos</p>
                                    <p className="text-3xl font-bold">{stats.total}</p>
                                </div>
                                <Car className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Retirados</p>
                                    <p className="text-3xl font-bold">{stats.retirados}</p>
                                </div>
                                <Check className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Pendentes</p>
                                    <p className="text-3xl font-bold">{stats.pendentes}</p>
                                </div>
                                <Clock className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Dias Ativos</p>
                                    <p className="text-3xl font-bold">{stats.totalDias}</p>
                                </div>
                                <Calendar className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Bar */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={() => handleOpenModal()}
                                disabled={!selectedDay}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Retirada
                            </Button>

                            <Button
                                onClick={() => toast.info("Funcionalidade de exportação será implementada")}
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar
                            </Button>

                            <Button
                                onClick={() => toast.info("Funcionalidade de importação será implementada")}
                                variant="outline"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Importar
                            </Button>

                            <Input
                                type="text"
                                placeholder="Buscar por empresa, placa, modelo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-80"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={showOnlyActive}
                                    onChange={(e) => setShowOnlyActive(e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm text-gray-600">Apenas retirados</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Tabs dos dias */}
                <div className="mb-8">
                    <div className="border-b border-gray-200 bg-white rounded-t-lg">
                        <nav className="-mb-px flex flex-wrap gap-1 px-4 py-2">
                            {getEventDays().map((day) => {
                                const veiculosInDay = veiculos.filter(v => v.dia === day.id).length
                                const isActive = selectedDay === day.id

                                return (
                                    <button
                                        key={day.id}
                                        onClick={() => setSelectedDay(day.id)}
                                        className={`border-b-2 py-2 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                                            ? getTabColor(day.type, true)
                                            : `border-transparent text-gray-500 ${getTabColor(day.type, false)}`
                                            }`}
                                    >
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-medium">
                                                {day.label.split(' ')[0]}
                                            </span>
                                            <span className="text-xs opacity-75">
                                                ({veiculosInDay})
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                {/* Tabela de veículos */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Empresa
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Modelo
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Placa
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Tipo de Credencial
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Dia
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                <p>Carregando veículos...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredVeiculos.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <Car className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-lg font-semibold text-gray-700 mb-2">
                                                    {selectedDay ? `Nenhum veículo encontrado para ${new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Selecione uma data'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {selectedDay ? 'Registre uma nova retirada para esta data' : 'Escolha uma data do evento para ver os veículos'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVeiculos.map((veiculo) => (
                                        <tr key={veiculo.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                                            <User className="h-5 w-5 text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {veiculo.empresa || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {veiculo.modelo || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {veiculo.placa || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {veiculo.tipo_de_credencial || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(veiculo.retirada)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    {new Date(veiculo.dia + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    {/* Botão de Histórico */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenHistoricoModal(veiculo)}
                                                        className="text-gray-600 border-gray-200 hover:bg-gray-50"
                                                    >
                                                        <History className="w-4 h-4 mr-1" />
                                                        Histórico
                                                    </Button>

                                                    {/* Botão de Retirar (apenas para pendentes) */}
                                                    {veiculo.retirada === 'pendente' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleRetrieveVeiculo(veiculo)}
                                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                                            disabled={retrieveVehicleMutation.isPending}
                                                        >
                                                            <Package className="w-4 h-4 mr-1" />
                                                            {retrieveVehicleMutation.isPending ? 'Retirando...' : 'Retirar'}
                                                        </Button>
                                                    )}

                                                    {/* Botão de Editar */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEditVeiculo(veiculo)}
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    >
                                                        <RotateCcw className="w-4 h-4 mr-1" />
                                                        Editar
                                                    </Button>

                                                    {/* Botão de Excluir */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDeleteVeiculo(veiculo.id)}
                                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                                    >
                                                        <X className="w-4 h-4 mr-1" />
                                                        Excluir
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal de Novo/Editar Veículo */}
                <ModalNovoVeiculo
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveVeiculo}
                    veiculo={editingVeiculo}
                    isEditing={isEditing}
                    eventDays={getEventDays()}
                    selectedDay={selectedDay}
                />

                {/* Modal de Histórico */}
                <ModalHistoricoVeiculo
                    isOpen={isHistoricoModalOpen}
                    onClose={handleCloseHistoricoModal}
                    veiculo={selectedVeiculoForHistorico}
                />
            </div>
        </EventLayout>
    )
}