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
import { useUpdateEventParticipant } from '@/features/eventos/api/mutation/use-update-event-participant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Calendar, Clock, MapPin, Mail, Phone, UserCog, Eye, Trash2, Users, Building, Search, Download, Upload, Plus, Filter, User, Check, X, Loader2 } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { EventParticipant } from '@/features/eventos/types'
import EventParticipantCreateDialog from '@/features/eventos/components/event-participant-create-dialog'
import EventParticipantEditDialog from '@/features/eventos/components/event-participant-edit-dialog'
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
    const { mutate: updateParticipant, isPending: isUpdatingParticipant } = useUpdateEventParticipant()

    const [deletingParticipant, setDeletingParticipant] = useState<EventParticipant | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDay, setSelectedDay] = useState<string>('')
    const [replicatingStaff, setReplicatingStaff] = useState<string | null>(null)
    const [showReplicateDialog, setShowReplicateDialog] = useState(false)
    const [replicateSourceDay, setReplicateSourceDay] = useState<string>('')
    const [replicateMode, setReplicateMode] = useState<'replace' | 'skip' | 'reset'>('skip')
    const [showProgressDialog, setShowProgressDialog] = useState(false)
    const [progressData, setProgressData] = useState<{
        total: number
        current: number
        processed: number
        skipped: number
        reset: number
        currentParticipant: string
    }>({
        total: 0,
        current: 0,
        processed: 0,
        skipped: 0,
        reset: 0,
        currentParticipant: ''
    })

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

    // Função para normalizar formato de data
    const normalizeDate = useCallback((dateStr: string): string => {
        // Se já está no formato dd/mm/yyyy, retorna como está
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            return dateStr;
        }

        // Se está no formato yyyy-mm-dd, converte para dd/mm/yyyy
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }

        // Se é uma data JavaScript, converte para dd/mm/yyyy
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('pt-BR');
            }
        } catch (error) {
            console.error('Erro ao converter data:', dateStr, error);
        }

        return dateStr;
    }, []);

    // Função para gerar tabs dos dias do evento
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string }> => {
        if (!evento) return [];

        const days: Array<{ id: string; label: string; date: string; type: string }> = [];

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
        return participantsArray.filter((participant: EventParticipant) => {
            if (!participant.daysWork || participant.daysWork.length === 0) {
                return false; // Se não tem dias de trabalho definidos, não aparece em nenhum dia específico
            }

            // Normalizar o dia selecionado
            const normalizedDia = normalizeDate(dia);

            // Verificar se algum dos dias de trabalho do participante corresponde ao dia selecionado
            const hasDay = participant.daysWork.some(workDay => {
                const normalizedWorkDay = normalizeDate(workDay);
                const matches = normalizedWorkDay === normalizedDia;
                return matches;
            });

            return hasDay;
        });
    }, [participantsArray, normalizeDate]);

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

    // Função para abrir popup de replicação de staff
    const handleOpenReplicateDialog = (sourceDay: string) => {
        setReplicateSourceDay(sourceDay)
        setShowReplicateDialog(true)
    }

    // Função para replicar staff rapidamente
    const handleReplicateStaff = async () => {
        if (!replicateSourceDay) return

        setReplicatingStaff(replicateSourceDay)
        setShowReplicateDialog(false)

        try {
            console.log('Todos os participantes disponíveis:', participantsArray)
            console.log('Dia atual selecionado:', selectedDay)

            // Buscar todos os participantes que trabalham no dia de origem
            const participantsFromSourceDay = getParticipantesPorDia(replicateSourceDay)

            console.log('Dia de origem:', replicateSourceDay)
            console.log('Participantes encontrados no dia de origem:', participantsFromSourceDay)

            // Inicializar dados de progresso
            setProgressData({
                total: participantsFromSourceDay.length,
                current: 0,
                processed: 0,
                skipped: 0,
                reset: 0,
                currentParticipant: ''
            })
            setShowProgressDialog(true)

            let processedCount = 0
            let skippedCount = 0
            let resetCount = 0

            // Para cada participante do dia de origem, adicionar ao dia atual
            for (let i = 0; i < participantsFromSourceDay.length; i++) {
                const participant = participantsFromSourceDay[i]
                const currentParticipantName = participant.name || 'Participante sem nome'

                // Atualizar progresso
                setProgressData(prev => ({
                    ...prev,
                    current: i + 1,
                    currentParticipant: currentParticipantName
                }))

                const currentDaysWork = participant.daysWork || []
                const alreadyWorksToday = currentDaysWork.includes(selectedDay)

                if (alreadyWorksToday) {
                    switch (replicateMode) {
                        case 'skip':
                            console.log(`Pulando ${participant.name} - já trabalha no dia ${selectedDay}`)
                            skippedCount++
                            setProgressData(prev => ({ ...prev, skipped: skippedCount }))
                            break
                        case 'replace':
                            // Manter o dia, mas resetar check-in/check-out se necessário
                            // TODO: Implementar reset via API
                            console.log(`Resetando check-in/check-out para ${participant.name} no dia ${selectedDay}`)
                            resetCount++
                            processedCount++
                            setProgressData(prev => ({
                                ...prev,
                                reset: resetCount,
                                processed: processedCount
                            }))
                            break
                        case 'reset':
                            // TODO: Implementar reset via API
                            console.log(`Resetando check-in/check-out para ${participant.name} no dia ${selectedDay}`)
                            resetCount++
                            processedCount++
                            setProgressData(prev => ({
                                ...prev,
                                reset: resetCount,
                                processed: processedCount
                            }))
                            break
                    }
                } else {
                    // Adicionar o dia atual aos dias de trabalho
                    const updatedDaysWork = [...currentDaysWork, selectedDay]

                    try {
                        // Atualizar participante via API
                        console.log(`Adicionando dia ${selectedDay} para ${participant.name}`)
                        console.log(`Dias de trabalho atualizados: ${updatedDaysWork.join(', ')}`)

                        // Chamar a API para atualizar o participante
                        const updateData = {
                            id: participant.id,
                            eventId: participant.eventId || String(params.id),
                            name: participant.name || '',
                            cpf: participant.cpf || '',
                            role: participant.role || '',
                            company: participant.company || '',
                            daysWork: updatedDaysWork
                        }

                        console.log('Dados para atualização:', updateData)

                        updateParticipant(updateData, {
                            onSuccess: () => {
                                console.log(`✅ ${participant.name} atualizado com sucesso`)
                                processedCount++
                                setProgressData(prev => ({ ...prev, processed: processedCount }))
                            },
                            onError: (error) => {
                                console.error(`❌ Erro ao atualizar ${participant.name}:`, error)
                            }
                        })

                        // Simular delay para mostrar progresso
                        await new Promise(resolve => setTimeout(resolve, 500))

                    } catch (error) {
                        console.error(`Erro ao atualizar ${participant.name}:`, error)
                    }
                }
            }

            // Fechar popup de progresso após delay
            setTimeout(() => {
                setShowProgressDialog(false)
                setReplicatingStaff(null)

                toast.success(
                    `Replicação concluída! ${processedCount} processados, ${skippedCount} pulados, ${resetCount} resetados.`
                )
            }, 1000)

        } catch (error) {
            console.error('Erro na replicação:', error)
            setShowProgressDialog(false)
            setReplicatingStaff(null)
            toast.error('Erro ao replicar participantes')
        }
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
                        {/* Container dos tabs sem scroll horizontal */}
                        <nav
                            className="-mb-px flex flex-wrap gap-1 px-4 py-2"
                        >
                            {getEventDays().map((day) => {
                                const participantesNoDia = getParticipantesPorDia(day.id).length;
                                const isActive = selectedDay === day.id;

                                return (
                                    <div key={day.id} className="flex items-center gap-2">
                                        <button
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
                                                    ({participantesNoDia})
                                                </span>
                                            </div>
                                        </button>
                                        {isActive && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleOpenReplicateDialog(day.id)}
                                                disabled={replicatingStaff === day.id}
                                                className="text-xs h-6 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                            >
                                                {replicatingStaff === day.id ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                                        Replicando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Users className="w-3 h-3 mr-1" />
                                                        Replicar Participantes
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
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
                                                Nenhum participante encontrado para {selectedDay}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Adicione participantes com dias de trabalho definidos ou ajuste os filtros
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

            {/* Dialog de Replicação de Staff */}
            <AlertDialog open={showReplicateDialog} onOpenChange={setShowReplicateDialog}>
                <AlertDialogContent className="bg-white text-black max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-green-600" />
                            Replicar Participantes
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Escolha o dia de origem e como tratar participantes que já trabalham no dia atual.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Seleção do dia de origem */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dia de Origem
                            </label>
                            <select
                                value={replicateSourceDay}
                                onChange={(e) => setReplicateSourceDay(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Selecione um dia</option>
                                {getEventDays().map((day) => (
                                    <option key={day.id} value={day.id}>
                                        {day.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Opções de tratamento de dados existentes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Se o staff já trabalha no dia atual:
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="replicateMode"
                                        value="skip"
                                        checked={replicateMode === 'skip'}
                                        onChange={(e) => setReplicateMode(e.target.value as 'replace' | 'skip' | 'reset')}
                                        className="mr-2 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm text-gray-700">Pular (manter como está)</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="replicateMode"
                                        value="replace"
                                        checked={replicateMode === 'replace'}
                                        onChange={(e) => setReplicateMode(e.target.value as 'replace' | 'skip' | 'reset')}
                                        className="mr-2 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm text-gray-700">Resetar check-in/check-out</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="replicateMode"
                                        value="reset"
                                        checked={replicateMode === 'reset'}
                                        onChange={(e) => setReplicateMode(e.target.value as 'replace' | 'skip' | 'reset')}
                                        className="mr-2 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm text-gray-700">Resetar check-in/check-out</span>
                                </label>
                            </div>
                        </div>

                        {/* Informações sobre a replicação */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">Como funciona</span>
                            </div>
                            <div className="text-xs text-blue-700">
                                Serão trazidos todos os participantes (coordenadores, organizadores, etc.)
                                que trabalham no dia selecionado para o dia atual.
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReplicateStaff}
                            disabled={!replicateSourceDay}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {replicatingStaff ? "Replicando..." : "Replicar Participantes"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Popup de Progresso */}
            <AlertDialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            Replicando Participantes
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Atualizando dias de trabalho...
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4">
                        {/* Barra de Progresso */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progresso</span>
                                <span>{progressData.current} / {progressData.total}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${progressData.total > 0 ? (progressData.current / progressData.total) * 100 : 0}%`
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Participante Atual */}
                        {progressData.currentParticipant && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                        Processando: {progressData.currentParticipant}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Estatísticas */}
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                                <div className="font-bold text-green-700">{progressData.processed}</div>
                                <div className="text-xs text-green-600">Processados</div>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-center">
                                <div className="font-bold text-yellow-700">{progressData.skipped}</div>
                                <div className="text-xs text-yellow-600">Pulados</div>
                            </div>
                            <div className="bg-orange-50 border border-orange-200 rounded p-2 text-center">
                                <div className="font-bold text-orange-700">{progressData.reset}</div>
                                <div className="text-xs text-orange-600">Resetados</div>
                            </div>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* DIALOG DUPLICADOS */}
            {/* This section is no longer needed as the import/export system handles duplicates */}

            {/* DIALOG RESUMO IMPORTAÇÃO */}
            {/* This section is no longer needed as the import/export system handles resumo */}
        </EventLayout>
    )
}