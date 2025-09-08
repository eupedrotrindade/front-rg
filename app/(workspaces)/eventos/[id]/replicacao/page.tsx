/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import {
    ArrowLeft,
    Copy,
    Check,
    ChevronDown,
    Clock,
    Sun,
    Moon,
    Users,
    Building2,
    CreditCard,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    Play,
    Pause,
    RotateCcw,
    Filter,
    X,
} from 'lucide-react'

import EventLayout from '@/components/dashboard/dashboard-layout'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useEventParticipantsGrouped } from '@/features/eventos/api/query/use-event-participants-grouped'
import { useEmpresasByEvent } from '@/features/eventos/api/query/use-empresas'
import { useCredentials } from '@/features/eventos/api/query'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { EventParticipant } from '@/features/eventos/types'
import { useEventDays } from '@/features/eventos/hooks/use-event-days'
import { useParticipantReplication } from '@/features/eventos/hooks/use-participant-replication'
import { EventDaySelector } from '@/features/eventos/components/event-day-selector'


export default function ParticipantReplicationPage() {
    const params = useParams()
    const router = useRouter()
    // Dados do evento
    const { data: eventos, isLoading: eventosLoading } = useEventos()
    const evento = useMemo(() => {
        return Array.isArray(eventos)
            ? eventos.find(e => String(e.id) === String(params.id))
            : undefined
    }, [eventos, params.id])

    // Dados dos participantes
    const { data: participantsData = [] } = useEventParticipantsByEvent({
        eventId: String(params.id)
    })
    const { data: groupedParticipantsData = [] } = useEventParticipantsGrouped({
        eventId: String(params.id)
    })
    const { data: empresas = [] } = useEmpresasByEvent(String(params.id))
    const { data: credentials } = useCredentials({ eventId: String(params.id) })

    // Estados da interface
    const [selectedSourceDay, setSelectedSourceDay] = useState<string>('')
    const [selectedTargetDay, setSelectedTargetDay] = useState<string>('')
    const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [showProgressDialog, setShowProgressDialog] = useState(false)
    
    // ✅ NOVO: Estados para filtro por empresa
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
    const [showCompanySelector, setShowCompanySelector] = useState(false)

    // Estado da análise de replicação
    const [replicationData, setReplicationData] = useState<any | null>(null)

    // Hook para gerenciar dias do evento
    const { eventDays, parseShiftId } = useEventDays(evento)

    // Função para obter participantes de um turno específico
    const getParticipantsByShift = useCallback((shiftId: string): EventParticipant[] => {
        if (!shiftId) return []

        const expandedParticipants: EventParticipant[] = []

        groupedParticipantsData.forEach(group => {
            const currentShiftParticipant = group.shifts.find(shift => (shift as any).shiftId === shiftId)

            if (currentShiftParticipant) {
                expandedParticipants.push(currentShiftParticipant)
            } else {
                const participant = group.participant
                if (participant.daysWork && participant.daysWork.length > 0) {
                    const hasDay = participant.daysWork.some(workDay => {
                        if (workDay === shiftId) {
                            return true
                        }
                        const { dateFormatted } = parseShiftId(shiftId)
                        const normalizedDia = dateFormatted
                        const normalizedWorkDay = workDay
                        return normalizedWorkDay === normalizedDia
                    })

                    if (hasDay) {
                        expandedParticipants.push(participant)
                    }
                }
            }
        })

        return expandedParticipants
    }, [groupedParticipantsData, parseShiftId])

    // ✅ NOVO: Obter empresas únicas dos participantes de um turno
    const getCompaniesFromShift = useCallback((shiftId: string): string[] => {
        if (!shiftId) return []
        
        const participants = getParticipantsByShift(shiftId)
        const companies = participants
            .map(p => p.company)
            .filter(company => company && company.trim() !== '')
            .filter((company, index, array) => array.indexOf(company) === index) // Remover duplicatas
            .sort()
        
        return companies
    }, [getParticipantsByShift])
    
    // ✅ NOVO: Função para obter participantes filtrados por empresa
    const getFilteredParticipants = useCallback((shiftId: string): EventParticipant[] => {
        if (!shiftId) return []
        
        const allParticipants = getParticipantsByShift(shiftId)
        
        // Se nenhuma empresa foi selecionada, retornar todos
        if (selectedCompanies.length === 0) {
            return allParticipants
        }
        
        // Filtrar apenas participantes das empresas selecionadas
        return allParticipants.filter(participant => 
            participant.company && selectedCompanies.includes(participant.company)
        )
    }, [getParticipantsByShift, selectedCompanies])

    // Hook para replicação de participantes
    const replicationHook = useParticipantReplication({
        eventId: String(params.id),
        getParticipantsByShift,
        empresas: empresas ?? [],
        credentials: credentials ?? [],
        parseShiftId
    })
    
    // ✅ NOVO: Memoizar lista de empresas do turno de origem
    const sourceShiftCompanies = useMemo(() => {
        return getCompaniesFromShift(selectedSourceDay)
    }, [selectedSourceDay, getCompaniesFromShift])

    // ✅ MODIFICADO: Função para analisar replicação com filtro por empresa
    const analyzeReplication = useCallback(() => {
        // Usar participantes filtrados por empresa
        const filteredSourceParticipants = getFilteredParticipants(selectedSourceDay)
        
        // Criar uma análise customizada considerando apenas os participantes filtrados
        const analysis = replicationHook.analyzeReplicationWithFilter(
            selectedSourceDay, 
            selectedTargetDay,
            filteredSourceParticipants
        )
        
        if (analysis) {
            setReplicationData(analysis)
            setShowAnalysisDialog(true)
        }
    }, [selectedSourceDay, selectedTargetDay, replicationHook, getFilteredParticipants])
    
    // ✅ NOVO: Funções para gerenciar seleção de empresas
    const toggleCompanySelection = useCallback((company: string) => {
        setSelectedCompanies(prev => {
            if (prev.includes(company)) {
                return prev.filter(c => c !== company)
            } else {
                return [...prev, company]
            }
        })
    }, [])
    
    const selectAllCompanies = useCallback(() => {
        if (!selectedSourceDay) return
        const allCompanies = getCompaniesFromShift(selectedSourceDay)
        setSelectedCompanies(allCompanies)
    }, [selectedSourceDay, getCompaniesFromShift])
    
    const clearCompanySelection = useCallback(() => {
        setSelectedCompanies([])
    }, [])
    
    // ✅ NOVO: Limpar filtros quando mudar turno de origem
    const handleSourceDayChange = useCallback((dayId: string) => {
        setSelectedSourceDay(dayId)
        setSelectedCompanies([]) // Limpar seleção de empresas
    }, [])


    // Função para processar replicação
    const processReplication = useCallback(async () => {
        if (!replicationData) return

        setShowAnalysisDialog(false)
        setShowProgressDialog(true)

        const result = await replicationHook.processReplication(
            replicationData,
            (progress, step) => {
                // Callback de progresso não usado na UI simplificada
            }
        )

        setShowProgressDialog(false)

        if (result.success) {
            // Limpar seleções após sucesso
            setSelectedSourceDay('')
            setSelectedTargetDay('')
            setReplicationData(null)
        }
    }, [replicationData, replicationHook])


    if (eventosLoading) {
        return (
            <EventLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </EventLayout>
        )
    }

    if (!evento) {
        return (
            <EventLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Evento não encontrado</h3>
                        <p className="text-muted-foreground">O evento solicitado não foi encontrado.</p>
                    </div>
                </div>
            </EventLayout>
        )
    }

    return (
        <EventLayout eventId={evento.id} eventName={evento.name}>
            <div className="space-y-6 p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Replicação de Participantes</h1>
                            <p className="text-muted-foreground">
                                {evento.name} - Replique participantes entre turnos
                            </p>
                        </div>
                    </div>
                    <Copy className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Seleção de Turnos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Configuração da Replicação
                        </CardTitle>
                        <CardDescription>
                            Selecione o turno de origem e o turno de destino para replicar os participantes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Turno de Origem */}
                            <EventDaySelector
                                eventDays={eventDays}
                                selectedDay={selectedSourceDay}
                                onSelectDay={handleSourceDayChange}
                                label="Turno de Origem"
                                placeholder="Selecionar turno de origem"
                                participantCount={getParticipantsByShift(selectedSourceDay).length}
                                showParticipantCount={true}
                                disabled={replicationHook.isProcessing}
                            />

                            {/* Turno de Destino */}
                            <EventDaySelector
                                eventDays={eventDays}
                                selectedDay={selectedTargetDay}
                                onSelectDay={setSelectedTargetDay}
                                label="Turno de Destino"
                                placeholder="Selecionar turno de destino"
                                participantCount={getParticipantsByShift(selectedTargetDay).length}
                                showParticipantCount={true}
                                disabled={replicationHook.isProcessing}
                            />
                        </div>

                        {/* ✅ NOVO: Filtro por Empresa */}
                        {selectedSourceDay && sourceShiftCompanies.length > 0 && (
                            <Card className="border-dashed">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <Filter className="h-4 w-4" />
                                        Filtrar por Empresa
                                        <Badge variant="secondary" className="ml-auto">
                                            {selectedCompanies.length} de {sourceShiftCompanies.length} selecionadas
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Selecione as empresas que deseja replicar para otimizar o processo
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Botões de ação */}
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={selectAllCompanies}
                                            disabled={replicationHook.isProcessing}
                                        >
                                            <Check className="h-3 w-3 mr-1" />
                                            Selecionar Todas
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={clearCompanySelection}
                                            disabled={replicationHook.isProcessing}
                                        >
                                            <X className="h-3 w-3 mr-1" />
                                            Limpar Seleção
                                        </Button>
                                    </div>
                                    
                                    {/* Lista de empresas */}
                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
                                        <div className="text-xs font-medium text-muted-foreground mb-2">
                                            Empresas disponíveis no turno de origem:
                                        </div>
                                        {sourceShiftCompanies.map(company => {
                                            const isSelected = selectedCompanies.includes(company)
                                            const participantCount = getParticipantsByShift(selectedSourceDay)
                                                .filter(p => p.company === company).length
                                            
                                            return (
                                                <div 
                                                    key={company}
                                                    className={`group p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                                        isSelected 
                                                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                                    }`}
                                                    onClick={() => toggleCompanySelection(company)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                                            isSelected 
                                                                ? 'bg-blue-500 border-blue-500'
                                                                : 'border-gray-300 group-hover:border-gray-400'
                                                        }`}>
                                                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <div className="text-sm font-medium text-gray-900 truncate pr-2">
                                                                    {company}
                                                                </div>
                                                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                                    isSelected 
                                                                        ? 'bg-blue-100 text-blue-700'
                                                                        : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                    <Users className="h-3 w-3" />
                                                                    {participantCount}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                {participantCount} funcionário{participantCount !== 1 ? 's' : ''} no turno
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    
                                    {/* Resumo da seleção */}
                                    {selectedCompanies.length > 0 && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users className="h-4 w-4 text-blue-600" />
                                                <span className="text-sm font-medium text-blue-900">
                                                    Participantes selecionados: {getFilteredParticipants(selectedSourceDay).length}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedCompanies.slice(0, 5).map(company => (
                                                    <Badge key={company} variant="secondary" className="text-xs">
                                                        {company.length > 15 ? company.substring(0, 15) + '...' : company}
                                                    </Badge>
                                                ))}
                                                {selectedCompanies.length > 5 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        +{selectedCompanies.length - 5} mais
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Botão de Análise */}
                        <div className="flex justify-center">
                            <Button
                                onClick={analyzeReplication}
                                disabled={!selectedSourceDay || !selectedTargetDay || replicationHook.isProcessing}
                                className="flex items-center gap-2"
                                size="lg"
                            >
                                {replicationHook.isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                                Analisar Replicação
                                {selectedCompanies.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {getFilteredParticipants(selectedSourceDay).length} selecionados
                                    </Badge>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Informações dos Turnos Selecionados */}
                {(selectedSourceDay || selectedTargetDay) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedSourceDay && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm text-muted-foreground">Turno de Origem</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="font-medium">
                                            {eventDays.find(d => d.id === selectedSourceDay)?.label}
                                        </div>
                                        <div className="text-2xl font-bold">
                                            {selectedCompanies.length > 0 
                                                ? getFilteredParticipants(selectedSourceDay).length
                                                : getParticipantsByShift(selectedSourceDay).length
                                            }
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {selectedCompanies.length > 0 ? 'participantes filtrados' : 'participantes'}
                                            {selectedCompanies.length > 0 && (
                                                <div className="text-xs text-blue-600 mt-1">
                                                    de {getParticipantsByShift(selectedSourceDay).length} total
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {selectedTargetDay && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm text-muted-foreground">Turno de Destino</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="font-medium">
                                            {eventDays.find(d => d.id === selectedTargetDay)?.label}
                                        </div>
                                        <div className="text-2xl font-bold">
                                            {getParticipantsByShift(selectedTargetDay).length}
                                        </div>
                                        <div className="text-sm text-muted-foreground">participantes existentes</div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Dialog de Análise */}
                <Dialog open={showAnalysisDialog && replicationData !== null} onOpenChange={setShowAnalysisDialog}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Copy className="h-5 w-5" />
                                Análise da Replicação
                            </DialogTitle>
                            <DialogDescription>
                                Revise os detalhes da replicação antes de prosseguir
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Resumo */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-blue-500" />
                                            <div className="text-sm text-muted-foreground">Participantes</div>
                                        </div>
                                        <div className="text-2xl font-bold">
                                            {replicationData?.participantsToReplicate?.length || 0}
                                        </div>
                                        <div className="text-xs text-muted-foreground">para replicar</div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-green-500" />
                                            <div className="text-sm text-muted-foreground">Empresas</div>
                                        </div>
                                        <div className="text-2xl font-bold">
                                            {replicationData?.companiesAnalysis?.needingCreation?.length || 0}
                                        </div>
                                        <div className="text-xs text-muted-foreground">para criar</div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4 text-purple-500" />
                                            <div className="text-sm text-muted-foreground">Credenciais</div>
                                        </div>
                                        <div className="text-2xl font-bold">
                                            {replicationData?.credentialsAnalysis?.needingCreation?.length || 0}
                                        </div>
                                        <div className="text-xs text-muted-foreground">para criar</div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detalhes das Empresas */}
                            {(replicationData?.companiesAnalysis?.needingCreation?.length || 0) > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Empresas que serão criadas:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {replicationData?.companiesAnalysis?.needingCreation?.map((company: any, index: any) => (
                                            <Badge key={index} variant="secondary">
                                                {company}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Detalhes das Credenciais */}
                            {(replicationData?.credentialsAnalysis?.needingCreation?.length || 0) > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Credenciais que serão criadas:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {replicationData?.credentialsAnalysis?.needingCreation?.map((credential: any, index: any) => (
                                            <Badge key={index} variant="secondary">
                                                {credential}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tempo Estimado */}
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">Tempo Estimado</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Aproximadamente {replicationHook.formatTime(replicationData?.rateLimiting?.estimatedTime || 0)} para completar a replicação
                                </div>
                            </div>

                            {/* Aviso */}
                            {(replicationData?.participantsToReplicate?.length || 0) === 0 && replicationData && (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-yellow-800">Nenhum participante para replicar</div>
                                            <div className="text-sm text-yellow-700">
                                                Todos os participantes do turno de origem já existem no turno de destino.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowAnalysisDialog(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowAnalysisDialog(false)
                                    setShowConfirmDialog(true)
                                }}
                                disabled={(replicationData?.participantsToReplicate?.length || 0) === 0}
                                className="flex items-center gap-2"
                            >
                                <Play className="h-4 w-4" />
                                Iniciar Replicação
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog de Confirmação */}
                <AlertDialog open={showConfirmDialog && replicationData !== null} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent className='bg-white'>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Replicação</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação irá replicar {replicationData?.participantsToReplicate?.length || 0} participante(s)
                                do turno de origem para o turno de destino.
                                {(replicationData?.companiesAnalysis?.needingCreation?.length || 0) > 0 &&
                                    ` ${replicationData?.companiesAnalysis?.needingCreation?.length || 0} empresa(s) será(ão) criada(s).`}
                                {(replicationData?.credentialsAnalysis?.needingCreation?.length || 0) > 0 &&
                                    ` ${replicationData?.credentialsAnalysis?.needingCreation?.length || 0} credencial(is) será(ão) criada(s).`}
                                <br /><br />
                                Esta ação não pode ser desfeita. Deseja continuar?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={processReplication}>
                                Confirmar Replicação
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Dialog de Progresso */}
                <Dialog open={showProgressDialog} onOpenChange={() => { }}>
                    <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Replicação em Andamento
                            </DialogTitle>
                            <DialogDescription>
                                Por favor, aguarde enquanto os participantes são replicados. Esta operação pode levar alguns minutos.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Progresso Visual */}
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>

                            {/* Rate Limiting Status */}
                            {replicationHook.rateLimitState.isThrottled && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Pause className="h-4 w-4 text-yellow-600" />
                                        <span className="text-sm text-yellow-800">
                                            Aguardando rate limit - operação pausada temporariamente
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="text-xs text-muted-foreground text-center">
                                Não feche esta janela até que a operação seja concluída.
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}