'use client'

import { useParams } from 'next/navigation'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useDeleteEventParticipant } from '@/features/eventos/api/mutation/use-delete-event-participant'
import { useEventWristbandsByEvent } from '@/features/eventos/api/query/use-event-wristbands'
import { useEventWristbandModels } from '@/features/eventos/api/query/use-event-wristband-models'
import { useCoordenadoresByEvent } from '@/features/eventos/api/query/use-coordenadores-by-event'
import { useEventVehiclesByEvent } from '@/features/eventos/api/query/use-event-vehicles-by-event'
import { useEmpresasByEvent } from '@/features/eventos/api/query/use-empresas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Calendar, Clock, MapPin, Mail, Phone, UserCog, Eye, Trash2, Users, Building, Search, Download, Upload, Plus, Filter, User, Check, X } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { EventParticipant } from '@/features/eventos/types'
import EventParticipantCreateDialog from '@/features/eventos/components/event-participant-create-dialog'
import EventParticipantEditDialog from '@/features/eventos/components/event-participant-edit-dialog'
import ImportExportSystem from '@/features/eventos/components/import-export-system'
import EventLayout from '@/components/dashboard/dashboard-layout'

export default function EventoDetalhesPage() {
    const params = useParams()
    const router = useRouter()
    const { data: eventos } = useEventos()
    const {
        data: participantsData = [],
        isLoading: participantsLoading,
    } = useEventParticipantsByEvent({ eventId: String(params.id) });
    const { data: wristbands, isLoading: wristbandsLoading } = useEventWristbandsByEvent(String(params.id))
    const { data: wristbandModels, isLoading: wristbandModelsLoading } = useEventWristbandModels()
    const { mutate: deleteParticipant, isPending: isDeleting } = useDeleteEventParticipant()

    // Hooks para coordenadores, vagas e empresas
    const { data: coordenadores = [], isLoading: coordenadoresLoading } = useCoordenadoresByEvent({
        eventId: String(params.id)
    })
    const { data: vagas = [], isLoading: vagasLoading } = useEventVehiclesByEvent({
        eventId: String(params.id)
    })
    const { data: empresas = [], isLoading: empresasLoading } = useEmpresasByEvent(String(params.id))

    const [deletingParticipant, setDeletingParticipant] = useState<EventParticipant | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDay, setSelectedDay] = useState<string>('all')
    const [importExportOpen, setImportExportOpen] = useState(false)
    const tabsContainerRef = useRef<HTMLDivElement>(null)

    const evento = Array.isArray(eventos)
        ? eventos.find((e) => String(e.id) === String(params.id))
        : undefined

    const participantsArray = Array.isArray(participantsData) ? participantsData : []
    const wristbandsArray = Array.isArray(wristbands) ? wristbands : []
    const wristbandModelsArray = Array.isArray(wristbandModels) ? wristbandModels : []

    // Criar mapa de modelos de pulseira
    const wristbandModelMap = useMemo(() => {
        const map: Record<string, unknown> = {}
        wristbandModelsArray.forEach(model => {
            map[model.id] = model
        })
        return map
    }, [wristbandModelsArray])

    // Função para gerar tabs dos dias do evento
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string }> => {
        if (!evento) return [];

        const days: Array<{ id: string; label: string; date: string; type: string }> = [];

        // Adicionar dia "Todos"
        days.push({ id: 'all', label: 'TODOS', date: '', type: 'all' });

        // Adicionar dias de montagem
        if (evento.setupStartDate && evento.setupEndDate) {
            const startDate = new Date(evento.setupStartDate);
            const endDate = new Date(evento.setupEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR');
                days.push({
                    id: dateStr,
                    label: `${dateStr} (MONTAGEM)`,
                    date: dateStr,
                    type: 'setup'
                });
            }
        }

        // Adicionar dias de Evento/evento
        if (evento.preparationStartDate && evento.preparationEndDate) {
            const startDate = new Date(evento.preparationStartDate);
            const endDate = new Date(evento.preparationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR');
                days.push({
                    id: dateStr,
                    label: `${dateStr} (EVENTO)`,
                    date: dateStr,
                    type: 'preparation'
                });
            }
        }

        // Adicionar dias de finalização
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            const startDate = new Date(evento.finalizationStartDate);
            const endDate = new Date(evento.finalizationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR');
                days.push({
                    id: dateStr,
                    label: `${dateStr} (DESMONTAGEM)`,
                    date: dateStr,
                    type: 'finalization'
                });
            }
        }

        return days;
    }, [evento]);

    // Função para filtrar participantes por dia selecionado
    const getParticipantesPorDia = useCallback((dia: string): EventParticipant[] => {
        if (dia === 'all') {
            return participantsArray;
        }

        return participantsArray.filter((participant: EventParticipant) => {
            if (!participant.daysWork || participant.daysWork.length === 0) {
                return false; // Se não tem dias de trabalho definidos, não aparece em nenhum dia específico
            }
            return participant.daysWork.includes(dia);
        });
    }, [participantsArray]);

    // Funções para controlar o carrossel dos dias
    const scrollToLeft = useCallback(() => {
        if (tabsContainerRef.current) {
            const container = tabsContainerRef.current;
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
    }, []);

    const scrollToRight = useCallback(() => {
        if (tabsContainerRef.current) {
            const container = tabsContainerRef.current;
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }, []);

    // Função para obter a cor da tab baseada no tipo de dia
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'setup':
                    return 'border-yellow-500 text-yellow-600 bg-yellow-50';
                case 'preparation':
                    return 'border-blue-500 text-blue-600 bg-blue-50';
                case 'finalization':
                    return 'border-purple-500 text-purple-600 bg-purple-50';
                default:
                    return 'border-purple-500 text-purple-600 bg-purple-50';
            }
        } else {
            switch (type) {
                case 'setup':
                    return 'hover:text-yellow-700 hover:border-yellow-300';
                case 'preparation':
                    return 'hover:text-blue-700 hover:border-blue-300';
                case 'finalization':
                    return 'hover:text-purple-700 hover:border-purple-300';
                default:
                    return 'hover:text-gray-700 hover:border-gray-300';
            }
        }
    }, []);

    // KPIs baseados no dia selecionado
    const participantesDoDia = getParticipantesPorDia(selectedDay)
    const totalParticipants = participantesDoDia.length
    const participantsWithWristbands = participantesDoDia.filter(p => p.wristbandId).length
    const participantsWithoutWristbands = totalParticipants - participantsWithWristbands
    const checkedInParticipants = participantesDoDia.filter(p => p.checkIn).length
    const checkedOutParticipants = participantesDoDia.filter(p => p.checkOut).length
    const activeParticipants = checkedInParticipants - checkedOutParticipants

    // Filtrar participantes
    const filteredParticipants = useMemo(() => {
        let filtered = participantesDoDia

        // Filtrar por termo de busca
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.cpf?.includes(searchTerm) ||
                p.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.role?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        return filtered
    }, [participantesDoDia, searchTerm])

    if (!evento) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                    <Button onClick={() => router.back()}>Voltar</Button>
                </div>
            </div>
        )
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const handleDeleteParticipant = (participant: EventParticipant) => {
        setDeletingParticipant(participant)
    }

    const confirmDeleteParticipant = () => {
        if (!deletingParticipant) return

        deleteParticipant(
            {
                id: deletingParticipant.id,
                performedBy: "current-user"
            },
            {
                onSuccess: () => {
                    toast.success("Participante excluído com sucesso!")
                    setDeletingParticipant(null)
                },
                onError: (error) => {
                    console.error("Erro ao excluir participante:", error)
                    toast.error("Erro ao excluir participante. Tente novamente.")
                },
            }
        )
    }

    const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    const getBotaoAcao = (participant: EventParticipant) => {
        if (!participant.checkIn) return "checkin"
        if (participant.checkIn && !participant.checkOut) return "checkout"
        return "none"
    }

    const isLoading = participantsLoading || wristbandsLoading || wristbandModelsLoading || coordenadoresLoading || vagasLoading || empresasLoading

    return (
        <EventLayout eventId={String(params.id)} eventName={evento.name}>
            <div className="p-8">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Participantes</p>
                                    <p className="text-3xl font-bold">{totalParticipants}</p>
                                </div>
                                <Users className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Com Pulseira</p>
                                    <p className="text-3xl font-bold">{participantsWithWristbands}</p>
                                </div>
                                <div className="h-8 w-8 opacity-80 rounded-full border-2 border-white"></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Check-in</p>
                                    <p className="text-3xl font-bold">{checkedInParticipants}</p>
                                </div>
                                <Check className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Ativos</p>
                                    <p className="text-3xl font-bold">{activeParticipants}</p>
                                </div>
                                <User className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Coordenadores</p>
                                    <p className="text-3xl font-bold">{coordenadores.length}</p>
                                </div>
                                <UserCog className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Vagas</p>
                                    <p className="text-3xl font-bold">{vagas.length}</p>
                                </div>
                                <Building className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Empresas</p>
                                    <p className="text-3xl font-bold">{empresas?.length || 0}</p>
                                </div>
                                <Building className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Bar */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="btn-brand-green"
                                disabled={isLoading}
                                onClick={() => router.push(`/eventos/${params.id}/import-export`)}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Importar/Exportar
                            </Button>


                            <Button
                                variant="outline"
                                size="sm"
                                className="text-gray-600 border-gray-200 hover:bg-gray-50 text-gray-600 hover:border-gray-300 bg-white shadow-sm transition-all duration-200"
                                disabled={isLoading}
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filtros
                            </Button>
                        </div>

                        <EventParticipantCreateDialog />
                    </div>
                </div>

                {/* Estatísticas Detalhadas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Estatísticas de Coordenadores */}
                    <Card className="bg-white shadow-lg border border-gray-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                                <UserCog className="h-5 w-5 mr-2 text-indigo-600" />
                                Coordenadores
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Total</span>
                                    <span className="font-semibold text-indigo-600">{coordenadores.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Coordenadores Gerais</span>
                                    <span className="font-semibold text-indigo-600">
                                        {coordenadores.filter(c => c.metadata?.eventos?.[0]?.role === 'coordenador_geral').length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Coordenadores</span>
                                    <span className="font-semibold text-indigo-600">
                                        {coordenadores.filter(c => c.metadata?.eventos?.[0]?.role === 'coordenador').length}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Estatísticas de Vagas */}
                    <Card className="bg-white shadow-lg border border-gray-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                                <Building className="h-5 w-5 mr-2 text-teal-600" />
                                Vagas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Total</span>
                                    <span className="font-semibold text-teal-600">{vagas.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Retiradas</span>
                                    <span className="font-semibold text-teal-600">
                                        {vagas.filter(v => v.status).length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Pendentes</span>
                                    <span className="font-semibold text-teal-600">
                                        {vagas.filter(v => !v.status).length}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Estatísticas de Participantes */}
                    <Card className="bg-white shadow-lg border border-gray-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                                <Users className="h-5 w-5 mr-2 text-blue-600" />
                                Participantes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Total</span>
                                    <span className="font-semibold text-blue-600">{totalParticipants}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Com Pulseira</span>
                                    <span className="font-semibold text-blue-600">{participantsWithWristbands}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Ativos</span>
                                    <span className="font-semibold text-blue-600">{activeParticipants}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="Procure pelo participante, CPF ou empresa"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 shadow-sm transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Tabs dos dias do evento com carrossel */}
                <div className="mb-8">
                    <div className="border-b border-gray-200 bg-white rounded-t-lg relative">
                        {/* Botão de navegação esquerda */}
                        <button
                            onClick={scrollToLeft}
                            className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-white border-r border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors duration-200"
                        >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Container dos tabs com scroll */}
                        <nav
                            ref={tabsContainerRef}
                            className="-mb-px flex space-x-2 px-6 overflow-x-auto scrollbar-hide"
                        >
                            {getEventDays().map((day) => {
                                const participantesNoDia = getParticipantesPorDia(day.id).length;
                                const isActive = selectedDay === day.id;

                                return (
                                    <button
                                        key={day.id}
                                        onClick={() => setSelectedDay(day.id)}
                                        className={`border-b-2 py-3 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                                            ? getTabColor(day.type, true)
                                            : `border-transparent text-gray-500 ${getTabColor(day.type, false)}`
                                            }`}
                                    >
                                        {day.label} ({participantesNoDia})
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Botão de navegação direita */}
                        <button
                            onClick={scrollToRight}
                            className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-white border-l border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors duration-200"
                        >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                    Participante
                                </TableHead>
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                                    Empresa
                                </TableHead>
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                                    Validado Por
                                </TableHead>
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                    CPF
                                </TableHead>
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                    Ações
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white divide-y divide-gray-100 text-gray-600">
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="px-6 py-16 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                <User className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-lg font-semibold text-gray-700 mb-2">Carregando...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredParticipants.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="px-6 py-16 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                <User className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-lg font-semibold text-gray-700 mb-2">
                                                {selectedDay === 'all'
                                                    ? 'Nenhum participante encontrado'
                                                    : `Nenhum participante encontrado para ${selectedDay}`
                                                }
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {selectedDay === 'all'
                                                    ? 'Tente ajustar os filtros ou adicionar novos participantes'
                                                    : 'Adicione participantes com dias de trabalho definidos ou ajuste os filtros'
                                                }
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredParticipants.map((participant: EventParticipant, index: number) => {
                                const botaoTipo = getBotaoAcao(participant)
                                const wristband = wristbandsArray.find(w => w.id === participant.wristbandId)
                                const wristbandModel = wristband ? wristbandModelMap[wristband.wristbandModelId] : undefined

                                return (
                                    <TableRow
                                        key={index}
                                        className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 cursor-pointer transition-all duration-200"
                                    >
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-12 w-12">
                                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                                                        <span className="text-sm font-bold text-white">
                                                            {getInitials(participant.name)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {participant.name}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {participant.role}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                                            <div className="space-y-1">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {participant.company}
                                                </span>
                                                {participant.daysWork && participant.daysWork.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {participant.daysWork.slice(0, 2).map((day, idx) => (
                                                            <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                {day}
                                                            </span>
                                                        ))}
                                                        {participant.daysWork.length > 2 && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                +{participant.daysWork.length - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                                            <p className="text-gray-600">{participant.validatedBy || '-'}</p>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                            <p className="text-gray-600">{participant.cpf}</p>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                                {botaoTipo === "checkin" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                                        disabled={isLoading}
                                                    >
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Check-in
                                                    </Button>
                                                )}
                                                {botaoTipo === "checkout" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                                        disabled={isLoading}
                                                    >
                                                        <Clock className="w-4 h-4 mr-1" />
                                                        Check-out
                                                    </Button>
                                                )}
                                                <EventParticipantEditDialog participant={participant} />
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteParticipant(participant)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Dialog de Confirmação de Exclusão de Participante */}
            <AlertDialog open={!!deletingParticipant} onOpenChange={(open) => !open && setDeletingParticipant(null)}>
                <AlertDialogContent className="bg-white text-black">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o participante &quot;{deletingParticipant?.name}&quot;?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteParticipant}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* DIALOG DUPLICADOS */}
            {/* This section is no longer needed as the import/export system handles duplicates */}

            {/* DIALOG RESUMO IMPORTAÇÃO */}
            {/* This section is no longer needed as the import/export system handles resumo */}
        </EventLayout>
    )
}