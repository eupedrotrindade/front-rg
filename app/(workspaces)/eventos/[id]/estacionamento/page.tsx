/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Plus, Check, X, RotateCcw, Car, Download, Upload, History, Package, Sun, Moon } from 'lucide-react'
import EventLayout from '@/components/dashboard/dashboard-layout'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { formatEventDate } from '@/lib/utils'
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

    // Buscar dados do evento com tratamento robusto
    const evento = useMemo(() => {
        const foundEvent = Array.isArray(eventos)
            ? eventos.find(e => String(e.id) === String(eventId))
            : undefined

        // Debug temporário para verificar estrutura dos dados
        if (foundEvent) {
            console.log('🔍 Evento encontrado em estacionamento:', {
                id: foundEvent.id,
                name: foundEvent.name,
                montagem: foundEvent.montagem,
                evento: foundEvent.evento,
                desmontagem: foundEvent.desmontagem,
                montagemType: typeof foundEvent.montagem,
                eventoType: typeof foundEvent.evento,
                desmontagemType: typeof foundEvent.desmontagem
            })
        }

        return foundEvent
    }, [eventos, eventId])


    // Função para gerar dias do evento usando nova estrutura SimpleEventDay
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> => {
        if (!evento) return []

        const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> = []

        // Função helper para processar arrays de dados do evento (nova estrutura)
        const processEventArray = (eventData: any, stage: string, stageName: string) => {
            if (!eventData) return;
            
            try {
                let dataArray: any[] = [];
                
                // Se for string JSON, fazer parse
                if (typeof eventData === 'string') {
                    dataArray = JSON.parse(eventData);
                }
                // Se já for array, usar diretamente
                else if (Array.isArray(eventData)) {
                    dataArray = eventData;
                }
                // Se não for nem string nem array, sair
                else {
                    return;
                }

                // Processar cada item do array
                dataArray.forEach(item => {
                    if (item && item.date) {
                        const formattedDate = formatEventDate(item.date);
                        const dateISO = new Date(item.date).toISOString().split('T')[0]; // YYYY-MM-DD para ID
                        const dateObj = new Date(item.date);
                        const hour = dateObj.getHours();
                        
                        // Determinar período (diurno: 6h-18h, noturno: 18h-6h)
                        const period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                        
                        days.push({
                            id: dateISO,
                            label: `${formattedDate} (${stageName} - ${period === 'diurno' ? 'Diurno' : 'Noturno'})`,
                            date: formattedDate,
                            type: stage,
                            period
                        });
                    }
                });
            } catch (error) {
                console.warn(`Erro ao processar dados do evento para stage ${stage}:`, error);
            }
        };

        // Processar nova estrutura do evento
        processEventArray(evento.montagem, 'setup', 'MONTAGEM');
        processEventArray(evento.evento, 'event', 'EVENTO');
        processEventArray(evento.desmontagem, 'teardown', 'DESMONTAGEM');

        // Fallback para estrutura antiga (manter compatibilidade)
        // Adicionar dias de montagem
        if (evento.setupStartDate && evento.setupEndDate) {
            const startDate = new Date(evento.setupStartDate)
            const endDate = new Date(evento.setupEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatEventDate(date.toISOString())
                const dateISO = date.toISOString().split('T')[0] // YYYY-MM-DD
                const hour = date.getHours();
                const period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                
                days.push({
                    id: dateISO,
                    label: `${dateStr} (MONTAGEM - ${period === 'diurno' ? 'Diurno' : 'Noturno'})`,
                    date: dateStr,
                    type: 'setup',
                    period
                })
            }
        }

        // Adicionar dias de Evento
        if (evento.preparationStartDate && evento.preparationEndDate) {
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatEventDate(date.toISOString())
                const dateISO = date.toISOString().split('T')[0] // YYYY-MM-DD
                const hour = date.getHours();
                const period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                
                days.push({
                    id: dateISO,
                    label: `${dateStr} (EVENTO - ${period === 'diurno' ? 'Diurno' : 'Noturno'})`,
                    date: dateStr,
                    type: 'preparation',
                    period
                })
            }
        }

        // Adicionar dias de finalização
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            const startDate = new Date(evento.finalizationStartDate)
            const endDate = new Date(evento.finalizationEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatEventDate(date.toISOString())
                const dateISO = date.toISOString().split('T')[0] // YYYY-MM-DD
                const hour = date.getHours();
                const period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                
                days.push({
                    id: dateISO,
                    label: `${dateStr} (DESMONTAGEM - ${period === 'diurno' ? 'Diurno' : 'Noturno'})`,
                    date: dateStr,
                    type: 'finalization',
                    period
                })
            }
        }

        // Ordenar dias cronologicamente
        days.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateA.getTime() - dateB.getTime();
        });

        return days
    }, [evento])

    // Auto-selecionar primeiro dia se nenhum estiver selecionado
    const eventDays = getEventDays()
    const shouldAutoSelectDay = !selectedDay && eventDays.length > 0
    const effectiveSelectedDay = shouldAutoSelectDay ? eventDays[0].id : selectedDay

    const { data: veiculos = [], isLoading, error } = useEventVehiclesByEvent({
        eventId,
        search: searchTerm,
        statusFilter: showOnlyActive ? "retirada" : "all",
        empresaFilter: "all",
        diaFilter: effectiveSelectedDay || "all"
    })

    // Mutations
    const createVehicleMutation = useCreateEventVehicle()
    const updateVehicleMutation = useUpdateEventVehicle()
    const deleteVehicleMutation = useDeleteEventVehicle()
    const retrieveVehicleMutation = useRetrieveEventVehicle()

    // Função para obter cor da tab baseada no tipo
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'setup':
                    return 'border-orange-500 text-orange-600 bg-orange-50'
                case 'event':
                    return 'border-blue-500 text-blue-600 bg-blue-50'
                case 'teardown':
                    return 'border-red-500 text-red-600 bg-red-50'
                case 'preparation':
                    return 'border-blue-500 text-blue-600 bg-blue-50'
                case 'finalization':
                    return 'border-red-500 text-red-600 bg-red-50'
                default:
                    return 'border-gray-500 text-gray-600 bg-gray-50'
            }
        } else {
            switch (type) {
                case 'setup':
                    return 'hover:text-orange-700 hover:border-orange-300'
                case 'event':
                    return 'hover:text-blue-700 hover:border-blue-300'
                case 'teardown':
                    return 'hover:text-red-700 hover:border-red-300'
                case 'preparation':
                    return 'hover:text-blue-700 hover:border-blue-300'
                case 'finalization':
                    return 'hover:text-red-700 hover:border-red-300'
                default:
                    return 'hover:text-gray-700 hover:border-gray-300'
            }
        }
    }, [])
    
    // Função para obter ícone do período
    const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno') => {
        if (period === 'diurno') {
            return <Sun className="h-3 w-3 text-yellow-500" />;
        } else if (period === 'noturno') {
            return <Moon className="h-3 w-3 text-blue-500" />;
        }
        return null;
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
                            <p className="text-gray-600">Carregando estacionamento do evento...</p>
                        </div>
                    </div>
                </div>
            </EventLayout>
        )
    }

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
            // Fechar modal após sucesso
            handleCloseModal()
        } catch (error) {
            console.error("Erro ao salvar veículo:", error)
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
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-medium">
                                                    {day.label.split(' ')[0]}
                                                </span>
                                                {getPeriodIcon(day.period)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs opacity-75">
                                                    {day.type === 'setup' ? 'MONTAGEM' : 
                                                     day.type === 'event' ? 'EVENTO' :
                                                     day.type === 'teardown' ? 'DESMONTAGEM' :
                                                     day.type === 'preparation' ? 'EVENTO' :
                                                     day.type === 'finalization' ? 'DESMONTAGEM' : 
                                                     'EVENTO'}
                                                </span>
                                                {day.period && (
                                                    <span className="text-xs opacity-60">
                                                        ({day.period === 'diurno' ? 'D' : 'N'})
                                                    </span>
                                                )}
                                            </div>
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
                                                    {selectedDay ? `Nenhum veículo encontrado para ${formatEventDate(selectedDay + 'T00:00:00')}` : 'Selecione uma data'}
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
                                                    {formatEventDate(veiculo.dia + 'T00:00:00')}
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