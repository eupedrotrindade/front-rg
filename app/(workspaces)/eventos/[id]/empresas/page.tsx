/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Edit, Trash2, Building, Calendar, Check, X, MoreHorizontal, ExternalLink, Sun, Moon, Clock, Package, Copy } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useEmpresasByEvent } from "@/features/eventos/api/query/use-empresas"
import { useCreateEmpresa, useDeleteEmpresa, useUpdateEmpresa } from "@/features/eventos/api/mutation"
import { useEventos } from "@/features/eventos/api/query"
import type { CreateEmpresaRequest, Empresa, Event } from "@/features/eventos/types"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useParams } from "next/navigation"
import { formatEventDate, getCurrentDateISO } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"

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
    const [isQuickInsertModalOpen, setIsQuickInsertModalOpen] = useState(false)
    const [quickInsertText, setQuickInsertText] = useState('')
    const [isProcessingQuickInsert, setIsProcessingQuickInsert] = useState(false)
    const [isReplicateModalOpen, setIsReplicateModalOpen] = useState(false)
    const [sourceShiftId, setSourceShiftId] = useState<string>('')
    const [targetShiftIds, setTargetShiftIds] = useState<string[]>([])
    const [isProcessingReplicate, setIsProcessingReplicate] = useState(false)

    // Hooks
    const eventId = useParams().id as string

    // Single query strategy - we'll use frontend filtering like estacionamento
    const { data: rawEmpresas = [], isLoading, error } = useEmpresasByEvent(eventId)

    const createEmpresaMutation = useCreateEmpresa()
    const updateEmpresaMutation = useUpdateEmpresa()
    const deleteEmpresaMutation = useDeleteEmpresa()

    const { data: eventos } = useEventos()
    const event = useMemo(() => {
        const foundEvent = Array.isArray(eventos)
            ? eventos.find(e => String(e.id) === String(eventId))
            : undefined
        return foundEvent
    }, [eventos, eventId])

    // Função helper para garantir que os dados sejam arrays válidos
    const ensureArray = useCallback((data: any): any[] => {
        if (!data) return []

        // Se for string, tentar fazer parse
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data)
                return Array.isArray(parsed) ? parsed : []
            } catch (error) {
                console.warn('⚠️ Dados não são JSON válido:', data)
                return []
            }
        }

        // Se já for array, retornar como está
        if (Array.isArray(data)) {
            return data
        }

        // Se for objeto, tentar extrair dados
        if (typeof data === 'object' && data !== null) {
            console.warn('⚠️ Dados inesperados para dias do evento:', data)
            return []
        }

        return []
    }, [])

    // Função para gerar dias do evento usando apenas a nova estrutura (alinhada com page.tsx)
    const getEventDays = useCallback((): Array<{
        id: string
        label: string
        date: string
        type: string
        period?: 'diurno' | 'noturno' | 'dia_inteiro'
    }> => {
        console.log('🔧 getEventDays chamada, evento:', event)

        if (!event) {
            console.log('❌ Evento não encontrado')
            return []
        }

        const days: Array<{
            id: string
            label: string
            date: string
            type: string
            period?: 'diurno' | 'noturno' | 'dia_inteiro'
        }> = []

        // Função helper para processar cada fase
        const processPhaseData = (phaseData: any[], phaseType: 'montagem' | 'evento' | 'desmontagem', phaseLabel: string) => {
            const data = ensureArray(phaseData)
            console.log(`🔧 Processando ${phaseType}:`, data)

            data.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date)
                        // ✅ CORREÇÃO: Extrair dateISO diretamente da string para evitar problemas de fuso horário
                        const dateISO = day.date.match(/^\d{4}-\d{2}-\d{2}/)
                            ? day.date.split('T')[0]
                            : new Date(day.date + 'T12:00:00').toISOString().split('T')[0]
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'

                        console.log(`✅ Adicionando ${phaseType}: ${dateStr} - ${periodLabel}`)
                        days.push({
                            id: `${dateISO}-${phaseType}-${day.period}`,
                            label: `${dateStr} (${phaseLabel.toUpperCase()} - ${periodLabel})`,
                            date: dateStr,
                            type: phaseType,
                            period: day.period
                        })
                    } catch (error) {
                        console.error(`❌ Erro ao processar data da ${phaseType}:`, day, error)
                    }
                }
            })
        }

        // Processar todas as fases na ordem correta
        processPhaseData(event.montagem, 'montagem', 'montagem')
        processPhaseData(event.evento, 'evento', 'evento')
        processPhaseData(event.desmontagem, 'desmontagem', 'desmontagem')

        // Ordenar por data e período para garantir ordem cronológica
        days.sort((a, b) => {
            // Extrair dateISO do ID para ordenação
            const dateA = a.id.split('-').slice(0, 3).join('-')
            const dateB = b.id.split('-').slice(0, 3).join('-')

            // Primeiro, ordenar por data
            const dateCompare = dateA.localeCompare(dateB)
            if (dateCompare !== 0) return dateCompare

            // Se mesma data, ordenar por período (diurno antes de noturno)
            const periodOrder = { 'diurno': 0, 'dia_inteiro': 1, 'noturno': 2 }
            const periodA = a.period || 'diurno'
            const periodB = b.period || 'diurno'

            return (periodOrder[periodA] || 0) - (periodOrder[periodB] || 0)
        })

        // Debug detalhado para investigar o problema
        console.log('🎯 Dias finais gerados (ordenados):', days)
        console.log('🔍 Debug detalhado por tipo:')
        console.log('📦 Montagem:', days.filter(d => d.type === 'montagem'))
        console.log('🎭 Evento:', days.filter(d => d.type === 'evento'))
        console.log('🔧 Desmontagem:', days.filter(d => d.type === 'desmontagem'))

        // Verificar se há conflitos de data/período
        const conflicts = new Map<string, any[]>()
        days.forEach(day => {
            const key = `${day.date}-${day.period}`
            if (!conflicts.has(key)) {
                conflicts.set(key, [])
            }
            conflicts.get(key)!.push(day)
        })

        conflicts.forEach((dayList, key) => {
            if (dayList.length > 1) {
                console.warn(`⚠️ Conflito detectado para ${key}:`, dayList)
            }
        })

        return days
    }, [event, ensureArray])

    // Memoizar dias do evento para evitar recálculo
    const eventDays = useMemo(() => {
        return getEventDays()
    }, [getEventDays])

    // Auto-selecionar primeiro dia se nenhum estiver selecionado
    const shouldAutoSelectDay = !selectedDay && eventDays.length > 0
    const effectiveSelectedDay = shouldAutoSelectDay ? eventDays[0].id : selectedDay

    // Função para extrair informações do shift ID
    const parseShiftId = useCallback((shiftId: string) => {
        if (!shiftId) {
            return {
                workDate: getCurrentDateISO(),
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

    // Função para replicar empresas entre turnos
    const handleReplicateEmpresas = async () => {
        if (!sourceShiftId || targetShiftIds.length === 0) {
            toast.error('Selecione um turno de origem e pelo menos um turno de destino')
            return
        }

        setIsProcessingReplicate(true)

        try {
            // Buscar empresas do turno de origem
            const sourceEmpresas = allEmpresas.filter(empresa => empresa.shiftId === sourceShiftId)

            if (sourceEmpresas.length === 0) {
                toast.error('Nenhuma empresa encontrada no turno de origem')
                return
            }

            let totalCreated = 0
            let totalSkipped = 0
            let totalErrors = 0

            // Para cada turno de destino
            for (const targetShiftId of targetShiftIds) {
                const targetShiftInfo = parseShiftId(targetShiftId)

                // Verificar quais empresas já existem no turno de destino
                const existingEmpresas = allEmpresas.filter(empresa =>
                    empresa.shiftId === targetShiftId
                ).map(e => e.nome.toLowerCase())

                // Para cada empresa do turno de origem
                for (const empresa of sourceEmpresas) {
                    // Verificar se a empresa já existe no turno de destino
                    if (existingEmpresas.includes(empresa.nome.toLowerCase())) {
                        totalSkipped++
                        continue
                    }

                    try {
                        // Criar nova empresa no turno de destino
                        const novaEmpresaData = {
                            nome: empresa.nome,
                            id_evento: empresa.id_evento,
                            email: empresa.email,
                            telefone: empresa.telefone,
                            endereco: empresa.endereco,
                            cidade: empresa.cidade,
                            estado: empresa.estado,
                            cep: empresa.cep,
                            responsavel: empresa.responsavel,
                            observacoes: empresa.observacoes,
                            days: [targetShiftId],
                            shiftId: targetShiftId,
                            workDate: targetShiftInfo.workDate,
                            workStage: targetShiftInfo.workStage,
                            workPeriod: targetShiftInfo.workPeriod
                        }

                        await createEmpresaMutation.mutateAsync(novaEmpresaData)
                        totalCreated++
                    } catch (error) {
                        console.error('Erro ao replicar empresa:', error)
                        totalErrors++
                    }
                }
            }

            // Feedback para o usuário
            const messages = []
            if (totalCreated > 0) messages.push(`${totalCreated} empresa(s) replicada(s)`)
            if (totalSkipped > 0) messages.push(`${totalSkipped} empresa(s) já existiam`)
            if (totalErrors > 0) messages.push(`${totalErrors} erro(s)`)

            if (totalCreated > 0) {
                toast.success(messages.join(', '))
            } else {
                toast.info(messages.join(', ') || 'Nenhuma empresa foi replicada')
            }

            // Limpar estados
            setIsReplicateModalOpen(false)
            setSourceShiftId('')
            setTargetShiftIds([])

        } catch (error) {
            console.error('Erro durante replicação:', error)
            toast.error('Erro durante a replicação de empresas')
        } finally {
            setIsProcessingReplicate(false)
        }
    }

    // Função para processar inserção rápida de empresas
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
            // Processar texto: cada linha é uma entrada, separada por vírgula para nome,email,telefone,responsavel
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
                // Separar por vírgula: nome,email,telefone,responsavel
                const parts = line.split(',').map(part => part.trim());
                const nome = parts[0] || '';
                const email = parts[1] || '';
                const telefone = parts[2] || '';
                const responsavel = parts[3] || '';

                if (!nome) {
                    errorCount++;
                    continue;
                }

                const empresaData = {
                    nome,
                    email: email || undefined,
                    telefone: telefone || undefined,
                    responsavel: responsavel || undefined,
                    id_evento: eventId,
                    days: [selectedDay],
                    shiftId: selectedDay,
                    workDate: shiftInfo.workDate || getCurrentDateISO(),
                    workStage: shiftInfo.workStage || 'evento',
                    workPeriod: shiftInfo.workPeriod || 'diurno',
                };

                try {
                    console.log('📤 Criando empresa (inserção rápida):', empresaData);
                    await createEmpresaMutation.mutateAsync(empresaData);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error('❌ Erro ao criar empresa (inserção rápida):', {
                        error,
                        empresaData,
                        errorMessage: (error as any)?.message,
                        errorResponse: (error as any)?.response?.data,
                        errorStatus: (error as any)?.response?.status
                    });
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} empresa(s) criada(s) com sucesso!`);
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

                            <Button
                                onClick={() => setIsQuickInsertModalOpen(true)}
                                disabled={!selectedDay}
                                variant="outline"
                                className="border-purple-500 text-purple-600 hover:bg-purple-50"
                            >
                                <Package className="w-4 h-4 mr-2" />
                                Inserção Rápida
                            </Button>

                            <Button
                                onClick={() => setIsReplicateModalOpen(true)}
                                variant="outline"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Replicar Empresas
                            </Button>

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
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(generatePublicToken(empresa), '_blank')}
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
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

                {/* Modal para inserção rápida */}
                <Dialog open={isQuickInsertModalOpen} onOpenChange={setIsQuickInsertModalOpen}>
                    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Inserção Rápida de Empresas</DialogTitle>
                            <DialogDescription>
                                Adicione múltiplas empresas rapidamente. Uma linha por empresa, separando dados por vírgula.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Instruções */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-medium text-blue-900 mb-2">🏢 Como usar:</h3>
                                <div className="text-sm text-blue-700 space-y-1">
                                    <p>• <strong>Uma linha por empresa</strong></p>
                                    <p>• <strong>Formato:</strong> Nome da Empresa, E-mail, Telefone, Responsável</p>
                                    <p>• <strong>Obrigatório:</strong> apenas o nome da empresa</p>
                                    <p>• <strong>Opcional:</strong> e-mail, telefone, responsável (podem ficar vazios)</p>
                                </div>
                            </div>

                            {/* Exemplos */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-2">✨ Exemplos:</h3>
                                <div className="text-sm text-gray-700 font-mono space-y-1">
                                    <p>Empresa ABC Ltda, contato@abc.com.br, (11) 99999-9999, João Silva</p>
                                    <p>Construtora XYZ, , (21) 88888-8888, Maria Santos</p>
                                    <p>Logística 123, logistica@123.com, , </p>
                                    <p>Fornecedora DEF</p>
                                </div>
                            </div>

                            {/* Área de texto para entrada */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Digite as empresas (uma por linha):
                                </label>
                                <Textarea
                                    value={quickInsertText}
                                    onChange={(e) => setQuickInsertText(e.target.value)}
                                    placeholder="Empresa ABC Ltda, contato@abc.com.br, (11) 99999-9999, João Silva\nConstrutora XYZ, , (21) 88888-8888, Maria Santos\nLogística 123, logistica@123.com, , \nFornecedora DEF"
                                    className="min-h-[200px] font-mono text-sm"
                                    disabled={isProcessingQuickInsert}
                                />
                            </div>

                            {/* Preview */}
                            {quickInsertText.trim() && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="font-medium text-green-900 mb-2">
                                        🔍 Preview ({quickInsertText.split('\n').filter(line => line.trim()).length} empresa(s)):
                                    </h3>
                                    <div className="text-sm text-green-700 space-y-1 max-h-32 overflow-y-auto">
                                        {quickInsertText
                                            .split('\n')
                                            .filter(line => line.trim())
                                            .slice(0, 5)
                                            .map((line, index) => {
                                                const parts = line.split(',').map(p => p.trim());
                                                const nome = parts[0] || '';
                                                const email = parts[1] || '';
                                                const telefone = parts[2] || '';
                                                const responsavel = parts[3] || '';
                                                return (
                                                    <div key={index} className="font-mono text-xs">
                                                        <span className="font-semibold">{nome}</span>
                                                        {email && <span className="text-blue-600 ml-2">{email}</span>}
                                                        {telefone && <span className="text-purple-600 ml-2">{telefone}</span>}
                                                        {responsavel && <span className="text-orange-600 ml-2">{responsavel}</span>}
                                                    </div>
                                                );
                                            })}
                                        {quickInsertText.split('\n').filter(line => line.trim()).length > 5 && (
                                            <div className="text-xs text-gray-500 italic">
                                                ... e mais {quickInsertText.split('\n').filter(line => line.trim()).length - 5} empresa(s)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Info sobre o turno selecionado */}
                            {selectedDay && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                    <div className="text-sm text-purple-700">
                                        <strong>Turno selecionado:</strong> {availableDays.find(d => d.id === selectedDay)?.label}
                                    </div>
                                    <div className="text-xs text-purple-600 mt-1">
                                        Todas as empresas serão associadas a este turno.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Ações do modal */}
                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={() => {
                                    setIsQuickInsertModalOpen(false);
                                    setQuickInsertText('');
                                }}
                                variant="outline"
                                disabled={isProcessingQuickInsert}
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
                                        <Package className="w-4 h-4 mr-2" />
                                        Criar {quickInsertText.split('\n').filter(line => line.trim()).length} Empresa(s)
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal para replicação de empresas */}
                <Dialog open={isReplicateModalOpen} onOpenChange={setIsReplicateModalOpen}>
                    <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Replicar Empresas Entre Turnos</DialogTitle>
                            <DialogDescription>
                                Copie empresas de um turno para outros turnos do evento.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Instruções */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-medium text-blue-900 mb-2">📋 Como funciona:</h3>
                                <div className="text-sm text-blue-700 space-y-1">
                                    <p>• Selecione um <strong>turno de origem</strong> (onde estão as empresas)</p>
                                    <p>• Selecione um ou mais <strong>turnos de destino</strong> (para onde copiar)</p>
                                    <p>• Empresas que já existem nos turnos de destino serão ignoradas</p>
                                </div>
                            </div>

                            {/* Turno de origem */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700">
                                    Turno de Origem:
                                </label>
                                <Select value={sourceShiftId} onValueChange={setSourceShiftId}>
                                    <SelectTrigger className="border-gray-300">
                                        <SelectValue placeholder="Selecione o turno de origem" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60 bg-white border border-gray-400 shadow-none
">
                                        {availableDays.map((day) => {
                                            const empresasCount = allEmpresas.filter(e => e.shiftId === day.id).length
                                            return (
                                                <SelectItem key={day.id} value={day.id}>
                                                    <div className="flex items-center justify-between w-full">
                                                        <span>{day.label}</span>
                                                        <span className="text-xs text-gray-500 ml-2">
                                                            ({empresasCount} empresa{empresasCount !== 1 ? 's' : ''})
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>

                                {sourceShiftId && (
                                    <div className="text-sm text-gray-600">
                                        {allEmpresas.filter(e => e.shiftId === sourceShiftId).length} empresa(s) disponível(is) para replicação
                                    </div>
                                )}
                            </div>

                            {/* Turnos de destino */}
                            <div className="space-y-3 ">
                                <label className="text-sm font-medium text-gray-700">
                                    Turnos de Destino:
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-3">
                                    {availableDays
                                        .filter(day => day.id !== sourceShiftId) // Excluir turno de origem
                                        .map((day) => {
                                            const isSelected = targetShiftIds.includes(day.id)
                                            const empresasCount = allEmpresas.filter(e => e.shiftId === day.id).length

                                            return (
                                                <Button
                                                    key={day.id}
                                                    type="button"
                                                    variant={isSelected ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setTargetShiftIds(prev => prev.filter(id => id !== day.id))
                                                        } else {
                                                            setTargetShiftIds(prev => [...prev, day.id])
                                                        }
                                                    }}
                                                    className="text-xs h-auto py-2 px-3 justify-start"
                                                >
                                                    <div className="flex flex-col items-start w-full">
                                                        <span className="font-medium">{day.label.split(' (')[0]}</span>
                                                        <span className="text-xs opacity-75">
                                                            {day.label.split(' (')[1]?.replace(')', '')} - {empresasCount} empresa{empresasCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </Button>
                                            )
                                        })}
                                </div>

                                {targetShiftIds.length > 0 && (
                                    <div className="text-sm text-gray-600">
                                        {targetShiftIds.length} turno(s) de destino selecionado(s)
                                    </div>
                                )}
                            </div>

                            {/* Preview da replicação */}
                            {sourceShiftId && targetShiftIds.length > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="font-medium text-green-900 mb-2">
                                        🔍 Preview da Replicação:
                                    </h3>
                                    <div className="text-sm text-green-700">
                                        <p className="mb-2">
                                            <strong>Origem:</strong> {availableDays.find(d => d.id === sourceShiftId)?.label}
                                            ({allEmpresas.filter(e => e.shiftId === sourceShiftId).length} empresa{allEmpresas.filter(e => e.shiftId === sourceShiftId).length !== 1 ? 's' : ''})
                                        </p>
                                        <p className="mb-2">
                                            <strong>Destino(s):</strong> {targetShiftIds.length} turno(s)
                                        </p>
                                        <p>
                                            <strong>Total de operações:</strong> até {allEmpresas.filter(e => e.shiftId === sourceShiftId).length * targetShiftIds.length} empresa(s)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Ações do modal */}
                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={() => {
                                    setIsReplicateModalOpen(false)
                                    setSourceShiftId('')
                                    setTargetShiftIds([])
                                }}
                                variant="outline"
                                disabled={isProcessingReplicate}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleReplicateEmpresas}
                                disabled={!sourceShiftId || targetShiftIds.length === 0 || isProcessingReplicate}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                                {isProcessingReplicate ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Replicando...
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Replicar Empresas
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}