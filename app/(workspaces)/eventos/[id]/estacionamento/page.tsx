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
                        // Garantir que a data está no formato correto
                        const dateObj = new Date(item.date);
                        if (isNaN(dateObj.getTime())) {
                            console.warn(`Data inválida encontrada: ${item.date}`);
                            return;
                        }

                        const formattedDate = formatEventDate(dateObj.toISOString());
                        
                        // Usar período do item se disponível, senão calcular baseado na hora
                        let period: 'diurno' | 'noturno';
                        if (item.period && (item.period === 'diurno' || item.period === 'noturno')) {
                            period = item.period;
                        } else {
                            // Fallback: calcular baseado na hora
                            const hour = dateObj.getHours();
                            period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                        }

                        // Criar ID único baseado na data e período
                        const dayId = `${dateObj.toISOString().split('T')[0]}-${stage}-${period}`;

                        days.push({
                            id: dayId,
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
        processEventArray(evento.montagem, 'montagem', 'MONTAGEM');
        processEventArray(evento.evento, 'evento', 'EVENTO');
        processEventArray(evento.desmontagem, 'desmontagem', 'DESMONTAGEM');

        // Fallback para estrutura antiga (manter compatibilidade) - só usar se não há nova estrutura
        if (evento.setupStartDate && evento.setupEndDate && (!evento.montagem || evento.montagem.length === 0)) {
            const startDate = new Date(evento.setupStartDate)
            const endDate = new Date(evento.setupEndDate)
            
            // Validar datas
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Datas de setup inválidas:', evento.setupStartDate, evento.setupEndDate);
            } else {
                for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                    const dateStr = formatEventDate(date.toISOString())
                    // Para compatibilidade, assumir período diurno para estrutura antiga
                    const dayId = `${date.toISOString().split('T')[0]}-montagem-diurno`;

                    days.push({
                        id: dayId,
                        label: `${dateStr} (MONTAGEM - Diurno)`,
                        date: dateStr,
                        type: 'montagem',
                        period: 'diurno'
                    })
                }
            }
        }

        if (evento.preparationStartDate && evento.preparationEndDate && (!evento.evento || evento.evento.length === 0)) {
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Datas de preparação inválidas:', evento.preparationStartDate, evento.preparationEndDate);
            } else {
                for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                    const dateStr = formatEventDate(date.toISOString())
                    const dayId = `${date.toISOString().split('T')[0]}-evento-diurno`;

                    days.push({
                        id: dayId,
                        label: `${dateStr} (EVENTO - Diurno)`,
                        date: dateStr,
                        type: 'evento',
                        period: 'diurno'
                    })
                }
            }
        }

        if (evento.finalizationStartDate && evento.finalizationEndDate && (!evento.desmontagem || evento.desmontagem.length === 0)) {
            const startDate = new Date(evento.finalizationStartDate)
            const endDate = new Date(evento.finalizationEndDate)
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Datas de finalização inválidas:', evento.finalizationStartDate, evento.finalizationEndDate);
            } else {
                for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                    const dateStr = formatEventDate(date.toISOString())
                    const dayId = `${date.toISOString().split('T')[0]}-desmontagem-diurno`;

                    days.push({
                        id: dayId,
                        label: `${dateStr} (DESMONTAGEM - Diurno)`,
                        date: dateStr,
                        type: 'desmontagem',
                        period: 'diurno'
                    })
                }
            }
        }

        // Ordenar dias cronologicamente
        days.sort((a, b) => {
            // Extrair a data do ID para ordenação mais confiável
            const dateA = new Date(a.id.split('-')[0]);
            const dateB = new Date(b.id.split('-')[0]);
            
            if (dateA.getTime() === dateB.getTime()) {
                // Se for o mesmo dia, ordenar por tipo e período
                const typeOrder = { montagem: 0, evento: 1, desmontagem: 2 };
                const periodOrder = { diurno: 0, noturno: 1 };
                
                const typeComparison = typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder];
                if (typeComparison !== 0) return typeComparison;
                
                return periodOrder[a.period as keyof typeof periodOrder] - periodOrder[b.period as keyof typeof periodOrder];
            }
            
            return dateA.getTime() - dateB.getTime();
        });

        return days
    }, [evento])

    // Auto-selecionar primeiro dia se nenhum estiver selecionado
    const eventDays = getEventDays()
    const shouldAutoSelectDay = !selectedDay && eventDays.length > 0
    const effectiveSelectedDay = shouldAutoSelectDay ? eventDays[0].id : selectedDay

    // Função para extrair informações do shift ID
    const parseShiftId = useCallback((shiftId: string) => {
        if (!shiftId) {
            return {
                workDate: new Date().toISOString().split('T')[0],
                workStage: 'evento' as const,
                workPeriod: 'diurno' as const
            };
        }

        const parts = shiftId.split('-');
        if (parts.length >= 5) {
            // Mapear os tipos do frontend para os valores esperados pelo backend
            const stageMap: Record<string, 'montagem' | 'evento' | 'desmontagem'> = {
                'montagem': 'montagem',
                'evento': 'evento', 
                'desmontagem': 'desmontagem',
                'setup': 'montagem',
                'event': 'evento', 
                'teardown': 'desmontagem',
                'preparation': 'evento',
                'finalization': 'desmontagem'
            };

            const stage = stageMap[parts[3]];
            const period = parts[4];

            // Validar que temos valores válidos
            if (!stage || (period !== 'diurno' && period !== 'noturno')) {
                console.warn('Valores inválidos no shiftId:', { parts, stage, period });
                return {
                    workDate: `${parts[0]}-${parts[1]}-${parts[2]}`,
                    workStage: 'evento' as const,
                    workPeriod: 'diurno' as const
                };
            }

            return {
                workDate: `${parts[0]}-${parts[1]}-${parts[2]}`, // YYYY-MM-DD
                workStage: stage,
                workPeriod: period as 'diurno' | 'noturno'
            };
        }
        
        // Se não conseguir parsear, usar valores padrão
        return {
            workDate: shiftId.includes('-') ? shiftId.split('-').slice(0, 3).join('-') : shiftId,
            workStage: 'evento' as const,
            workPeriod: 'diurno' as const
        };
    }, []);

    // Query para buscar todos os veículos do evento (para contadores das abas)
    const { data: allRawVeiculos = [], isLoading: allVeiculosLoading } = useEventVehiclesByEvent({
        eventId,
        search: "",
        statusFilter: "all",
        empresaFilter: "all",
        shiftFilter: "all"
    })

    // Para a tabela, usar os mesmos dados sem filtro de shift (filtraremos no frontend)
    const { data: rawVeiculos = [], isLoading, error } = useEventVehiclesByEvent({
        eventId,
        search: "",
        statusFilter: "all",
        empresaFilter: "all",
        shiftFilter: "all" // Buscar todos, filtrar no frontend
    })

    // Função para normalizar dados dos veículos
    const normalizeVeiculos = useCallback((veiculosArray: any[]) => {
        return veiculosArray.map(veiculo => {
            // Debug temporário - remover após testar
            console.log('🔍 Normalizando veículo:', {
                id: veiculo.id,
                empresa: veiculo.empresa,
                shiftId: veiculo.shiftId,
                workStage: veiculo.workStage,
                workPeriod: veiculo.workPeriod,
                dia: veiculo.dia
            });

            // Se já tem campos de turno, verificar consistência e corrigir se necessário
            if (veiculo.shiftId && veiculo.workDate && veiculo.workStage && veiculo.workPeriod) {
                // Extrair informações do shiftId para garantir consistência
                const shiftParts = veiculo.shiftId.split('-');
                if (shiftParts.length >= 5) {
                    const shiftDate = `${shiftParts[0]}-${shiftParts[1]}-${shiftParts[2]}`;
                    const shiftStageFromId = shiftParts[3];
                    const shiftPeriodFromId = shiftParts[4];

                    // Mapear tipos para garantir consistência
                    const stageMap: Record<string, 'montagem' | 'evento' | 'desmontagem'> = {
                        'montagem': 'montagem',
                        'evento': 'evento', 
                        'desmontagem': 'desmontagem',
                        'setup': 'montagem',
                        'event': 'evento', 
                        'teardown': 'desmontagem',
                        'preparation': 'evento',
                        'finalization': 'desmontagem'
                    };

                    const normalizedStage = stageMap[shiftStageFromId] || stageMap[veiculo.workStage] || 'evento';
                    const normalizedPeriod = (shiftPeriodFromId === 'diurno' || shiftPeriodFromId === 'noturno') 
                        ? shiftPeriodFromId 
                        : (veiculo.workPeriod === 'diurno' || veiculo.workPeriod === 'noturno') 
                            ? veiculo.workPeriod 
                            : 'diurno';

                    // Criar shiftId consistente
                    const normalizedShiftId = `${shiftDate}-${normalizedStage}-${normalizedPeriod}`;

                    const normalized = {
                        ...veiculo,
                        shiftId: normalizedShiftId,
                        workDate: shiftDate,
                        workStage: normalizedStage,
                        workPeriod: normalizedPeriod
                    };

                    // console.log('✅ Veículo normalizado:', normalized.shiftId);

                    return normalized;
                }

                // Se não conseguir parsear o shiftId, usar os campos existentes
                return {
                    ...veiculo,
                    workStage: veiculo.workStage || 'evento',
                    workPeriod: veiculo.workPeriod || 'diurno'
                };
            }
            
            // Se não tem campos de turno mas tem 'dia', tentar criar campos de turno
            if (veiculo.dia) {
                // Tentar encontrar o turno correspondente à data
                const matchingDay = eventDays.find(day => {
                    const dayDate = day.id.split('-').slice(0, 3).join('-');
                    return dayDate === veiculo.dia;
                });
                
                if (matchingDay) {
                    const shiftInfo = parseShiftId(matchingDay.id);
                    const normalized = {
                        ...veiculo,
                        shiftId: matchingDay.id,
                        workDate: shiftInfo.workDate,
                        workStage: shiftInfo.workStage,
                        workPeriod: shiftInfo.workPeriod
                    };
                    
                    // console.log('📅 Veículo criado do dia:', normalized.shiftId);
                    return normalized;
                }
                
                // Fallback: criar campos básicos
                const fallback = {
                    ...veiculo,
                    shiftId: `${veiculo.dia}-evento-diurno`,
                    workDate: veiculo.dia,
                    workStage: 'evento' as const,
                    workPeriod: 'diurno' as const
                };
                
                // console.log('🔧 Veículo fallback:', fallback.shiftId);
                return fallback;
            }
            
            // Se não tem nem dia nem campos de turno, retornar com valores padrão
            const defaultVeiculo = {
                ...veiculo,
                shiftId: '',
                workDate: new Date().toISOString().split('T')[0],
                workStage: 'evento' as const,
                workPeriod: 'diurno' as const
            };
            
            // console.log('⚠️ Veículo padrão:', defaultVeiculo.shiftId);
            return defaultVeiculo;
        });
    }, [eventDays, parseShiftId]);

    // Normalizar dados para a tabela (com filtros aplicados)
    const veiculos = useMemo(() => {
        return normalizeVeiculos(rawVeiculos);
    }, [rawVeiculos, normalizeVeiculos])

    // Normalizar todos os dados para contadores das abas
    const allVeiculos = useMemo(() => {
        return normalizeVeiculos(allRawVeiculos);
    }, [allRawVeiculos, normalizeVeiculos])

    // Mutations
    const createVehicleMutation = useCreateEventVehicle()
    const updateVehicleMutation = useUpdateEventVehicle()
    const deleteVehicleMutation = useDeleteEventVehicle()
    const retrieveVehicleMutation = useRetrieveEventVehicle()

    // Função para obter cor da tab baseada no tipo
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'montagem':
                case 'setup':
                    return 'border-orange-500 text-orange-600 bg-orange-50'
                case 'evento':
                case 'event':
                case 'preparation':
                    return 'border-blue-500 text-blue-600 bg-blue-50'
                case 'desmontagem':
                case 'teardown':
                case 'finalization':
                    return 'border-red-500 text-red-600 bg-red-50'
                default:
                    return 'border-gray-500 text-gray-600 bg-gray-50'
            }
        } else {
            switch (type) {
                case 'montagem':
                case 'setup':
                    return 'hover:text-orange-700 hover:border-orange-300'
                case 'evento':
                case 'event':
                case 'preparation':
                    return 'hover:text-blue-700 hover:border-blue-300'
                case 'desmontagem':
                case 'teardown':
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
        console.log('🔍 Debug filtro:', {
            totalVeiculos: veiculos.length,
            selectedDay,
            searchTerm,
            showOnlyActive,
            primeirosVeiculos: veiculos.slice(0, 2).map(v => ({
                empresa: v.empresa,
                shiftId: v.shiftId,
                retirada: v.retirada
            }))
        });

        let filtered = veiculos

        // Filtrar por turno selecionado
        if (selectedDay) {
            filtered = filtered.filter(veiculo => {
                const match = veiculo.shiftId === selectedDay;
                if (!match) {
                    console.log('❌ Não match:', { veiculoShiftId: veiculo.shiftId, selectedDay });
                } else {
                    console.log('✅ Match encontrado:', { veiculoShiftId: veiculo.shiftId, selectedDay });
                }
                return match;
            });
            console.log('📊 Após filtro por turno:', filtered.length);
        }

        // Filtrar por termo de busca
        if (searchTerm) {
            filtered = filtered.filter(veiculo =>
                (veiculo.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                (veiculo.placa?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                (veiculo.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                (veiculo.tipo_de_credencial?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
            )
            console.log('📊 Após filtro por busca:', filtered.length);
        }

        // Filtrar apenas ativos
        if (showOnlyActive) {
            filtered = filtered.filter(veiculo => veiculo.retirada === 'retirada')
            console.log('📊 Após filtro por ativos:', filtered.length);
        }

        console.log('🎯 Resultado final do filtro:', filtered.length);
        return filtered
    }, [veiculos, selectedDay, searchTerm, showOnlyActive])

    // Estatísticas (usando todos os veículos, não apenas os filtrados)
    const stats = useMemo(() => {
        const total = allVeiculos.length
        const retirados = allVeiculos.filter(v => v.retirada === 'retirada').length
        const pendentes = allVeiculos.filter(v => v.retirada === 'pendente').length
        // Contar turnos únicos, com fallback para dias únicos
        const uniqueIdentifiers = Array.from(new Set(
            allVeiculos.map(v => v.shiftId || v.dia || 'default')
                .filter(id => id !== 'default')
        ));
        const totalTurnos = uniqueIdentifiers.length;

        return {
            total,
            retirados,
            pendentes,
            totalTurnos
        }
    }, [allVeiculos])

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
            // Usar shiftId do modal ou selectedDay como fallback
            const finalShiftId = data.shiftId || selectedDay || effectiveSelectedDay;
            
            // Extrair informações do shift para o modelo de turno
            const shiftInfo = parseShiftId(finalShiftId);
            
            // Debug: verificar o que está sendo gerado
            console.log('🔍 Debug handleSaveVeiculo:', {
                finalShiftId,
                shiftInfo,
                selectedDay,
                effectiveSelectedDay,
                dataShiftId: data.shiftId,
                workStageType: typeof shiftInfo.workStage,
                workStageValue: shiftInfo.workStage,
                allowedValues: ['montagem', 'evento', 'desmontagem']
            });

            // Validar valores antes de criar o payload
            const allowedStages = ['montagem', 'evento', 'desmontagem'];
            const allowedPeriods = ['diurno', 'noturno'];
            
            if (!allowedStages.includes(shiftInfo.workStage)) {
                console.error('❌ workStage inválido:', shiftInfo.workStage);
                toast.error(`Erro: workStage inválido: ${shiftInfo.workStage}`);
                return;
            }
            
            if (!allowedPeriods.includes(shiftInfo.workPeriod)) {
                console.error('❌ workPeriod inválido:', shiftInfo.workPeriod);
                toast.error(`Erro: workPeriod inválido: ${shiftInfo.workPeriod}`);
                return;
            }

            const vehicleData = {
                empresa: data.empresa,
                modelo: data.modelo,
                placa: data.placa,
                tipo_de_credencial: data.tipo_de_credencial,
                retirada: data.retirada,
                // Novos campos do modelo de turno
                shiftId: finalShiftId,
                workDate: shiftInfo.workDate,
                workStage: shiftInfo.workStage,
                workPeriod: shiftInfo.workPeriod
            };

            // Debug: verificar dados antes de enviar
            console.log('📤 Dados enviados para backend:', vehicleData);

            if (isEditing && editingVeiculo) {
                await updateVehicleMutation.mutateAsync({
                    id: editingVeiculo.id,
                    data: vehicleData
                })
            } else {
                const payloadToSend = {
                    eventId,
                    ...vehicleData
                };
                console.log('📤 Payload completo para criação:', payloadToSend);
                await createVehicleMutation.mutateAsync(payloadToSend)
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
                                // Filtrar veículos pelo shiftId completo usando TODOS os veículos
                                const veiculosInDay = allVeiculos.filter(v => {
                                    return v.shiftId === day.id;
                                }).length
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
                                                    {day.type === 'montagem' || day.type === 'setup' ? 'MONTAGEM' :
                                                        day.type === 'evento' || day.type === 'event' || day.type === 'preparation' ? 'EVENTO' :
                                                            day.type === 'desmontagem' || day.type === 'teardown' || day.type === 'finalization' ? 'DESMONTAGEM' :
                                                                        'EVENTO'}
                                                </span>
                                                {day.period && (
                                                    <span className="text-xs opacity-60">
                                                        ({day.period === 'diurno' ? 'D' : 'N'})
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs opacity-75">
                                                {allVeiculosLoading ? (
                                                    <span className="inline-block w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                                                ) : (
                                                    `(${veiculosInDay})`
                                                )}
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
                                        Turno
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
                                                    {selectedDay ? `Nenhum veículo encontrado para este turno` : 'Selecione um turno'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {selectedDay ? 'Registre uma nova retirada para este turno' : 'Escolha um turno do evento para ver os veículos'}
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
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4 text-gray-400" />
                                                        {veiculo.workDate ? formatEventDate(veiculo.workDate + 'T00:00:00') : formatEventDate(veiculo.dia + 'T00:00:00')}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            veiculo.workStage === 'montagem' ? 'bg-orange-100 text-orange-700' :
                                                            veiculo.workStage === 'evento' ? 'bg-blue-100 text-blue-700' :
                                                            veiculo.workStage === 'desmontagem' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {veiculo.workStage?.toUpperCase() || 'EVENTO'}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            veiculo.workPeriod === 'diurno' ? 'bg-yellow-100 text-yellow-700' :
                                                            veiculo.workPeriod === 'noturno' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {veiculo.workPeriod ? veiculo.workPeriod.toUpperCase() : 'DIURNO'}
                                                        </span>
                                                        {veiculo.shiftId && (
                                                            <span className="text-xs text-gray-500 font-mono">
                                                                {veiculo.shiftId}
                                                            </span>
                                                        )}
                                                    </div>
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