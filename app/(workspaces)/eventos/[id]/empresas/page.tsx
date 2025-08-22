/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Edit, Trash2, Building, Calendar, Check, X, MoreHorizontal, ExternalLink, Sun, Moon, Clock } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useEmpresasByEvent } from "@/features/eventos/api/query/use-empresas"
import { useCreateEmpresa, useDeleteEmpresa, useUpdateEmpresa } from "@/features/eventos/api/mutation"
import { useEventos } from "@/features/eventos/api/query"
import type { CreateEmpresaRequest, Empresa, Event } from "@/features/eventos/types"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useParams } from "next/navigation"
import { formatEventDate } from "@/lib/utils"

export default function EmpresasPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
    const [selectedDay, setSelectedDay] = useState<string>("")
    const [formData, setFormData] = useState<CreateEmpresaRequest>({
        nome: "",
        id_evento: "",
        days: []
    })

    // Hooks
    const eventId = useParams().id as string

    // Single query strategy - we'll use frontend filtering like estacionamento
    const { data: rawEmpresas = [], isLoading, error } = useEmpresasByEvent(eventId)

    const { data: eventos = [] } = useEventos()
    const updateEmpresaMutation = useUpdateEmpresa()
    const deleteEmpresaMutation = useDeleteEmpresa()

    const { data: event } = useEventos({ id: eventId })

    // Função para gerar dias do evento usando nova estrutura SimpleEventDay
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }> => {
        if (!event) return []

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
                        // Garantir que a data está no formato correto
                        const dateObj = new Date(item.date);
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
                        const dayId = `${dateObj.toISOString().split('T')[0]}-${stage}-${period}`;

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
        if ('montagem' in event) {
            processEventArray((event as any).montagem, 'montagem', 'MONTAGEM');
        }
        if ('evento' in event) {
            processEventArray((event as any).evento, 'evento', 'EVENTO');
        }
        if ('desmontagem' in event) {
            processEventArray((event as any).desmontagem, 'desmontagem', 'DESMONTAGEM');
        }

        // Fallback para estrutura antiga (manter compatibilidade) - só usar se não há nova estrutura
        if ('setupStartDate' in event && 'setupEndDate' in event && event.setupStartDate && event.setupEndDate &&
            (!('montagem' in event) || !(event as any).montagem || (event as any).montagem.length === 0)) {
            const startDate = new Date(event.setupStartDate)
            const endDate = new Date(event.setupEndDate)

            // Validar datas
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Datas de setup inválidas:', event.setupStartDate, event.setupEndDate);
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

        if ('preparationStartDate' in event && 'preparationEndDate' in event && event.preparationStartDate && event.preparationEndDate &&
            (!('evento' in event) || !(event as any).evento || (event as any).evento.length === 0)) {
            const startDate = new Date(event.preparationStartDate)
            const endDate = new Date(event.preparationEndDate)

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Datas de preparação inválidas:', event.preparationStartDate, event.preparationEndDate);
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

        if ('finalizationStartDate' in event && 'finalizationEndDate' in event && event.finalizationStartDate && event.finalizationEndDate &&
            (!('desmontagem' in event) || !(event as any).desmontagem || (event as any).desmontagem.length === 0)) {
            const startDate = new Date(event.finalizationStartDate)
            const endDate = new Date(event.finalizationEndDate)

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Datas de finalização inválidas:', event.finalizationStartDate, event.finalizationEndDate);
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

        return days
    }, [event])

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
            if (!stage || (period !== 'diurno' && period !== 'noturno' && period !== 'dia_inteiro')) {
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
                workPeriod: period as 'diurno' | 'noturno' | 'dia_inteiro'
            };
        }

        // Se não conseguir parsear, usar valores padrão
        return {
            workDate: shiftId.includes('-') ? shiftId.split('-').slice(0, 3).join('-') : shiftId,
            workStage: 'evento' as const,
            workPeriod: 'diurno' as const
        };
    }, []);

    // Normalizar dados das empresas (novo modelo - cada registro é um shift individual)
    const normalizeEmpresas = useCallback((empresasArray: any[]) => {
        console.log('🔍 Normalizando empresas (modelo individual):', empresasArray.length);

        // No novo modelo, cada empresa já representa um shift específico
        // Não precisamos mais de shiftData, pois os campos estão diretamente na empresa
        return empresasArray.map(empresa => {
            // Verificar se tem campos de turno individuais
            if (empresa.shiftId && empresa.workDate && empresa.workStage && empresa.workPeriod) {
                return empresa; // Já está no formato correto
            }

            // Fallback para compatibilidade (empresas antigas sem campos individuais)
            return {
                ...empresa,
                shiftId: empresa.shiftId || '',
                workDate: empresa.workDate || '',
                workStage: empresa.workStage || 'evento',
                workPeriod: empresa.workPeriod || 'diurno'
            };
        });
    }, []);

    // Normalizar todos os dados (único dataset)
    const allEmpresas = useMemo(() => {
        return normalizeEmpresas(rawEmpresas ?? []);
    }, [rawEmpresas, normalizeEmpresas])

    // Para filtros da tabela, usar os mesmos dados normalizados
    const empresas = allEmpresas

    // Dias disponíveis baseado no evento atual
    const availableDays = useMemo(() => {
        return eventDays;
    }, [eventDays])

    // Organizar empresas por shiftId (modelo individual - cada empresa é um shift)
    const empresasByShift = useMemo(() => {
        const grouped: Record<string, Empresa[]> = {}

        // Inicializar todas as shifts
        eventDays.forEach(day => {
            grouped[day.id] = []
        })

        // Agrupar empresas por shiftId usando campos individuais
        empresas.forEach(empresa => {
            if (empresa.shiftId && grouped[empresa.shiftId]) {
                grouped[empresa.shiftId].push(empresa)
            }
        })

        // Ordenar empresas alfabeticamente em cada shift
        Object.keys(grouped).forEach(shiftId => {
            grouped[shiftId].sort((a, b) => a.nome.localeCompare(b.nome))
        })

        return grouped
    }, [empresas, eventDays])

    // Filtrar empresas por termo de pesquisa
    const filteredEmpresasByShift = useMemo(() => {
        if (!searchTerm) return empresasByShift

        const filtered: Record<string, Empresa[]> = {}

        Object.keys(empresasByShift).forEach(shiftId => {
            const filteredEmpresas = empresasByShift[shiftId].filter(empresa =>
                empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (empresa.id_evento && empresa.id_evento.includes(searchTerm)) ||
                (Array.isArray(empresa.days) && empresa.days.some((day: string) => day.toLowerCase().includes(searchTerm.toLowerCase())))
            )

            if (filteredEmpresas.length > 0) {
                filtered[shiftId] = filteredEmpresas
            }
        })

        return filtered
    }, [empresasByShift, searchTerm])

    // Datas disponíveis para o menu (mesmo que availableDays)
    const availableDates = availableDays

    // Estatísticas (no novo modelo cada registro é um shift individual)
    const stats = useMemo(() => {
        if (!allEmpresas) {
            return {
                total: 0,
                configuradas: 0,
                parcialmenteConfiguradas: 0,
                naoConfiguradas: 0,
                uniqueEmpresas: 0
            }
        }

        // No novo modelo, cada record é um shift de uma empresa
        const total = allEmpresas.length

        // Empresas únicas (agrupar por nome)
        const uniqueEmpresasSet = new Set(allEmpresas.map(e => e.nome))
        const uniqueEmpresas = uniqueEmpresasSet.size

        // Uma empresa é considerada configurada se tem campos de shift individuais
        const configuradas = allEmpresas.filter(e =>
            e.shiftId && e.workDate && e.workStage && e.workPeriod
        ).length

        const parcialmenteConfiguradas = allEmpresas.filter(e =>
            e.id_evento && (!e.shiftId || !e.workDate || !e.workStage || !e.workPeriod)
        ).length

        const naoConfiguradas = allEmpresas.filter(e =>
            !e.id_evento && (!e.shiftId || !e.workDate || !e.workStage || !e.workPeriod)
        ).length

        return {
            total,
            configuradas,
            parcialmenteConfiguradas,
            naoConfiguradas,
            uniqueEmpresas
        }
    }, [allEmpresas])


    const handleUpdateEmpresa = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedEmpresa) return
        try {
            // Com o novo modelo individual, precisamos atualizar apenas os campos básicos
            // A lógica de shifts individuais é tratada na criação de novas empresas
            const empresaData = {
                nome: formData.nome,
                id_evento: formData.id_evento,
                days: formData.days
            }

            await updateEmpresaMutation.mutateAsync({
                id: selectedEmpresa.id,
                data: empresaData
            })
            setIsEditDialogOpen(false)
            setSelectedEmpresa(null)
            setFormData({
                nome: "",
                id_evento: eventId,
                days: []
            })
            toast.success("Empresa atualizada com sucesso!")
        } catch (error) {
            console.error("Erro ao atualizar empresa:", error)
            toast.error("Erro ao atualizar empresa")
        }
    }

    const handleDeleteEmpresa = async (empresa: Empresa) => {
        if (confirm(`Tem certeza que deseja deletar a empresa "${empresa.nome}"?`)) {
            try {
                await deleteEmpresaMutation.mutateAsync(empresa.id)
                toast.success("Empresa deletada com sucesso!")
            } catch (error) {
                console.error("Erro ao deletar empresa:", error)
                toast.error("Erro ao deletar empresa")
            }
        }
    }

    const handleEditEmpresa = (empresa: Empresa) => {
        setSelectedEmpresa(empresa)
        setFormData({
            nome: empresa.nome,
            id_evento: empresa.id_evento || "",
            days: Array.isArray(empresa.days) ? empresa.days : []
        })
        setIsEditDialogOpen(true)
    }

    const eventName =
        Array.isArray(event)
            ? ""
            : event?.name || ""


    // Função para gerar token de acesso público
    // O token contém: empresaId:eventId:timestamp
    // A página pública decodifica o token e busca os dados correspondentes
    // Usuários Clerk podem editar informações dos colaboradores diretamente na página pública
    const generatePublicToken = (empresa: Empresa) => {
        const token = btoa(`${empresa.id}:${eventId}:${Date.now()}`)
        const publicUrl = `${window.location.origin}/empresa/${token}`
        return publicUrl
    }

    // Função para copiar URL pública
    const copyPublicUrl = async (empresa: Empresa) => {
        try {
            const url = generatePublicToken(empresa)
            await navigator.clipboard.writeText(url)
            toast.success("URL pública copiada para a área de transferência!")
        } catch (error) {
            console.error("Erro ao copiar URL:", error)
            toast.error("Erro ao copiar URL")
        }
    }

    // Inicializar formData com o evento atual
    React.useEffect(() => {
        if (eventId) {
            setFormData(prev => ({
                ...prev,
                id_evento: eventId
            }))
        }
    }, [eventId])

    // Selecionar primeiro dia por padrão
    React.useEffect(() => {
        if (availableDates.length > 0 && !selectedDay) {
            setSelectedDay(availableDates[0].id)
        }
    }, [availableDates, selectedDay])

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
    const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
        if (period === 'diurno') {
            return <Sun className="h-3 w-3 text-yellow-500" />;
        } else if (period === 'noturno') {
            return <Moon className="h-3 w-3 text-blue-500" />;
        } else if (period === 'dia_inteiro') {
            return <Clock className="h-3 w-3 text-purple-500" />;
        }
        return null;
    }, [])

    // Função para obter status badge (modelo individual)
    const getStatusBadge = (empresa: Empresa) => {
        // Com o novo modelo individual, verificar se tem campos de shift
        if (empresa.shiftId && empresa.workDate && empresa.workStage && empresa.workPeriod) {
            return <Badge className="bg-green-100 text-green-800">Configurado</Badge>
        } else if (empresa.id_evento) {
            return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>
        } else {
            return <Badge className="bg-gray-100 text-gray-800">Não configurado</Badge>
        }
    }

    if (!event || Array.isArray(event)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                </div>
            </div>
        )
    }

    return (
        <EventLayout eventId={eventId} eventName={eventName}>
            <div className="p-8">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Empresas Únicas</p>
                                    <p className="text-3xl font-bold">{stats.uniqueEmpresas}</p>

                                </div>
                                <Building className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Configuradas</p>
                                    <p className="text-3xl font-bold">{stats.configuradas}</p>
                                </div>
                                <Check className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Parcialmente</p>
                                    <p className="text-3xl font-bold">{stats.parcialmenteConfiguradas}</p>
                                </div>
                                <Calendar className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Não Configuradas</p>
                                    <p className="text-3xl font-bold">{stats.naoConfiguradas}</p>
                                </div>
                                <X className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Bar */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <Link href={`/eventos/${eventId}/empresas/create`}>
                                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nova Empresa
                                </Button>
                            </Link>

                            <Input
                                type="text"
                                placeholder="Buscar empresa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-80"
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs dos dias */}
                <div className="mb-8">
                    <div className="border-b border-gray-200 bg-white rounded-t-lg">
                        <nav className="-mb-px flex flex-wrap gap-1 px-4 py-2">
                            {availableDates.map((day) => {
                                // Filtrar empresas pelo shiftId usando campos individuais
                                const empresasInDay = allEmpresas.filter(empresa => {
                                    return empresa.shiftId === day.id;
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
                                                    {day.type === 'montagem' ? 'MONTAGEM' :
                                                        day.type === 'evento' ? 'EVENTO' :
                                                            day.type === 'desmontagem' ? 'DESMONTAGEM' :
                                                                'EVENTO'}
                                                </span>
                                                {day.period && (
                                                    <span className="text-xs opacity-60">
                                                        ({day.period === 'diurno' ? 'D' : day.period === 'noturno' ? 'N' : 'DI'})
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs opacity-75">
                                                {isLoading ? (
                                                    <span className="inline-block w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                                                ) : (
                                                    `(${empresasInDay})`
                                                )}
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                {/* Tabela de empresas */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Empresa
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Dias de Trabalho
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                <p>Carregando empresas...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredEmpresasByShift[selectedDay]?.length > 0 ? (
                                    filteredEmpresasByShift[selectedDay].map((empresa) => (
                                        <tr key={empresa.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">

                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {empresa.nome}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {empresa.id.slice(0, 8)}...
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                    {empresa.shiftId && empresa.workDate && empresa.workStage && empresa.workPeriod ? (
                                                        <div className="flex flex-col gap-1">
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                                                            >
                                                                {formatEventDate(empresa.workDate + 'T00:00:00')} - {empresa.workStage?.toUpperCase()} - {empresa.workPeriod === 'diurno' ? 'Diurno' : 'Noturno'}
                                                            </Badge>
                                                            <div className="text-xs text-gray-500 font-mono">
                                                                {empresa.shiftId}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400 italic">Não configurado</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(empresa)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEditEmpresa(empresa)}
                                                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                                    >
                                                        <Edit className="w-4 h-4 mr-1" />
                                                        Editar
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-gray-600 border-gray-200 hover:bg-gray-50"
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 bg-white text-black border-gray-200">
                                                            <DropdownMenuItem
                                                                onClick={() => copyPublicUrl(empresa)}
                                                                className="cursor-pointer"
                                                            >
                                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                                Copiar URL Pública
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteEmpresa(empresa)}
                                                                className="cursor-pointer text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Excluir
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <Building className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-lg font-semibold text-gray-700 mb-2">
                                                    {selectedDay ? `Nenhuma empresa encontrada para este turno` : 'Selecione um turno'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {selectedDay ? 'Crie uma nova empresa para este turno' : 'Escolha um turno do evento para ver as empresas'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>


                {/* Dialog de Edição */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900">
                        <DialogHeader>
                            <DialogTitle>Editar Empresa</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpdateEmpresa} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome da Empresa *
                                </label>
                                <Input
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Digite o nome da empresa"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Evento
                                </label>
                                <Select
                                    value={formData.id_evento}
                                    onValueChange={(value) => setFormData({ ...formData, id_evento: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um evento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.isArray(eventos) && eventos.map((evento: any) => (
                                            <SelectItem key={evento.id} value={evento.id}>
                                                {evento.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dias de Trabalho
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                                    {availableDays.map((day) => (
                                        <Button
                                            key={day.id}
                                            type="button"
                                            variant={(formData.days || []).includes(day.id) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                const currentDays = formData.days || []
                                                const newDays = currentDays.includes(day.id)
                                                    ? currentDays.filter(d => d !== day.id)
                                                    : [...currentDays, day.id]
                                                setFormData({ ...formData, days: newDays })
                                            }}
                                            className="text-xs"
                                        >
                                            {day.label}
                                        </Button>
                                    ))}
                                </div>
                                {(formData.days || []).length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-600">
                                            Dias selecionados: {(formData.days || []).length}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false)
                                        setSelectedEmpresa(null)
                                        setFormData({
                                            nome: "",
                                            id_evento: eventId,
                                            days: []
                                        })
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!formData.nome || updateEmpresaMutation.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {updateEmpresaMutation.isPending ? "Atualizando..." : "Atualizar Empresa"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}