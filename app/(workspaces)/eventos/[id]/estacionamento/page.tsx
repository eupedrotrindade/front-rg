/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Clock, User, Plus, Check, X, RotateCcw, Car, Download, Upload, History, Package, Sun, Moon, FileDown, CheckCircle } from 'lucide-react'
import EventLayout from '@/components/dashboard/dashboard-layout'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { formatEventDate } from '@/lib/utils'
import { useEventVehiclesByEvent } from '@/features/eventos/api/query/use-event-vehicles-by-event'
import { useCreateEventVehicle, useUpdateEventVehicle, useDeleteEventVehicle, useRetrieveEventVehicle } from '@/features/eventos/api/mutation'
import { EventVehicle } from '@/features/eventos/actions/create-event-vehicle'
import ModalNovoVeiculo from '@/components/operador/modalNovoVeiculo'
import ModalHistoricoVeiculo from '@/components/operador/modalHistoricoVeiculo'
import { useExcelExportImport } from '@/hooks/use-excel-export-import'
import { useExportPDF } from "@/features/eventos/api/mutation/use-export-pdf"

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
    const [isQuickInsertModalOpen, setIsQuickInsertModalOpen] = useState(false)

    // Estados para inserção rápida
    const [quickInsertText, setQuickInsertText] = useState('')
    const [isProcessingQuickInsert, setIsProcessingQuickInsert] = useState(false)

    // Hook para exportar/importar Excel
    const { exportToExcel, importFromExcel, isExporting, isImporting } = useExcelExportImport()

    // Hook para exportar PDF
    const exportPDFMutation = useExportPDF()

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
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }> => {
        if (!evento) return []

        const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }> = []

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
                        // Garantir que a data está no formato correto (com timezone fix)
                        const dateObj = new Date(item.date + 'T12:00:00.000Z');
                        if (isNaN(dateObj.getTime())) {
                            console.warn(`Data inválida encontrada: ${item.date}`);
                            return;
                        }

                        const formattedDate = formatEventDate(dateObj.toISOString());

                        // Usar período do item se disponível, senão calcular baseado na hora
                        let period: 'diurno' | 'noturno' | 'dia_inteiro';
                        if (item.period && (item.period === 'diurno' || item.period === 'noturno' || item.period === 'dia_inteiro')) {
                            period = item.period;
                        } else {
                            // Fallback: calcular baseado na hora
                            const hour = dateObj.getHours();
                            period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                        }

                        // Criar ID único baseado na data e período
                        const dayId = `${new Date(item.date + 'T12:00:00.000Z').toISOString().split('T')[0]}-${stage}-${period}`;

                        const periodLabel = period === 'diurno' ? 'Diurno' : period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

                        days.push({
                            id: dayId,
                            label: `${formattedDate} (${stageName} - ${periodLabel})`,
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
                const periodOrder = { diurno: 0, noturno: 1, dia_inteiro: 2 };

                const typeComparison = typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder];
                if (typeComparison !== 0) return typeComparison;

                return periodOrder[a.period as keyof typeof periodOrder] - periodOrder[b.period as keyof typeof periodOrder];
            }

            return dateA.getTime() - dateB.getTime();
        });

        console.log('📅 Turnos disponíveis:', days.map(d => ({
            id: d.id,
            label: d.label,
            type: d.type,
            period: d.period
        })));

        return days
    }, [evento])

    // Auto-selecionar primeiro dia se nenhum estiver selecionado
    const eventDays = getEventDays()
    const shouldAutoSelectDay = !selectedDay && eventDays.length > 0
    const effectiveSelectedDay = shouldAutoSelectDay ? eventDays[0].id : selectedDay

    // Função para extrair informações do shift ID
    const parseShiftId = useCallback((shiftId: string) => {
        console.log('🔍 parseShiftId chamada com:', shiftId);

        if (!shiftId) {
            console.warn('⚠️ shiftId vazio, usando valores padrão');
            return {
                workDate: new Date().toISOString().split('T')[0],
                workStage: 'evento' as const,
                workPeriod: 'diurno' as const
            };
        }

        const parts = shiftId.split('-');
        console.log('🔍 Partes do shiftId:', parts);

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

            const rawStage = parts[3];
            const rawPeriod = parts[4];
            const stage = stageMap[rawStage];

            console.log('🔍 Mapeamento stage:', { rawStage, stage, rawPeriod });

            // Validar que temos valores válidos
            if (!stage || (rawPeriod !== 'diurno' && rawPeriod !== 'noturno' && rawPeriod !== 'dia_inteiro')) {
                console.warn('⚠️ Valores inválidos no shiftId:', { parts, rawStage, stage, rawPeriod });
                const fallbackResult = {
                    workDate: `${parts[0]}-${parts[1]}-${parts[2]}`,
                    workStage: 'evento' as const,
                    workPeriod: 'diurno' as const
                };
                console.log('🔧 Usando fallback:', fallbackResult);
                return fallbackResult;
            }

            const result = {
                workDate: `${parts[0]}-${parts[1]}-${parts[2]}`, // YYYY-MM-DD
                workStage: stage,
                workPeriod: rawPeriod as 'diurno' | 'noturno' | 'dia_inteiro'
            };

            console.log('✅ parseShiftId resultado:', result);
            return result;
        }

        // Se não conseguir parsear, usar valores padrão
        console.warn('⚠️ shiftId com formato incorreto, usando fallback');
        const fallbackResult = {
            workDate: shiftId.includes('-') ? shiftId.split('-').slice(0, 3).join('-') : shiftId,
            workStage: 'evento' as const,
            workPeriod: 'diurno' as const
        };
        console.log('🔧 Fallback final:', fallbackResult);
        return fallbackResult;
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
        console.log('🔄 normalizeVeiculos chamada com', veiculosArray.length, 'veículos');

        return veiculosArray.map((veiculo, index) => {
            // Debug detalhado dos primeiros veículos
            if (index < 3) {
                console.log(`🔍 Normalizando veículo ${index + 1}:`, {
                    id: veiculo.id,
                    empresa: veiculo.empresa,
                    shiftId: veiculo.shiftId,
                    shiftIdType: typeof veiculo.shiftId,
                    workDate: veiculo.workDate,
                    workStage: veiculo.workStage,
                    workPeriod: veiculo.workPeriod,
                    dia: veiculo.dia,
                    rawObject: veiculo
                });
            }

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
                    const normalizedPeriod = (shiftPeriodFromId === 'diurno' || shiftPeriodFromId === 'noturno' || shiftPeriodFromId === 'dia_inteiro')
                        ? shiftPeriodFromId
                        : (veiculo.workPeriod === 'diurno' || veiculo.workPeriod === 'noturno' || veiculo.workPeriod === 'dia_inteiro')
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
        }).map((normalized, index) => {
            // Log do resultado final dos primeiros veículos
            if (index < 3) {
                console.log(`✅ Veículo ${index + 1} normalizado final:`, {
                    id: normalized.id,
                    empresa: normalized.empresa,
                    shiftId: normalized.shiftId,
                    shiftIdType: typeof normalized.shiftId,
                    workDate: normalized.workDate,
                    workStage: normalized.workStage,
                    workPeriod: normalized.workPeriod
                });
            }
            return normalized;
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
    // Cores das etapas (stage colors) melhoradas
    const stageColors = {
        montagem: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100' },
        evento: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100' },
        desmontagem: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100' }
    }

    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'montagem':
                case 'setup':
                    return 'border-blue-500 text-blue-600 bg-blue-50'
                case 'evento':
                case 'event':
                case 'preparation':
                    return 'border-green-500 text-green-600 bg-green-50'
                case 'desmontagem':
                case 'teardown':
                case 'finalization':
                    return 'border-orange-500 text-orange-600 bg-orange-50'
                default:
                    return 'border-gray-500 text-gray-600 bg-gray-50'
            }
        } else {
            switch (type) {
                case 'montagem':
                case 'setup':
                    return 'hover:text-blue-700 hover:border-blue-300'
                case 'evento':
                case 'event':
                case 'preparation':
                    return 'hover:text-green-700 hover:border-green-300'
                case 'desmontagem':
                case 'teardown':
                case 'finalization':
                    return 'hover:text-orange-700 hover:border-orange-300'
                default:
                    return 'hover:text-gray-700 hover:border-gray-300'
            }
        }
    }, [])

    // Função para obter ícone do período com cores melhoradas
    const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
        if (period === 'diurno') {
            return <Sun className="h-3 w-3 text-amber-500" />;
        } else if (period === 'noturno') {
            return <Moon className="h-3 w-3 text-indigo-500" />;
        } else if (period === 'dia_inteiro') {
            return <Clock className="h-3 w-3 text-violet-500" />;
        }
        return null;
    }, [])

    // Filtrar veículos
    const filteredVeiculos = useMemo(() => {
        console.log('🔍 Debug filtro detalhado:', {
            totalVeiculos: veiculos.length,
            selectedDay,
            searchTerm,
            showOnlyActive,
            primeirosVeiculos: veiculos.slice(0, 3).map(v => ({
                id: v.id,
                empresa: v.empresa,
                shiftId: v.shiftId,
                workDate: v.workDate,
                workStage: v.workStage,
                workPeriod: v.workPeriod,
                retirada: v.retirada,
                shiftIdType: typeof v.shiftId,
                selectedDayType: typeof selectedDay
            }))
        });

        let filtered = veiculos

        // Filtrar por turno selecionado
        if (selectedDay) {
            console.log('🔍 Filtrando por turno:', selectedDay);
            filtered = filtered.filter(veiculo => {
                const veiculoShiftId = String(veiculo.shiftId || '');
                const selectedDayStr = String(selectedDay);
                const match = veiculoShiftId === selectedDayStr;

                if (!match) {
                    console.log('❌ Não match:', {
                        veiculoShiftId,
                        selectedDay: selectedDayStr,
                        veiculoId: veiculo.id,
                        empresa: veiculo.empresa
                    });
                } else {
                    console.log('✅ Match encontrado:', {
                        veiculoShiftId,
                        selectedDay: selectedDayStr,
                        veiculoId: veiculo.id,
                        empresa: veiculo.empresa
                    });
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
            if (!selectedDay) {
                toast.error('Selecione um turno primeiro');
                return;
            }

            // Extrair informações do shift para o modelo de turno
            const shiftInfo = parseShiftId(selectedDay);

            // Debug detalhado: verificar o que está sendo gerado
            console.log('🔍 Debug handleSaveVeiculo:', {
                selectedDay,
                shiftInfo,
                originalData: data,
                workStageType: typeof shiftInfo.workStage,
                workStageValue: shiftInfo.workStage,
                workPeriodType: typeof shiftInfo.workPeriod,
                workPeriodValue: shiftInfo.workPeriod,
                allowedStages: ['montagem', 'evento', 'desmontagem'],
                allowedPeriods: ['diurno', 'noturno', 'dia_inteiro']
            });

            // Validar valores antes de criar o payload
            const allowedStages = ['montagem', 'evento', 'desmontagem'];
            const allowedPeriods = ['diurno', 'noturno', 'dia_inteiro'];

            if (!allowedStages.includes(shiftInfo.workStage)) {
                console.error('❌ workStage inválido:', shiftInfo.workStage);
                toast.error(`Erro: Etapa de trabalho inválida: ${shiftInfo.workStage}`);
                return;
            }

            if (!allowedPeriods.includes(shiftInfo.workPeriod)) {
                console.error('❌ workPeriod inválido:', shiftInfo.workPeriod);
                toast.error(`Erro: Período de trabalho inválido: ${shiftInfo.workPeriod}`);
                return;
            }

            // Validar dados obrigatórios
            if (!data.empresa?.trim() && !data.placa?.trim()) {
                toast.error('Empresa ou Placa é obrigatória');
                return;
            }

            const vehicleData = {
                empresa: data.empresa?.trim() || '',
                modelo: data.modelo?.trim() || '',
                placa: data.placa?.trim() || '',
                tipo_de_credencial: data.tipo_de_credencial?.trim() || '',
                retirada: (data.retirada || 'pendente') as 'pendente' | 'retirada',
                // Campos do modelo de turno (garantir que não são undefined)
                shiftId: selectedDay,
                workDate: shiftInfo.workDate || new Date().toISOString().split('T')[0],
                workStage: shiftInfo.workStage || 'evento',
                workPeriod: shiftInfo.workPeriod || 'diurno'
            };

            console.log('📤 Dados validados para envio:', {
                vehicleData,
                isEditing,
                eventId,
                mutation: isEditing ? 'update' : 'create'
            });

            if (isEditing && editingVeiculo) {
                console.log('🔄 Atualizando veículo ID:', editingVeiculo.id);
                await updateVehicleMutation.mutateAsync({
                    id: editingVeiculo.id,
                    data: vehicleData
                });
                toast.success('Veículo atualizado com sucesso!');
            } else {
                const payloadToSend = {
                    eventId,
                    ...vehicleData
                };
                console.log('➕ Criando novo veículo:', payloadToSend);
                await createVehicleMutation.mutateAsync(payloadToSend);
                toast.success('Veículo criado com sucesso!');
            }

            // Fechar modal após sucesso
            handleCloseModal();
        } catch (error) {
            console.error("❌ Erro completo ao salvar veículo:", {
                error,
                errorMessage: (error as any)?.message,
                errorResponse: (error as any)?.response?.data,
                errorStatus: (error as any)?.response?.status
            });

            // Toast de erro mais específico
            if ((error as any)?.response?.status === 500) {
                toast.error("Erro interno do servidor. Verifique os dados e tente novamente.");
            } else if ((error as any)?.response?.status === 400) {
                toast.error(`Dados inválidos: ${(error as any)?.response?.data?.message || 'Verifique os campos obrigatórios'}`);
            } else {
                toast.error(`Erro ao salvar veículo: ${(error as any)?.message || 'Erro desconhecido'}`);
            }
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

    // Funções de importar/exportar
    const handleExportPDF = () => {
        if (!filteredVeiculos || filteredVeiculos.length === 0) {
            toast.error('Não há dados para exportar');
            return;
        }

        // Preparar dados para exportação PDF
        const exportData = filteredVeiculos.map(veiculo => {
            const dayInfo = eventDays.find(day => day.id === veiculo.shiftId);

            return {
                empresa: veiculo.empresa || '',
                modelo: veiculo.modelo || '',
                placa: veiculo.placa || '',
                tipo_credencial: veiculo.tipo_de_credencial || '',
                turno: dayInfo?.label || veiculo.shiftId || '',
                status: veiculo.retirada === 'retirada' ? 'Retirada' : 'Pendente',
                data_retirada: veiculo.retrievalDate ? new Date(veiculo.retrievalDate).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '',
                retirado_por: veiculo.retrievedBy || '',
                tipo_retirada: veiculo.retrievalType === 'self' ? 'Próprio' :
                              veiculo.retrievalType === 'third_party' ? 'Terceiro' : '',
                documento_terceiro: veiculo.thirdPartyDocument || '',
                observacoes: veiculo.observacoes || ''
            };
        });

        // Executar exportação
        exportPDFMutation.mutate({
            titulo: `Relatório de Estacionamento - ${evento?.name || 'Evento'}`,
            tipo: "estacionamento",
            dados: exportData
        });
    };

    const handleExportVeiculos = async () => {
        try {
            // Preparar dados para exportação (formato simplificado sem dados de turno)
            const exportData = filteredVeiculos.map(veiculo => ({
                'Empresa': veiculo.empresa || '',
                'Modelo': veiculo.modelo || '',
                'Placa': veiculo.placa || '',
                'Tipo de Credencial': veiculo.tipo_de_credencial || '',
                'Status': veiculo.retirada === 'retirada' ? 'Retirada' : 'Pendente'
            }));

            const turnoInfo = selectedDay ? eventDays.find(d => d.id === selectedDay)?.label || selectedDay : 'todos_turnos';

            await exportToExcel(exportData, {
                filename: `veiculos_${evento?.name || 'evento'}_${turnoInfo.replace(/[^\w\s]/gi, '_')}`,
                sheetName: 'Veículos'
            });

            toast.success(`✅ Dados exportados com sucesso! ${exportData.length} veículo(s)`);
        } catch (error) {
            console.error('Erro ao exportar veículos:', error);
            toast.error('Erro ao exportar veículos');
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            // Template simplificado - sem dados de turno pois será usado o turno selecionado
            const templateData = [
                {
                    'Empresa': 'Exemplo Ltda',
                    'Modelo': 'Civic',
                    'Placa': 'ABC-1234',
                    'Tipo de Credencial': 'Temporária',
                    'Status': 'Pendente'
                }
            ];

            await exportToExcel(templateData, {
                filename: 'template_veiculos',
                sheetName: 'Template'
            });
        } catch (error) {
            console.error('Erro ao gerar template:', error);
            toast.error('Erro ao gerar template');
        }
    };

    const handleImportVeiculos = async (file: File) => {
        try {
            if (!selectedDay) {
                toast.error('Selecione um turno antes de importar');
                return;
            }

            // Extrair informações do turno selecionado
            const shiftInfo = parseShiftId(selectedDay);

            await importFromExcel(file, async (data) => {
                console.log('📥 Iniciando importação para turno:', {
                    selectedDay,
                    shiftInfo,
                    totalRows: data.length
                });

                // Processar dados importados
                let successCount = 0;
                let errorCount = 0;

                for (const row of data) {
                    try {
                        // Mapear campos do Excel para o formato esperado (apenas campos básicos)
                        const vehicleData = {
                            empresa: String(row['Empresa'] || '').trim(),
                            modelo: String(row['Modelo'] || '').trim(),
                            placa: String(row['Placa'] || '').trim(),
                            tipo_de_credencial: String(row['Tipo de Credencial'] || '').trim(),
                            retirada: row['Status'] === 'Retirada' ? 'retirada' as const : 'pendente' as const,
                            // Usar sempre o turno selecionado (com fallbacks)
                            shiftId: selectedDay,
                            workDate: shiftInfo.workDate || new Date().toISOString().split('T')[0],
                            workStage: shiftInfo.workStage || 'evento',
                            workPeriod: shiftInfo.workPeriod || 'diurno'
                        };

                        // Validar dados obrigatórios
                        if (!vehicleData.empresa && !vehicleData.placa) {
                            console.warn('❌ Linha ignorada: empresa ou placa obrigatória', row);
                            errorCount++;
                            continue;
                        }

                        console.log('📤 Criando veículo:', vehicleData);

                        // Criar veículo
                        const payloadCompleto = {
                            eventId,
                            ...vehicleData
                        };

                        console.log('📤 Payload importação (linha):', payloadCompleto);
                        await createVehicleMutation.mutateAsync(payloadCompleto);

                        successCount++;
                    } catch (error) {
                        console.error('❌ Erro ao importar linha:', {
                            row,
                            error,
                            errorMessage: (error as any)?.response?.message,
                            errorResponse: (error as any)?.response?.data,
                            errorStatus: (error as any)?.response?.status
                        });
                        errorCount++;
                    }
                }

                // Mostrar resultado
                if (successCount > 0) {
                    toast.success(`✅ ${successCount} veículo(s) importado(s) com sucesso para ${eventDays.find(d => d.id === selectedDay)?.label || selectedDay}!`);
                }
                if (errorCount > 0) {
                    toast.warning(`⚠️ ${errorCount} linha(s) com erro foram ignoradas.`);
                }

                console.log('📊 Importação finalizada:', { successCount, errorCount });
            });
        } catch (error) {
            console.error('❌ Erro na importação:', error);
            toast.error('Erro ao importar arquivo');
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validar tipo de arquivo
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ];

            if (!validTypes.includes(file.type)) {
                toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
                return;
            }

            handleImportVeiculos(file);
        }
        // Limpar input para permitir selecionar o mesmo arquivo novamente
        event.target.value = '';
    };

    // Função para processar inserção rápida
    const handleQuickInsert = async () => {
        if (!quickInsertText.trim()) {
            toast.error('Digite pelo menos uma entrada');
            return;
        }

        if (!selectedDay) {
            toast.error('Selecione um turno');
            return;
        }

        setIsProcessingQuickInsert(true);

        try {
            // Processar texto: cada linha é uma entrada, separada por vírgula para empresa,modelo,placa,tipo_credencial
            const lines = quickInsertText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (lines.length === 0) {
                toast.error('Nenhuma entrada válida encontrada');
                return;
            }

            // Extrair informações do shift
            const shiftInfo = parseShiftId(selectedDay);

            let successCount = 0;
            let errorCount = 0;

            for (const line of lines) {
                // Separar por vírgula: empresa,modelo,placa,tipo_credencial
                const parts = line.split(',').map(part => part.trim());
                const empresa = parts[0] || '';
                const modelo = parts[1] || '';
                const placa = parts[2] || '';
                const tipo_credencial = parts[3] || '';

                if (!empresa && !placa) {
                    errorCount++;
                    continue;
                }

                const vehicleData = {
                    eventId,
                    empresa,
                    modelo,
                    placa,
                    tipo_de_credencial: tipo_credencial,
                    retirada: 'pendente' as const,
                    shiftId: selectedDay,
                    workDate: shiftInfo.workDate || new Date().toISOString().split('T')[0],
                    workStage: shiftInfo.workStage || 'evento',
                    workPeriod: shiftInfo.workPeriod || 'diurno',
                };

                try {
                    console.log('📤 Criando veículo (inserção rápida):', vehicleData);
                    await createVehicleMutation.mutateAsync(vehicleData);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error('❌ Erro ao criar entrada (inserção rápida):', {
                        error,
                        vehicleData,
                        errorMessage: (error as any)?.message,
                        errorResponse: (error as any)?.response?.data,
                        errorStatus: (error as any)?.response?.status
                    });
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} veículo(s) criado(s) com sucesso!`);
            }
            if (errorCount > 0) {
                toast.error(`${errorCount} entrada(s) falharam`);
            }

            // Limpar estados
            setQuickInsertText('');
            setIsQuickInsertModalOpen(false);
        } catch (error) {
            toast.error('Erro durante a inserção rápida');
        } finally {
            setIsProcessingQuickInsert(false);
        }
    };

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
                                onClick={() => {
                                    if (!selectedDay) {
                                        toast.error('Selecione um turno primeiro');
                                        return;
                                    }
                                    handleOpenModal();
                                }}
                                disabled={!selectedDay}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Retirada
                            </Button>

                            <Button
                                onClick={() => {
                                    if (!selectedDay) {
                                        toast.error('Selecione um turno primeiro');
                                        return;
                                    }
                                    setIsQuickInsertModalOpen(true);
                                }}
                                disabled={!selectedDay}
                                variant="outline"
                                className="border-purple-500 text-purple-600 hover:bg-purple-50"
                            >
                                <Package className="w-4 h-4 mr-2" />
                                Inserção Rápida
                            </Button>

                            <Button
                                onClick={handleExportPDF}
                                disabled={exportPDFMutation.isPending || filteredVeiculos.length === 0}
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                {exportPDFMutation.isPending ? 'Exportando...' : 'Exportar PDF'}
                            </Button>

                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isImporting || !selectedDay}
                                    id="import-file"
                                />
                                <Button
                                    variant="outline"
                                    disabled={isImporting || !selectedDay}
                                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                    title={selectedDay ? `Importar para: ${eventDays.find(d => d.id === selectedDay)?.label || selectedDay}` : 'Selecione um turno primeiro'}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {isImporting ? 'Importando...' : 'Importar'}
                                </Button>
                            </div>

                            <Button
                                onClick={handleDownloadTemplate}
                                disabled={isExporting}
                                variant="outline"
                                className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            >
                                <FileDown className="w-4 h-4 mr-2" />
                                Baixar Modelo
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
                                                    {new Date(day.date + 'T12:00:00.000Z').toLocaleDateString('pt-BR')}
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
                                                        ({day.period === 'diurno' ? 'D' : day.period === 'noturno' ? 'N' : 'DI'})
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
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${veiculo.workStage === 'montagem' ? 'bg-orange-100 text-orange-700' :
                                                            veiculo.workStage === 'evento' ? 'bg-blue-100 text-blue-700' :
                                                                veiculo.workStage === 'desmontagem' ? 'bg-red-100 text-red-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {veiculo.workStage?.toUpperCase() || 'EVENTO'}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${veiculo.workPeriod === 'diurno' ? 'bg-yellow-100 text-yellow-700' :
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

                {/* Modal para inserção rápida */}
                <Dialog open={isQuickInsertModalOpen} onOpenChange={setIsQuickInsertModalOpen}>
                    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Inserção Rápida de Veículos</DialogTitle>
                            <DialogDescription>
                                Adicione múltiplos veículos rapidamente. Uma linha por veículo, separando dados por vírgula.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Instruções */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-medium text-blue-900 mb-2">🚗 Como usar:</h3>
                                <div className="text-sm text-blue-700 space-y-1">
                                    <p><strong>Formato por linha:</strong> Empresa,Modelo,Placa,Tipo de Credencial</p>
                                    <p><strong>Exemplo:</strong></p>
                                    <div className="bg-blue-100 rounded p-2 mt-2 font-mono text-xs">
                                        Empresa ABC,Civic,ABC-1234,Temporária<br />
                                        Empresa XYZ,Corolla,,Permanente<br />
                                        ,HB20,XYZ-9876,<br />
                                        Empresa DEF,,,Visitante
                                    </div>
                                    <p className="mt-2"><strong>Observações:</strong></p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Pelo menos <strong>Empresa</strong> ou <strong>Placa</strong> é obrigatório</li>
                                        <li>Modelo e Tipo de Credencial são opcionais</li>
                                        <li>Separe os campos por vírgula</li>
                                        <li>Uma linha = um veículo</li>
                                        <li><strong>Turno será aplicado automaticamente:</strong> todos os veículos criados para o turno selecionado</li>
                                        <li>Status padrão: <strong>Pendente</strong> (pode ser alterado posteriormente)</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Turno selecionado */}
                            <div className="space-y-2">
                                <Label>Turno Selecionado</Label>
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                    <p className="text-sm font-medium text-gray-900">
                                        {selectedDay ? (
                                            eventDays.find(day => day.id === selectedDay)?.label || selectedDay
                                        ) : (
                                            'Nenhum turno selecionado'
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Área de texto */}
                            <div className="space-y-2">
                                <Label htmlFor="quick-text">Dados dos Veículos *</Label>
                                <Textarea
                                    id="quick-text"
                                    value={quickInsertText}
                                    onChange={(e) => setQuickInsertText(e.target.value)}
                                    placeholder={`Digite um veículo por linha:\n\nEmpresa ABC,Civic,ABC-1234,Temporária\nEmpresa XYZ,Corolla,,Permanente\n,HB20,XYZ-9876,\nEmpresa DEF,,,Visitante`}
                                    className="min-h-[200px] font-mono text-sm"
                                />
                                <div className="text-xs text-gray-500">
                                    {quickInsertText.split('\n').filter(line => line.trim()).length} linha(s) digitada(s)
                                </div>
                            </div>

                            {/* Preview */}
                            {quickInsertText.trim() && (
                                <div className="space-y-2">
                                    <Label>Preview dos Veículos</Label>
                                    <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Empresa</th>
                                                    <th className="px-3 py-2 text-left">Modelo</th>
                                                    <th className="px-3 py-2 text-left">Placa</th>
                                                    <th className="px-3 py-2 text-left">Tipo Credencial</th>
                                                    <th className="px-3 py-2 text-left">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {quickInsertText
                                                    .split('\n')
                                                    .map(line => line.trim())
                                                    .filter(line => line.length > 0)
                                                    .slice(0, 10)
                                                    .map((line, index) => {
                                                        const parts = line.split(',').map(part => part.trim());
                                                        const empresa = parts[0] || '';
                                                        const modelo = parts[1] || '';
                                                        const placa = parts[2] || '';
                                                        const tipo_credencial = parts[3] || '';
                                                        const isValid = empresa.length > 0 || placa.length > 0;

                                                        return (
                                                            <tr key={index} className={isValid ? '' : 'bg-red-50'}>
                                                                <td className="px-3 py-2">
                                                                    {empresa || <span className="text-gray-400 italic">vazio</span>}
                                                                </td>
                                                                <td className="px-3 py-2 text-gray-600">
                                                                    {modelo || <span className="text-gray-400 italic">vazio</span>}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {placa || <span className="text-gray-400 italic">vazio</span>}
                                                                </td>
                                                                <td className="px-3 py-2 text-gray-600">
                                                                    {tipo_credencial || <span className="text-gray-400 italic">vazio</span>}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {isValid ? (
                                                                        <span className="text-green-600 text-xs">✓ Válido</span>
                                                                    ) : (
                                                                        <span className="text-red-600 text-xs">✗ Empresa ou Placa obrigatória</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                        {quickInsertText.split('\n').filter(line => line.trim()).length > 10 && (
                                            <div className="px-3 py-2 text-center text-gray-500 text-sm bg-gray-50">
                                                ... e mais {quickInsertText.split('\n').filter(line => line.trim()).length - 10} linhas
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Botões */}
                            <div className="flex gap-4 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsQuickInsertModalOpen(false);
                                        setQuickInsertText('');
                                    }}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleQuickInsert}
                                    disabled={!quickInsertText.trim() || !selectedDay || isProcessingQuickInsert}
                                    className="flex-1"
                                >
                                    {isProcessingQuickInsert ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Criar Veículos
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}