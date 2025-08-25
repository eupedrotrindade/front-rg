/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import apiClient from "@/lib/api-client"
import { formatCpf, isValidCpf, formatCpfInput } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2, Download, Upload, Plus, Edit, Trash2, Users, UserPlus, RefreshCw, Activity, Sun, Moon, Clock, Eye, EyeOff, Power } from "lucide-react"
import { useParams } from "next/navigation"
import { useOperatorsByEvent } from "@/features/operadores/api/query/use-operators-by-event"
import { useOperators } from "@/features/operadores/api/query/use-operators"
import type { Operator } from "@/features/operadores/types"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useQueryClient } from "@tanstack/react-query"
import { useDefaultPassword } from "@/features/configuracoes/api/query/use-configuracoes-gerais"

export default function OperadoresPage() {
    const params = useParams()
    const eventId = params.id as string
    const queryClient = useQueryClient()

    const [filtro, setFiltro] = useState({ busca: "" })
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null)
    const [modalAberto, setModalAberto] = useState(false)
    const [nomeEvento, setNomeEvento] = useState<string>("")
    const [loading, setLoading] = useState(false)

    // Estados para filtros
    const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'nome', direcao: 'asc' })

    // Estados para importação
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Estados para importação e duplicados
    const [registrosUnicos, setRegistrosUnicos] = useState<Operator[]>([])
    const [importDialogLoading, setImportDialogLoading] = useState(false)
    const [resumoDialogOpen, setResumoDialogOpen] = useState(false)
    const [resumoImportacao, setResumoImportacao] = useState<{ importados: Operator[]; falhados?: { item: Operator; motivo: string }[] }>({ importados: [], falhados: [] })

    // Estados para edição
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [operatorToEdit, setOperatorToEdit] = useState<Operator | null>(null)
    const [editForm, setEditForm] = useState({
        nome: "",
        cpf: "",
        senha: ""
    })
    const [editSelectedEventDates, setEditSelectedEventDates] = useState<string[]>([])

    // Estados para criação
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [createForm, setCreateForm] = useState({
        nome: "",
        cpf: "",
        senha: ""
    })
    const [cpfExists, setCpfExists] = useState(false)

    // Estados para exclusão
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [operatorToDelete, setOperatorToDelete] = useState<Operator | null>(null)

    // Estados para Retirada de operadores
    const [assignDialogOpen, setAssignDialogOpen] = useState(false)
    const [selectedOperators, setSelectedOperators] = useState<string[]>([])
    const [assignLoading, setAssignLoading] = useState(false)
    const [assignSearch, setAssignSearch] = useState("")
    const [allOperatorsSearch, setAllOperatorsSearch] = useState("")
    const [selectedEventDates, setSelectedEventDates] = useState<string[]>([])

    // Debug: Log do estado de seleção
    useEffect(() => {
        console.log("🔍 Estado selectedOperators atualizado:", selectedOperators)
    }, [selectedOperators])

    // Hook para buscar senha padrão das configurações (DEVE vir antes do useEffect que a usa)
    const { data: defaultPassword, isLoading: loadingDefaultPassword } = useDefaultPassword()

    // Definir senha padrão quando carregada
    useEffect(() => {
        if (defaultPassword && !createForm.senha) {
            setCreateForm(prev => ({ ...prev, senha: defaultPassword }))
        }
    }, [defaultPassword, createForm.senha])

    // Verificar CPF quando o campo é alterado
    useEffect(() => {
        if (createForm.cpf && createForm.cpf.length === 14) {
            const timeoutId = setTimeout(() => {
                checkCpfExists(createForm.cpf)
            }, 500)
            return () => clearTimeout(timeoutId)
        } else {
            setCpfExists(false)
        }
    }, [createForm.cpf])



    // Estados para armazenar o arquivo selecionado para importação
    const [fileToImport, setFileToImport] = useState<File | null>(null)

    // Estados para a aba de ações
    const [activeTab, setActiveTab] = useState("operadores")
    const [actionsFilter, setActionsFilter] = useState({ busca: "", tipo: "all-types", operador: "all-operators" })
    const [allActions, setAllActions] = useState<any[]>([])
    const [loadingActions, setLoadingActions] = useState(false)

    // Estados para modal de detalhes da ação
    const [actionDetailsOpen, setActionDetailsOpen] = useState(false)
    const [selectedAction, setSelectedAction] = useState<any>(null)

    // Hooks de dados - devem vir antes das funções que os usam
    const { data: operadores = [], isLoading: loadingOperadores } = useOperatorsByEvent({
        eventId,
        search: filtro.busca,
        sortBy: ordenacao.campo,
        sortOrder: ordenacao.direcao
    })
    const { data: allOperators = [], isLoading: loadingAllOperators, refetch: refetchAllOperators } = useOperators()
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null

    // Função helper para formatar data do evento
    const formatEventDate = useCallback((dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }, []);

    // Função para extrair data do shift ID (compatibilidade com novo sistema)
    const parseShiftId = useCallback((shiftId: string) => {
        // Formato esperado: YYYY-MM-DD-stage-period
        const parts = shiftId.split('-');
        if (parts.length >= 5) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            const stage = parts[3];
            const period = parts[4] as 'diurno' | 'noturno' | 'dia_inteiro';

            return {
                dateISO: `${year}-${month}-${day}`,
                dateFormatted: formatEventDate(`${year}-${month}-${day}T00:00:00`),
                stage,
                period
            };
        }

        // Fallback para formato simples (apenas data)
        try {
            const dateFormatted = formatEventDate(shiftId.includes('T') ? shiftId : shiftId + 'T00:00:00');
            return {
                dateISO: shiftId,
                dateFormatted,
                stage: 'unknown',
                period: 'diurno' as const
            };
        } catch (error) {
            // Se não conseguir fazer parse da data, retornar valor padrão
            return {
                dateISO: shiftId,
                dateFormatted: shiftId,
                stage: 'unknown',
                period: 'diurno' as const
            };
        }
    }, [formatEventDate]);

    // Função helper para garantir que os dados sejam arrays válidos
    const ensureArray = useCallback((data: any): any[] => {
        if (!data) return [];

        // Se for string, tentar fazer parse
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                console.warn('⚠️ Dados não são JSON válido:', data);
                return [];
            }
        }

        // Se já for array, retornar como está
        if (Array.isArray(data)) {
            return data;
        }

        // Se for objeto, tentar extrair dados
        if (typeof data === 'object' && data !== null) {
            console.warn('⚠️ Dados inesperados para dias do evento:', data);
            return [];
        }

        return [];
    }, []);

    // Nova função para obter turnos do evento baseada no sistema de shifts
    const getEventDays = useCallback(() => {
        if (!evento) return [];

        console.log('🔧 getEventDays (operadores) chamada, evento:', evento);

        const days: Array<{
            id: string;
            label: string;
            date: string;
            type: string;
            period?: 'diurno' | 'noturno' | 'dia_inteiro';
        }> = [];

        // Usar a nova estrutura SimpleEventDay se disponível com suporte a turnos
        const montagemData = ensureArray(evento.montagem);
        console.log('🔧 Processando montagem (operadores):', montagemData);
        if (montagemData.length > 0) {
            montagemData.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date);
                        const dateISO = new Date(day.date).toISOString().split('T')[0];
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

                        console.log(`✅ Adicionando montagem (operadores): ${dateStr} - ${periodLabel}`);
                        days.push({
                            id: `${dateISO}-montagem-${day.period}`,
                            label: `${dateStr} • Montagem • ${periodLabel}`,
                            date: dateStr,
                            type: 'montagem',
                            period: day.period
                        });
                    } catch (error) {
                        console.error('❌ Erro ao processar data da montagem (operadores):', day, error);
                    }
                }
            });
        } else if (evento.setupStartDate && evento.setupEndDate) {
            // Fallback para estrutura antiga com suporte a turnos
            const startDate = new Date(evento.setupStartDate);
            const endDate = new Date(evento.setupEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatEventDate(date.toISOString());
                const dateISO = date.toISOString().split('T')[0];

                // Adicionar ambos os períodos (diurno e noturno) para cada data
                ['diurno', 'noturno'].forEach(period => {
                    const periodTyped = period as 'diurno' | 'noturno' | 'dia_inteiro';
                    const periodLabel = periodTyped === 'diurno' ? 'Diurno' : periodTyped === 'noturno' ? 'Noturno' : 'Dia Inteiro';

                    days.push({
                        id: `${dateISO}-montagem-${periodTyped}`,
                        label: `${dateStr} • Montagem • ${periodLabel}`,
                        date: dateStr,
                        type: 'montagem',
                        period: periodTyped
                    });
                });
            }
        }

        // Adicionar dias de Evento/evento com suporte a turnos
        const eventoData = ensureArray(evento.evento);
        console.log('🔧 Processando evento (operadores):', eventoData);
        if (eventoData.length > 0) {
            eventoData.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date);
                        const dateISO = new Date(day.date).toISOString().split('T')[0];
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

                        console.log(`✅ Adicionando evento (operadores): ${dateStr} - ${periodLabel}`);
                        days.push({
                            id: `${dateISO}-evento-${day.period}`,
                            label: `${dateStr} • Evento • ${periodLabel}`,
                            date: dateStr,
                            type: 'evento',
                            period: day.period
                        });
                    } catch (error) {
                        console.error('❌ Erro ao processar data do evento (operadores):', day, error);
                    }
                }
            });
        } else if (evento.preparationStartDate && evento.preparationEndDate) {
            // Fallback para estrutura antiga com suporte a turnos
            const startDate = new Date(evento.preparationStartDate);
            const endDate = new Date(evento.preparationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatEventDate(date.toISOString());
                const dateISO = date.toISOString().split('T')[0];

                // Adicionar ambos os períodos (diurno e noturno) para cada data
                ['diurno', 'noturno'].forEach(period => {
                    const periodTyped = period as 'diurno' | 'noturno' | 'dia_inteiro';
                    const periodLabel = periodTyped === 'diurno' ? 'Diurno' : periodTyped === 'noturno' ? 'Noturno' : 'Dia Inteiro';

                    days.push({
                        id: `${dateISO}-evento-${periodTyped}`,
                        label: `${dateStr} • Evento • ${periodLabel}`,
                        date: dateStr,
                        type: 'evento',
                        period: periodTyped
                    });
                });
            }
        }

        // Adicionar dias de finalização com suporte a turnos
        const desmontagemData = ensureArray(evento.desmontagem);
        console.log('🔧 Processando desmontagem (operadores):', desmontagemData);
        if (desmontagemData.length > 0) {
            desmontagemData.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date);
                        const dateISO = new Date(day.date).toISOString().split('T')[0];
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

                        console.log(`✅ Adicionando desmontagem (operadores): ${dateStr} - ${periodLabel}`);
                        days.push({
                            id: `${dateISO}-desmontagem-${day.period}`,
                            label: `${dateStr} • Desmontagem • ${periodLabel}`,
                            date: dateStr,
                            type: 'desmontagem',
                            period: day.period
                        });
                    } catch (error) {
                        console.error('❌ Erro ao processar data da desmontagem (operadores):', day, error);
                    }
                }
            });
        } else if (evento.finalizationStartDate && evento.finalizationEndDate) {
            // Fallback para estrutura antiga com suporte a turnos
            const startDate = new Date(evento.finalizationStartDate);
            const endDate = new Date(evento.finalizationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatEventDate(date.toISOString());
                const dateISO = date.toISOString().split('T')[0];

                // Adicionar ambos os períodos (diurno e noturno) para cada data
                ['diurno', 'noturno'].forEach(period => {
                    const periodTyped = period as 'diurno' | 'noturno' | 'dia_inteiro';
                    const periodLabel = periodTyped === 'diurno' ? 'Diurno' : periodTyped === 'noturno' ? 'Noturno' : 'Dia Inteiro';

                    days.push({
                        id: `${dateISO}-desmontagem-${periodTyped}`,
                        label: `${dateStr} • Desmontagem • ${periodLabel}`,
                        date: dateStr,
                        type: 'desmontagem',
                        period: periodTyped
                    });
                });
            }
        }

        console.log('🎯 Dias finais gerados (operadores):', days);
        return days.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            if (a.type !== b.type) {
                const typeOrder: Record<string, number> = { montagem: 1, evento: 2, desmontagem: 3 };
                return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
            }
            const periodOrder = { diurno: 0, noturno: 1, dia_inteiro: 2 };
            const aPeriodOrder = periodOrder[a.period as keyof typeof periodOrder] ?? 999;
            const bPeriodOrder = periodOrder[b.period as keyof typeof periodOrder] ?? 999;
            return aPeriodOrder - bPeriodOrder;
        });
    }, [evento, ensureArray, formatEventDate]);

    // Função para obter ícone do período
    const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
        if (period === 'diurno') return <Sun className="h-3 w-3 text-yellow-500" />;
        if (period === 'noturno') return <Moon className="h-3 w-3 text-blue-500" />;
        if (period === 'dia_inteiro') return <Clock className="h-3 w-3 text-purple-500" />;
        return null;
    }, []);

    // Forçar refetch dos dados toda vez que a página é carregada
    useEffect(() => {
        const refreshData = async () => {
            console.log("🔄 Atualizando dados de operadores...")

            // Invalidar cache e forçar refetch
            await queryClient.invalidateQueries({ queryKey: ["operators"] })
            await queryClient.invalidateQueries({ queryKey: ["operators-by-event"] })

            // Refetch dos dados
            await refetchAllOperators()

            console.log("✅ Dados de operadores atualizados")
        }

        refreshData()
    }, [eventId, queryClient, refetchAllOperators])

    useEffect(() => {
        if (evento) {
            setNomeEvento(evento.name || "Evento")
        }
    }, [evento])

    // Filtrar operadores disponíveis (não atribuídos ao evento)
    const availableOperators = useMemo(() => {
        if (allOperators && operadores && !loadingAllOperators && !loadingOperadores) {
            const assignedOperatorIds = operadores.map(op => op.id)
            return allOperators.filter(op => !assignedOperatorIds.includes(op.id))
        }
        return []
    }, [allOperators, operadores, loadingAllOperators, loadingOperadores])

    // Filtrar operadores disponíveis baseado na busca
    const filteredAvailableOperators = useMemo(() => {
        return availableOperators.filter(op =>
            op.nome.toLowerCase().includes(assignSearch.toLowerCase()) ||
            op.cpf.includes(assignSearch)
        )
    }, [availableOperators, assignSearch])

    // Filtrar todos os operadores baseado na busca
    const filteredAllOperators = useMemo(() => {
        return allOperators.filter(op =>
            op.nome.toLowerCase().includes(allOperatorsSearch.toLowerCase()) ||
            op.cpf.includes(allOperatorsSearch)
        )
    }, [allOperators, allOperatorsSearch])

    // Função para forçar atualização dos dados
    const forceRefreshData = async () => {
        console.log("🔄 Forçando atualização dos dados...")
        setLoading(true)

        try {
            // Invalidar cache e forçar refetch
            await queryClient.invalidateQueries({ queryKey: ["operators"] })
            await queryClient.invalidateQueries({ queryKey: ["operators-by-event"] })

            // Refetch dos dados
            await refetchAllOperators()

            toast.success("Dados atualizados com sucesso!")
            console.log("✅ Dados atualizados manualmente")
        } catch (error) {
            toast.error("Erro ao atualizar dados")
            console.error("❌ Erro ao atualizar dados:", error)
        } finally {
            setLoading(false)
        }
    }

    const abrirPopup = (operador: Operator) => {
        setSelectedOperator(operador)
        setModalAberto(true)
    }

    const getBotaoAcao = (operador: Operator) => {
        return (
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirEditar(operador)}
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirExcluir(operador)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    const abrirEditar = (operador: Operator) => {
        setOperatorToEdit(operador)
        setEditForm({
            nome: operador.nome,
            cpf: formatCpf(operador.cpf),
            senha: operador.senha
        })

        // Carregar turnos de atribuição atuais
        const currentShifts: string[] = []
        if (operador.id_events) {
            const eventAssignments = operador.id_events.split(',').map((assignment: string) => assignment.trim())
            for (const assignment of eventAssignments) {
                if (assignment.includes(':')) {
                    const [eventIdFromAssignment, shiftOrDate] = assignment.split(':')
                    if (eventIdFromAssignment === eventId) {
                        currentShifts.push(shiftOrDate)
                    }
                }
            }
        }
        setEditSelectedEventDates(currentShifts)
        setEditDialogOpen(true)
    }

    const abrirExcluir = (operador: Operator) => {
        setOperatorToDelete(operador)
        setDeleteDialogOpen(true)
    }

    // Função para alternar acesso do operador ao evento (ativação/desativação temporária)
    const toggleEventAccess = async (operador: Operator) => {
        try {
            setLoading(true)

            console.log(`🔄 Alternando status de acesso do operador ${operador.nome} no evento ${eventId}`)

            const response = await apiClient.post(`/operadores/toggle-event-status`, {
                operatorId: operador.id,
                eventId: eventId,
                performedBy: 'operador-interface'
            })

            console.log(`✅ Status alterado:`, response.data)

            toast.success(response.data.message)

            // Forçar atualização dos dados
            await forceRefreshData()
        } catch (error: any) {
            console.error('❌ Erro ao alterar status do operador:', error)

            if (error?.response?.status === 400) {
                toast.error(error.response.data.error || "Operador não possui assignments para este evento")
            } else if (error?.response?.status === 404) {
                toast.error("Operador não encontrado")
            } else {
                toast.error("Erro ao alterar status do operador")
            }
        } finally {
            setLoading(false)
        }
    }

    const salvarEdicao = async () => {
        if (!operatorToEdit) return

        if (!editForm.nome || !editForm.cpf || !editForm.senha) {
            toast.error("Todos os campos são obrigatórios")
            return
        }



        if (editSelectedEventDates.length === 0) {
            toast.error("Selecione pelo menos um turno do evento")
            return
        }

        setLoading(true)
        try {
            // Criar atribuições para todos os turnos selecionados
            const eventAssignments = editSelectedEventDates.map(shiftId => `${eventId}:${shiftId}`).join(',')

            await apiClient.put(`/operadores/${operatorToEdit.id}`, {
                nome: editForm.nome,
                cpf: editForm.cpf,
                senha: editForm.senha,
                id_events: eventAssignments
            })

            toast.success("Operador atualizado com sucesso!")
            setEditDialogOpen(false)
            setEditForm({ nome: "", cpf: "", senha: "" })
            setEditSelectedEventDates([])

            // Forçar atualização dos dados após edição
            await forceRefreshData()
        } catch (error: any) {
            // Verificar se é erro de CPF duplicado
            if (error?.response?.data?.error?.includes("Já existe um operador cadastrado com o CPF")) {
                toast.error("CPF já cadastrado. Verifique se o operador já existe no sistema.")
            } else {
                toast.error("Erro ao atualizar operador")
            }
        } finally {
            setLoading(false)
        }
    }

    const confirmarExclusao = async () => {
        if (!operatorToDelete) return

        setLoading(true)
        try {
            await apiClient.delete(`/operadores/${operatorToDelete.id}`)

            toast.success("Operador excluído com sucesso!")
            setDeleteDialogOpen(false)

            // Forçar atualização dos dados após exclusão
            await forceRefreshData()
        } catch (error) {
            toast.error("Erro ao excluir operador")
        } finally {
            setLoading(false)
        }
    }

    const salvarNovo = async () => {
        if (!createForm.nome || !createForm.cpf || !createForm.senha) {
            toast.error("Todos os campos são obrigatórios")
            return
        }



        setLoading(true)
        try {
            // Criar operador sem eventos atribuídos (atribuição será feita manualmente)
            await apiClient.post("/operadores", {
                nome: createForm.nome,
                cpf: createForm.cpf,
                senha: createForm.senha
            })

            toast.success("Operador criado com sucesso! Use 'Atribuir Operadores' para vincular ao evento.")
            setCreateDialogOpen(false)
            setCreateForm({ nome: "", cpf: "", senha: defaultPassword || "" })
            setCpfExists(false)

            // Forçar atualização dos dados após criação
            await forceRefreshData()
        } catch (error: any) {
            // Verificar se é erro de CPF duplicado
            if (error?.response?.data?.error?.includes("Já existe um operador cadastrado com o CPF")) {
                toast.error("CPF já cadastrado. Verifique se o operador já existe no sistema.")
            } else {
                toast.error("Erro ao criar operador")
            }
        } finally {
            setLoading(false)
        }
    }

    // Funções para Retirada de operadores
    const abrirAtribuirOperadores = () => {
        setSelectedOperators([])
        setAssignSearch("")
        setSelectedEventDates([])
        setAssignDialogOpen(true)
    }

    const handleSelectOperator = (operatorId: string) => {
        console.log("🔍 Selecionando operador:", operatorId)
        setSelectedOperators(prev => {
            const newSelection = prev.includes(operatorId)
                ? prev.filter(id => id !== operatorId)
                : [...prev, operatorId]
            console.log("📋 Nova seleção:", newSelection)
            return newSelection
        })
    }

    const handleSelectAllOperators = () => {
        if (selectedOperators.length === filteredAvailableOperators.length) {
            setSelectedOperators([])
        } else {
            setSelectedOperators(filteredAvailableOperators.map(op => op.id))
        }
    }

    const handleAssignOperators = async () => {
        if (selectedOperators.length === 0) {
            toast.error("Selecione pelo menos um operador")
            return
        }

        if (selectedEventDates.length === 0) {
            toast.error("Selecione pelo menos um turno do evento")
            return
        }

        setAssignLoading(true)
        try {
            for (const operatorId of selectedOperators) {
                const operator = availableOperators.find(op => op.id === operatorId)
                if (operator) {
                    // Criar atribuições para todos os dias selecionados
                    const currentEvents = operator.id_events ? operator.id_events.split(',').filter(Boolean) : []

                    // Remover atribuições existentes para este evento (se houver)
                    const filteredEvents = currentEvents.filter((event: string) => !event.startsWith(`${eventId}:`))

                    // Adicionar novas atribuições para cada turno selecionado
                    const newEventAssignments = selectedEventDates.map(shiftId => `${eventId}:${shiftId}`)
                    const newEvents = [...filteredEvents, ...newEventAssignments]

                    await apiClient.put(`/operadores/${operatorId}`, {
                        nome: operator.nome,
                        cpf: operator.cpf,
                        senha: operator.senha,
                        id_events: newEvents.join(',')
                    })
                }
            }

            const shiftsText = selectedEventDates.map(shiftId => {
                const shift = getEventDays().find(s => s.id === shiftId)
                return shift ? shift.label : shiftId
            }).join(', ')
            toast.success(`${selectedOperators.length} operador(es) atribuído(s) com sucesso para os turnos: ${shiftsText}!`)
            setAssignDialogOpen(false)
            setSelectedOperators([])
            setSelectedEventDates([])

            // Forçar atualização dos dados após Retirada
            await forceRefreshData()
        } catch (error) {
            toast.error("Erro ao atribuir operadores")
        } finally {
            setAssignLoading(false)
        }
    }

    const handleShiftSelection = (shiftId: string) => {
        setSelectedEventDates(prev =>
            prev.includes(shiftId)
                ? prev.filter(s => s !== shiftId)
                : [...prev, shiftId]
        )
    }

    const handleSelectAllShifts = () => {
        const eventShifts = getEventDays()
        const allShiftIds = eventShifts.map(shift => shift.id)
        if (selectedEventDates.length === allShiftIds.length) {
            setSelectedEventDates([])
        } else {
            setSelectedEventDates(allShiftIds)
        }
    }



    const formatCPF = (cpf: string): string => {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }

    const capitalizeWords = (str: string): string =>
        str.replace(/(\b\w)/g, (char) => char.toUpperCase())

    const exportarParaExcel = () => {
        const dadosParaExportar = operadores.map(operador => ({
            Nome: operador.nome,
            CPF: formatCPF(operador.cpf),
            "Turnos Atribuídos": (() => {
                const assignmentShifts = getOperatorAssignmentShifts(operador);
                return assignmentShifts.length > 0 ? assignmentShifts.map(shift => shift.label).join(', ') : "Sem turnos específicos";
            })(),
            "Data de Criação": formatDatePtBr(new Date())
        }))

        const ws = XLSX.utils.json_to_sheet(dadosParaExportar)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Operadores")
        XLSX.writeFile(wb, `operadores-${nomeEvento}-${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const baixarModeloExcel = () => {
        const dadosModelo = [
            {
                nome: "João Silva",
                cpf: "123.456.789-01",
                senha: "123456"
            },
            {
                nome: "Maria Santos",
                cpf: "987.654.321-09",
                senha: "senha123"
            },
            {
                nome: "",
                cpf: "",
                senha: ""
            }
        ]

        const ws = XLSX.utils.json_to_sheet(dadosModelo)

        // Adicionar cabeçalhos personalizados
        const headers = [
            'Nome Completo do Operador',
            'CPF (formato: 000.000.000-00)',
            'Senha de Acesso'
        ]

        XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' })

        // Ajustar largura das colunas
        ws['!cols'] = [
            { width: 25 },
            { width: 20 },
            { width: 15 }
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo-Operadores")
        XLSX.writeFile(wb, `modelo-operadores-${nomeEvento}-${new Date().toISOString().split('T')[0]}.xlsx`)

        toast.success("Modelo Excel baixado com sucesso!")
    }

    const importarDoExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("🔍 Iniciando importação do Excel...")
        const file = e.target.files?.[0]

        if (!file) {
            console.log("❌ Nenhum arquivo selecionado")
            return
        }

        console.log("📁 Arquivo selecionado:", file.name, "Tipo:", file.type)

        // Verificar se é um arquivo Excel válido
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ]

        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
            toast.error("Formato de arquivo inválido. Use arquivos Excel (.xlsx, .xls) ou CSV.")
            return
        }

        // Armazenar o arquivo para processamento posterior
        setFileToImport(file)
        console.log("✅ Arquivo armazenado, abrindo diálogo...")

        // Abrir dialog de Retirada que agora inclui seleção de datas
        setAssignDialogOpen(true)
        console.log("✅ Diálogo deveria estar aberto agora")
    }

    const handleConfirmImport = async () => {
        if (!fileToImport || selectedEventDates.length === 0) return

        setImportDialogLoading(true)
        try {
            const data = await fileToImport.arrayBuffer()
            const workbook = XLSX.read(data)
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

            const operadoresImportados: Operator[] = []
            const falhados: { item: Operator; motivo: string }[] = []

            for (const row of jsonData) {
                if (!row.nome || !row.cpf || !row.senha) {
                    falhados.push({
                        item: { id: "", nome: row.nome || "", cpf: row.cpf || "", senha: row.senha || "", id_events: eventId, acoes: [] },
                        motivo: "Dados incompletos"
                    })
                    continue
                }

                if (!isValidCpf(row.cpf)) {
                    falhados.push({
                        item: { id: "", nome: row.nome, cpf: row.cpf, senha: row.senha, id_events: eventId, acoes: [] },
                        motivo: "CPF inválido"
                    })
                    continue
                }

                // Criar atribuições para todos os turnos selecionados
                const eventAssignments = selectedEventDates.map(shiftId => `${eventId}:${shiftId}`).join(',')

                operadoresImportados.push({
                    id: "",
                    nome: row.nome,
                    cpf: row.cpf,
                    senha: row.senha,
                    id_events: eventAssignments,
                    acoes: []
                })
            }

            setRegistrosUnicos(operadoresImportados)
            setResumoImportacao({ importados: operadoresImportados, falhados })
            setResumoDialogOpen(true)
            setSelectedEventDates([])
            setFileToImport(null)
        } catch (error) {
            toast.error("Erro ao processar arquivo")
        } finally {
            setImportDialogLoading(false)
            // Limpar o input de arquivo
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const confirmarImportacao = async () => {
        setLoading(true)
        let operadoresCriados = 0
        let operadoresAtribuidos = 0
        const falhados: { item: Operator; motivo: string }[] = []

        try {
            for (const operador of registrosUnicos) {
                try {
                    // Primeiro, verificar se o operador já existe pelo CPF
                    let operadorExistente: Operator | null = null
                    try {
                        const response = await apiClient.get(`/operadores/cpf/${operador.cpf.replace(/\D/g, '')}`)
                        operadorExistente = response.data
                    } catch (error: any) {
                        // Se der 404, o operador não existe - isso é normal
                        if (error?.response?.status !== 404) {
                            throw error // Re-throw outros erros
                        }
                    }

                    if (operadorExistente) {
                        // Operador já existe - apenas atribuir ao evento
                        console.log(`🔍 Operador ${operador.nome} já existe (ID: ${operadorExistente.id}). Atribuindo ao evento...`)

                        // Combinar eventos existentes com novos eventos
                        const eventosAtuais = operadorExistente.id_events ? operadorExistente.id_events.split(',') : []
                        const novosEventos = operador.id_events.split(',')
                        const eventosUnicos = [...new Set([...eventosAtuais, ...novosEventos])]

                        // Atualizar o operador existente com os novos eventos
                        await apiClient.put(`/operadores/${operadorExistente.id}`, {
                            id_events: eventosUnicos.join(',')
                        })

                        operadoresAtribuidos++
                        console.log(`✅ Operador ${operador.nome} atribuído ao evento com sucesso`)
                    } else {
                        // Operador não existe - criar novo
                        console.log(`➕ Criando novo operador: ${operador.nome}`)

                        await apiClient.post("/operadores", {
                            nome: operador.nome,
                            cpf: operador.cpf,
                            senha: operador.senha
                        })

                        operadoresCriados++
                        console.log(`✅ Novo operador ${operador.nome} criado com sucesso`)
                    }
                } catch (error: any) {
                    console.error(`❌ Erro ao processar operador ${operador.nome}:`, error)
                    falhados.push({
                        item: operador,
                        motivo: error?.response?.data?.error || "Erro desconhecido ao processar operador"
                    })
                }
            }

            // Atualizar resumo com falhas
            setResumoImportacao(prev => ({ ...prev, falhados }))

            // Exibir resumo do sucesso
            const totalSucesso = operadoresCriados + operadoresAtribuidos
            if (totalSucesso > 0) {
                let mensagem = ""
                if (operadoresCriados > 0 && operadoresAtribuidos > 0) {
                    mensagem = `${operadoresCriados} operadores criados e ${operadoresAtribuidos} operadores atribuídos ao evento! Use 'Atribuir Operadores' para vincular os novos ao evento.`
                } else if (operadoresCriados > 0) {
                    mensagem = `${operadoresCriados} novos operadores criados com sucesso! Use 'Atribuir Operadores' para vincular ao evento.`
                } else if (operadoresAtribuidos > 0) {
                    mensagem = `${operadoresAtribuidos} operadores existentes atribuídos ao evento!`
                }
                toast.success(mensagem)
            }

            if (falhados.length > 0) {
                toast.error(`${falhados.length} operadores falharam na importação`)
            }

            // Forçar atualização dos dados após importação
            await forceRefreshData()

            // Fechar diálogo de resumo após alguns segundos se não houver falhas
            if (falhados.length === 0) {
                setTimeout(() => {
                    setResumoDialogOpen(false)
                    setSelectedEventDates([])
                }, 2000)
            }
        } catch (error: any) {
            toast.error("Erro ao importar operadores")
        } finally {
            setLoading(false)
        }
    }

    const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    // Função para verificar se o operador tem acesso ativo a este evento (não desativado)
    const hasEventAccess = (operador: Operator) => {
        if (!operador.id_events) return false
        const currentAssignments = operador.id_events.split(',')
        return currentAssignments.some((assignment: string) => assignment.includes(`${eventId}:`))
    }

    // Função para verificar se o operador existe neste evento (ativo ou desativado)
    const hasEventAssignment = (operador: Operator) => {
        const hasActive = operador.id_events ?
            operador.id_events.split(',').some((assignment: string) => assignment.includes(`${eventId}:`)) : false
        const hasDeactivated = operador.id_events_desativados ?
            operador.id_events_desativados.split(',').some((assignment: string) => assignment.includes(`${eventId}:`)) : false
        return hasActive || hasDeactivated
    }

    // Função para extrair os turnos de atribuição do operador (ativos e desativados)
    const getOperatorAssignmentShifts = (operator: Operator) => {
        const eventShifts = getEventDays()
        const assignedShifts: any[] = []

        try {
            // Processar turnos ativos
            if (operator?.id_events) {
                const eventAssignments = operator.id_events.split(',').map((assignment: string) => assignment.trim())

                for (const assignment of eventAssignments) {
                    if (assignment.includes(':')) {
                        const [eventIdFromAssignment, shiftOrDate] = assignment.split(':')
                        if (eventIdFromAssignment === eventId && shiftOrDate) {
                            const shiftId = shiftOrDate.trim()

                            // Procurar pelo shift ID no novo formato
                            const shift = eventShifts.find(s => s.id === shiftId)
                            if (shift) {
                                assignedShifts.push({ ...shift, status: 'active' })
                            } else {
                                // Fallback para formato antigo (apenas data)
                                const { dateFormatted } = parseShiftId(shiftId)
                                assignedShifts.push({
                                    id: shiftId,
                                    label: `${dateFormatted} (Data simples)`,
                                    date: dateFormatted,
                                    type: 'legacy',
                                    period: 'diurno',
                                    status: 'active'
                                })
                            }
                        }
                    }
                }
            }

            // Processar turnos desativados
            if (operator?.id_events_desativados) {
                const deactivatedAssignments = operator.id_events_desativados.split(',').map((assignment: string) => assignment.trim())

                for (const assignment of deactivatedAssignments) {
                    if (assignment.includes(':')) {
                        const [eventIdFromAssignment, shiftOrDate] = assignment.split(':')
                        if (eventIdFromAssignment === eventId && shiftOrDate) {
                            const shiftId = shiftOrDate.trim()

                            // Procurar pelo shift ID no novo formato
                            const shift = eventShifts.find(s => s.id === shiftId)
                            if (shift) {
                                assignedShifts.push({ ...shift, status: 'deactivated' })
                            } else {
                                // Fallback para formato antigo (apenas data)
                                const { dateFormatted } = parseShiftId(shiftId)
                                assignedShifts.push({
                                    id: shiftId,
                                    label: `${dateFormatted} (Data simples - Desativado)`,
                                    date: dateFormatted,
                                    type: 'legacy',
                                    period: 'diurno',
                                    status: 'deactivated'
                                })
                            }
                        }
                    }
                }
            }

            return assignedShifts
        } catch (error) {
            console.error('Erro ao processar turnos de atribuição:', error)
            return []
        }
    }

    // Função para extrair a primeira data de atribuição do operador (compatibilidade)
    const getOperatorAssignmentDate = (operator: Operator) => {
        const shifts = getOperatorAssignmentShifts(operator)
        if (shifts.length > 0) {
            const firstShift = shifts[0]
            if (firstShift.type === 'legacy') {
                return firstShift.id // Para formato antigo, o ID é a data
            } else {
                const { dateISO } = parseShiftId(firstShift.id)
                return dateISO
            }
        }
        return null
    }

    // Função para obter ações do operador apenas para este evento
    const getOperatorEventActions = (operator: Operator) => {
        if (!operator.acoes || !Array.isArray(operator.acoes)) return []
        
        return operator.acoes.filter((action: any) => action.eventId === eventId)
    }

    // Função para coletar apenas as ações deste evento específico
    const collectAllActions = useMemo(() => {
        if (!operadores || operadores.length === 0) return []

        const actions: any[] = []

        operadores.forEach(operator => {
            if (operator.acoes && Array.isArray(operator.acoes)) {
                operator.acoes.forEach((action: any) => {
                    // Filtrar apenas ações deste evento
                    if (action.eventId === eventId) {
                        actions.push({
                            ...action,
                            operadorId: operator.id,
                            operadorNome: operator.nome,
                            operadorCpf: operator.cpf
                        })
                    }
                })
            }
        })

        return actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }, [operadores, eventId])

    // Função para filtrar ações
    const filteredActions = useMemo(() => {
        let filtered = collectAllActions

        if (actionsFilter.busca) {
            filtered = filtered.filter(action =>
                action.operadorNome?.toLowerCase().includes(actionsFilter.busca.toLowerCase()) ||
                action.credencial?.toLowerCase().includes(actionsFilter.busca.toLowerCase()) ||
                action.pulseira?.toLowerCase().includes(actionsFilter.busca.toLowerCase()) ||
                action.type?.toLowerCase().includes(actionsFilter.busca.toLowerCase())
            )
        }

        if (actionsFilter.tipo && actionsFilter.tipo !== "all-types") {
            filtered = filtered.filter(action => action.type === actionsFilter.tipo)
        }

        if (actionsFilter.operador && actionsFilter.operador !== "all-operators") {
            filtered = filtered.filter(action => action.operadorId === actionsFilter.operador)
        }

        return filtered
    }, [collectAllActions, actionsFilter])

    // Função para obter tipos únicos de ações
    const uniqueActionTypes = useMemo(() => {
        const types = new Set(collectAllActions.map(action => action.type))
        return Array.from(types).sort()
    }, [collectAllActions])

    // Função para formatar timestamp
    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Função para abrir modal de detalhes da ação
    const openActionDetails = (action: any) => {
        setSelectedAction(action)
        setActionDetailsOpen(true)
    }

    // Função para formatar data no padrão pt-BR yyyy/mm/dd
    const formatDatePtBr = (date: string | Date | null | undefined) => {
        if (!date) {
            return 'Data inválida'
        }

        const dateObj = typeof date === 'string' ? new Date(date) : date

        // Verificar se a data é válida
        if (isNaN(dateObj.getTime())) {
            return 'Data inválida'
        }

        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')

        return `${year}/${month}/${day}`
    }

    // Função para verificar se CPF já existe
    const checkCpfExists = async (cpf: string) => {
        if (!cpf || !isValidCpf(cpf)) {
            setCpfExists(false)
            return
        }

        try {
            const { data } = await apiClient.get("/operadores", {
                params: { search: cpf, limit: 1 }
            })

            const exists = data.data && data.data.length > 0 && data.data[0].cpf === cpf
            setCpfExists(exists)
        } catch (error) {
            setCpfExists(false)
        }
    }

    // Função para obter cor do badge baseado no tipo de ação
    const getActionBadgeColor = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'check-in':
            case 'checkin':
                return 'bg-green-100 text-green-800 border-green-200'
            case 'check-out':
            case 'checkout':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'distribuição':
            case 'distribuicao':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'troca':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'retirada':
                return 'bg-orange-100 text-orange-800 border-orange-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    if (loadingOperadores || loadingAllOperators) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Carregando operadores...</span>
            </div>
        )
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={nomeEvento}>
            <div className="container mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Operadores</h1>
                        <p className="text-gray-600 mt-1">Evento: {nomeEvento}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={abrirAtribuirOperadores} variant="outline">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Atribuir Operadores
                        </Button>
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Operador
                        </Button>
                        <Button onClick={forceRefreshData} disabled={loading}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 gap-14 rounded-lg p-4 bg-white">
                        <TabsTrigger
                            value="operadores"
                            className={`flex items-center justify-center p-4 gap-2 rounded-md transition-colors
                                data-[state=active]:bg-[#610e5c] data-[state=active]:text-white
                                focus:bg-[#610e5c] focus:text-white
                            `}
                        >
                            <Users className="h-4 w-4" />
                            Operadores ({operadores.length})
                        </TabsTrigger>

                        <TabsTrigger
                            value="acoes"
                            className={`flex items-center justify-center p-4 gap-2 rounded-md transition-colors
                                data-[state=active]:bg-[#610e5c] data-[state=active]:text-white
                                focus:bg-[#610e5c] focus:text-white
                            `}
                        >
                            <Activity className="h-4 w-4" />
                            Ações ({collectAllActions.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="operadores" className="space-y-6">
                        {/* Filtros */}
                        <div className="bg-white rounded-lg shadow-sm border p-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Buscar por nome ou CPF
                                    </label>
                                    <Input
                                        placeholder="Digite o nome ou CPF..."
                                        value={filtro.busca}
                                        onChange={(e) => setFiltro(prev => ({ ...prev, busca: e.target.value }))}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button variant="outline" onClick={exportarParaExcel}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Exportar
                                    </Button>
                                </div>
                                <div className="flex items-end">
                                    <Button variant="outline" onClick={baixarModeloExcel}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Modelo
                                    </Button>
                                </div>
                                <div className="flex items-end">
                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Importar
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={importarDoExcel}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Cards de Operadores */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {operadores.length > 0 ? (
                                operadores.map((operador) => (
                                    <div key={operador.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{capitalizeWords(operador.nome)}</h3>
                                                <p className="text-sm text-gray-600">{formatCPF(operador.cpf)}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => abrirPopup(operador)}
                                                    title="Ver detalhes"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => abrirEditar(operador)}
                                                    title="Editar"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleEventAccess(operador)}
                                                    disabled={loading}
                                                    title={hasEventAccess(operador) ? "Desativar temporariamente do evento" : "Ativar no evento"}
                                                    className={hasEventAccess(operador) ? "text-green-600 border-green-200 hover:bg-green-50" : "text-red-600 border-red-200 hover:bg-red-50"}
                                                >
                                                    {hasEventAccess(operador) ? <Power className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => abrirExcluir(operador)}
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="space-y-2">
                                                <span className="text-sm text-gray-600 font-medium">Turnos Atribuídos:</span>
                                                {(() => {
                                                    const assignmentShifts = getOperatorAssignmentShifts(operador);
                                                    if (assignmentShifts.length === 0) {
                                                        return (
                                                            <Badge variant="outline" className="text-gray-500 border-gray-200">
                                                                Sem turnos específicos
                                                            </Badge>
                                                        );
                                                    }
                                                    // Agrupar por data para melhor visualização
                                                    const shiftsByDate = assignmentShifts.reduce((acc, shift) => {
                                                        const date = shift.date || new Date().toLocaleDateString('pt-BR');
                                                        if (!acc[date]) acc[date] = [];
                                                        acc[date].push(shift);
                                                        return acc;
                                                    }, {} as Record<string, typeof assignmentShifts>);

                                                    return (
                                                        <div className="space-y-2">
                                                            {Object.entries(shiftsByDate).slice(0, 2).map(([date, shifts]) => (
                                                                <div key={date} className="bg-gray-50 rounded p-2 border border-gray-200">
                                                                    <div className="text-xs font-medium text-gray-700 mb-1">{date}</div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {(Array.isArray(shifts) ? shifts : []).map((shift: any, index: number) => (
                                                                            <Badge
                                                                                key={index}
                                                                                variant="outline"
                                                                                className={shift.status === 'deactivated'
                                                                                    ? "text-gray-500 border-gray-300 bg-gray-100 text-xs"
                                                                                    : "text-blue-600 border-blue-200 text-xs"}
                                                                            >
                                                                                <div className="flex items-center gap-1">
                                                                                    {getPeriodIcon(shift.period)}
                                                                                    <span>
                                                                                        {shift.type === 'montagem' ? 'Mont' :
                                                                                            shift.type === 'evento' ? 'Evt' :
                                                                                                shift.type === 'desmontagem' ? 'Desm' : 'Fin'}
                                                                                    </span>
                                                                                    <span>•</span>
                                                                                    <span>
                                                                                        {shift.period === 'diurno' ? 'Dia' : shift.period === 'noturno' ? 'Noite' : 'DI'}
                                                                                    </span>
                                                                                    {shift.status === 'deactivated' && (
                                                                                        <span className="text-xs opacity-75">(Desativ.)</span>
                                                                                    )}
                                                                                </div>
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {Object.keys(shiftsByDate).length > 2 && (
                                                                <Badge variant="outline" className="text-gray-500 border-gray-200 text-xs">
                                                                    +{Object.keys(shiftsByDate).length - 2} dias a mais
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Status do Acesso:</span>
                                                <Badge
                                                    variant="outline"
                                                    className={hasEventAccess(operador)
                                                        ? "text-green-600 border-green-200 bg-green-50"
                                                        : "text-red-600 border-red-200 bg-red-50"
                                                    }
                                                >
                                                    {hasEventAccess(operador) ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Ações Realizadas:</span>
                                                <Badge variant="outline" className="text-gray-600 border-gray-200">
                                                    {getOperatorEventActions(operador).length} ações
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <Users className="h-16 w-16 mx-auto" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum operador encontrado</h3>
                                    <p className="text-gray-500">Adicione operadores ao evento para começar</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>



                    <TabsContent value="acoes" className="space-y-6">
                        {/* Filtros para Ações */}
                        <div className="bg-white rounded-lg shadow-sm border p-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Buscar ações
                                    </label>
                                    <Input
                                        placeholder="Digite para buscar..."
                                        value={actionsFilter.busca}
                                        onChange={(e) => setActionsFilter(prev => ({ ...prev, busca: e.target.value }))}
                                    />
                                </div>
                                <div className="min-w-[200px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de Ação
                                    </label>
                                    <Select value={actionsFilter.tipo} onValueChange={(value) => setActionsFilter(prev => ({ ...prev, tipo: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todos os tipos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all-types">Todos os tipos</SelectItem>
                                            {uniqueActionTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="min-w-[200px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Operador
                                    </label>
                                    <Select value={actionsFilter.operador} onValueChange={(value) => setActionsFilter(prev => ({ ...prev, operador: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todos os operadores" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all-operators">Todos os operadores</SelectItem>
                                            {operadores.map((operador) => (
                                                <SelectItem key={operador.id} value={operador.id}>
                                                    {operador.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end">
                                    <Button variant="outline" onClick={() => setActionsFilter({ busca: "", tipo: "all-types", operador: "all-operators" })}>
                                        Limpar Filtros
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Tabela de Ações */}
                        <div className="bg-white rounded-lg shadow-sm border">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-left font-medium text-gray-900">Tipo da Ação</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Quem Executou</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Quem Sofreu a Ação</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Empresa/Função</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Credencial</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Pulseira</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Período/Turno</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Data/Hora</TableHead>
                                            <TableHead className="text-center font-medium text-gray-900">Detalhes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredActions.length > 0 ? (
                                            filteredActions.map((action, index) => (
                                                <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                                                    {/* Tipo da Ação */}
                                                    <TableCell>
                                                        <Badge variant="outline" className={getActionBadgeColor(action.type)}>
                                                            {action.type}
                                                        </Badge>
                                                    </TableCell>

                                                    {/* Quem Executou */}
                                                    <TableCell className="font-medium">
                                                        <div>
                                                            <span className="text-sm text-gray-900">{capitalizeWords(action.operatorName || action.operadorNome)}</span>
                                                            <p className="text-xs text-gray-500">{formatCPF(action.operatorCpf || action.operadorCpf)}</p>
                                                        </div>
                                                    </TableCell>

                                                    {/* Quem Sofreu a Ação */}
                                                    <TableCell className="font-medium">
                                                        <div>
                                                            <span className="text-sm text-gray-900">{capitalizeWords(action.staffName)}</span>
                                                            <p className="text-xs text-gray-500">{formatCPF(action.staffCpf)}</p>
                                                        </div>
                                                    </TableCell>

                                                    {/* Empresa/Função */}
                                                    <TableCell className="text-gray-700">
                                                        <div>
                                                            <span className="text-sm font-medium">{action.empresa || "-"}</span>
                                                            <p className="text-xs text-gray-500">{action.funcao || "-"}</p>
                                                        </div>
                                                    </TableCell>

                                                    {/* Credencial */}
                                                    <TableCell className="text-gray-700">
                                                        <div>
                                                            {action.credencial && (
                                                                <span className="text-sm">{action.credencial}</span>
                                                            )}
                                                            {action.credencialAnterior && action.credencialAnterior !== action.credencial && (
                                                                <p className="text-xs text-gray-500">Anterior: {action.credencialAnterior}</p>
                                                            )}
                                                            {!action.credencial && "-"}
                                                        </div>
                                                    </TableCell>

                                                    {/* Pulseira */}
                                                    <TableCell className="text-gray-700">
                                                        <div>
                                                            {action.pulseira && (
                                                                <span className="text-sm">{action.pulseira}</span>
                                                            )}
                                                            {action.pulseiraAnterior && action.pulseiraAnterior !== action.pulseira && (
                                                                <p className="text-xs text-gray-500">Anterior: {action.pulseiraAnterior}</p>
                                                            )}
                                                            {!action.pulseira && "-"}
                                                        </div>
                                                    </TableCell>

                                                    {/* Período/Turno */}
                                                    <TableCell className="text-gray-700">
                                                        <div>
                                                            <span className="text-sm">{action.workPeriod || "-"}</span>
                                                            <p className="text-xs text-gray-500">{action.workStage || ""}</p>
                                                        </div>
                                                    </TableCell>

                                                    {/* Data/Hora */}
                                                    <TableCell className="text-gray-700">
                                                        <div>
                                                            <span className="text-sm">{formatTimestamp(action.timestamp)}</span>
                                                            {action.checkInTime && (
                                                                <p className="text-xs text-green-600">Check-in: {action.checkInTime}</p>
                                                            )}
                                                            {action.checkOutTime && (
                                                                <p className="text-xs text-red-600">Check-out: {action.checkOutTime}</p>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Detalhes */}
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openActionDetails(action)}
                                                            className="h-8 w-8 p-0 hover:bg-gray-100"
                                                        >
                                                            <Eye className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                                    {collectAllActions.length === 0 ? "Nenhuma ação registrada" : "Nenhuma ação encontrada com os filtros aplicados"}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Modal de Detalhes */}
                <Dialog open={modalAberto} onOpenChange={setModalAberto}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detalhes do Operador</DialogTitle>
                        </DialogHeader>
                        {selectedOperator && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nome</label>
                                        <p className="text-gray-900">{selectedOperator.nome}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">CPF</label>
                                        <p className="text-gray-900">{formatCPF(selectedOperator.cpf)}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Turnos Atribuídos</label>
                                    <div className="mt-2">
                                        {(() => {
                                            const assignmentShifts = getOperatorAssignmentShifts(selectedOperator);
                                            if (assignmentShifts.length === 0) {
                                                return (
                                                    <Badge variant="outline" className="text-gray-500 border-gray-200">
                                                        Sem turnos específicos
                                                    </Badge>
                                                );
                                            }
                                            return (
                                                <div className="space-y-2">
                                                    {assignmentShifts.map((shift, index) => (
                                                        <div
                                                            key={index}
                                                            className={`flex items-center gap-2 p-2 rounded border ${shift.status === 'deactivated'
                                                                    ? 'bg-gray-50 border-gray-200'
                                                                    : 'bg-blue-50 border-blue-200'
                                                                }`}
                                                        >
                                                            {getPeriodIcon(shift.period)}
                                                            <span className={`text-sm ${shift.status === 'deactivated'
                                                                    ? 'text-gray-600'
                                                                    : 'text-blue-800'
                                                                }`}>
                                                                {shift.label}
                                                                {shift.status === 'deactivated' && (
                                                                    <span className="text-xs text-gray-500 ml-2">(Desativado)</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ações Realizadas (neste evento)</label>
                                    <div className="mt-2 max-h-60 overflow-y-auto">
                                        {(() => {
                                            const eventActions = getOperatorEventActions(selectedOperator);
                                            return eventActions.length > 0 ? (
                                                <div className="space-y-2">
                                                    {eventActions.map((acao: any, index: number) => (
                                                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="font-medium">{acao.type}</p>
                                                                    <p className="text-sm text-gray-600">{acao.timestamp}</p>
                                                                    {acao.staffName && (
                                                                        <p className="text-sm text-blue-600">Para: {acao.staffName}</p>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                    {acao.tabela || 'Ação'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500">Nenhuma ação registrada neste evento</p>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Modal de Edição */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent className="max-w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[95vh] bg-white overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900">Editar Operador</DialogTitle>
                            <DialogDescription className="text-gray-600">
                                Atualize as informações do operador e selecione os dias de Retirada
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            {/* Informações Básicas */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Nome</label>
                                    <Input
                                        value={editForm.nome}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                                        className="text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">CPF</label>
                                    <Input
                                        value={editForm.cpf}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, cpf: formatCpfInput(e.target.value) }))}
                                        placeholder="000.000.000-00"
                                        maxLength={14}
                                        className="text-gray-900"
                                    />
                                </div>
                                <div className="text-gray-900">
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Senha</label>
                                    <Input
                                        type="password"
                                        value={editForm.senha}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, senha: e.target.value }))}
                                        className="text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Seleção de Dias do Evento */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-gray-900">Selecionar Dias do Evento</h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const eventShifts = getEventDays()
                                            const allShiftIds = eventShifts.map(shift => shift.id)
                                            if (editSelectedEventDates.length === allShiftIds.length) {
                                                setEditSelectedEventDates([])
                                            } else {
                                                setEditSelectedEventDates(allShiftIds)
                                            }
                                        }}
                                        className="text-gray-900"
                                    >
                                        {(() => {
                                            const eventShifts = getEventDays()
                                            const allShiftIds = eventShifts.map(shift => shift.id)
                                            return editSelectedEventDates.length === allShiftIds.length ? "Desmarcar Todos" : "Marcar Todos"
                                        })()}
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {/* Agrupar turnos por estágio e depois por data */}
                                    {Object.entries(
                                        getEventDays().reduce((acc, shift) => {
                                            if (!acc[shift.type]) acc[shift.type] = {};
                                            if (!acc[shift.type][shift.date]) acc[shift.type][shift.date] = [];
                                            acc[shift.type][shift.date].push(shift);
                                            return acc;
                                        }, {} as Record<string, Record<string, typeof getEventDays extends () => infer T ? T : never>>)
                                    ).map(([stage, dateGroups]) => {
                                        const stageLabel = stage === 'montagem' ? 'Montagem' :
                                            stage === 'evento' ? 'Evento' :
                                                stage === 'desmontagem' ? 'Desmontagem' : 'Finalização';

                                        return (
                                            <div key={stage} className="border border-gray-200 rounded-lg p-3">
                                                <h4 className="text-sm font-semibold mb-3 text-gray-700">{stageLabel}</h4>
                                                {Object.entries(dateGroups).map(([date, shifts]) => {
                                                    return (
                                                        <div key={date} className="mb-3 last:mb-0">
                                                            <p className="text-xs font-medium mb-2 text-gray-600">{date}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {shifts.map((shift) => {
                                                                    const isSelected = editSelectedEventDates.includes(shift.id)
                                                                    return (
                                                                        <Button
                                                                            key={shift.id}
                                                                            type="button"
                                                                            variant={isSelected ? "default" : "outline"}
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                if (isSelected) {
                                                                                    setEditSelectedEventDates(prev => prev.filter(s => s !== shift.id))
                                                                                } else {
                                                                                    setEditSelectedEventDates(prev => [...prev, shift.id])
                                                                                }
                                                                            }}
                                                                            disabled={loading}
                                                                            className="flex items-center gap-1 text-xs h-8"
                                                                        >
                                                                            {getPeriodIcon(shift.period)}
                                                                            <span>
                                                                                {shift.period === 'diurno' ? 'Diurno' : shift.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'}
                                                                            </span>
                                                                        </Button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>

                                {editSelectedEventDates.length > 0 && (
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-sm text-blue-900">
                                            <strong>Turnos selecionados:</strong> {editSelectedEventDates.length} turno(s)
                                        </p>
                                        <div className="mt-2 space-y-2">
                                            {Object.entries(
                                                editSelectedEventDates.reduce((acc, shiftId) => {
                                                    const shift = getEventDays().find(s => s.id === shiftId);
                                                    if (!shift) return acc;

                                                    if (!acc[shift.date]) acc[shift.date] = [];
                                                    acc[shift.date].push(shift);
                                                    return acc;
                                                }, {} as Record<string, any[]>)
                                            ).map(([date, shifts]) => (
                                                <div key={date} className="bg-blue-50 border border-blue-200 rounded p-2">
                                                    <p className="text-xs font-medium text-blue-800 mb-1">{date}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {shifts.map((shift) => (
                                                            <span key={shift.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs">
                                                                {getPeriodIcon(shift.period)}
                                                                {shift.type === 'montagem' ? 'Mont' :
                                                                    shift.type === 'evento' ? 'Evt' :
                                                                        shift.type === 'desmontagem' ? 'Desm' : 'Fin'} -
                                                                {shift.period === 'diurno' ? 'Dia' : shift.period === 'noturno' ? 'Noite' : 'DI'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4 text-gray-900">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setEditDialogOpen(false)
                                        setEditForm({ nome: "", cpf: "", senha: "" })
                                        setEditSelectedEventDates([])
                                    }}
                                    className="text-gray-900"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={salvarEdicao}
                                    disabled={loading || editSelectedEventDates.length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Criação */}
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogContent className="bg-white text-gray-900 max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Novo Operador</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 ">
                            <div>
                                <label className="block text-sm font-medium text-gray-700  mb-1">Nome</label>
                                <Input
                                    value={createForm.nome}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, nome: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                                <Input
                                    value={createForm.cpf}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, cpf: formatCpfInput(e.target.value) }))}
                                    placeholder="000.000.000-00"
                                    maxLength={14}
                                    className={cpfExists ? "border-red-500 focus:border-red-500" : ""}
                                />
                                {cpfExists && (
                                    <p className="text-red-500 text-sm mt-1">
                                        ⚠️ CPF já cadastrado no sistema
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600">
                                    {loadingDefaultPassword ? (
                                        "Carregando senha padrão..."
                                    ) : defaultPassword ? (
                                        "Será usada a senha padrão configurada automaticamente"
                                    ) : (
                                        "Nenhuma senha padrão configurada"
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => {
                                    setCreateDialogOpen(false)
                                    setCreateForm({ nome: "", cpf: "", senha: defaultPassword || "" })
                                    setCpfExists(false)
                                }}>
                                    Cancelar
                                </Button>
                                <Button onClick={salvarNovo} disabled={loading || cpfExists}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Exclusão */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir o operador &quot;{operatorToDelete?.nome}&quot;? Esta ação não pode ser desfeita.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={confirmarExclusao} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Retirada de Operadores */}
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                    <DialogContent className="max-w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[95vh] bg-white  overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900">
                                {fileToImport ? "Importar Operadores" : "Atribuir Operadores ao Evento"}
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                                {fileToImport
                                    ? `Selecione os turnos do evento "${nomeEvento}" para importar os operadores`
                                    : `Selecione os operadores e os turnos do evento "${nomeEvento}" para atribuição`
                                }
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            {/* Seção de Seleção de Turnos */}
                            <div className="bg-gray-50 rounded-lg p-2 sm:p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                                    <h3 className="text-lg font-medium text-gray-900">Selecionar Turnos do Evento</h3>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={handleSelectAllShifts}
                                    >
                                        {(() => {
                                            const eventShifts = getEventDays()
                                            const allShiftIds = eventShifts.map(shift => shift.id)
                                            return selectedEventDates.length === allShiftIds.length ? "Desmarcar Todos" : "Marcar Todos"
                                        })()}
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {/* Agrupar turnos por estágio e depois por data */}
                                    {Object.entries(
                                        getEventDays().reduce((acc, shift) => {
                                            if (!acc[shift.type]) acc[shift.type] = {};
                                            if (!acc[shift.type][shift.date]) acc[shift.type][shift.date] = [];
                                            acc[shift.type][shift.date].push(shift);
                                            return acc;
                                        }, {} as Record<string, Record<string, typeof getEventDays extends () => infer T ? T : never>>)
                                    ).map(([stage, dateGroups]) => {
                                        const stageLabel = stage === 'montagem' ? 'Montagem' :
                                            stage === 'evento' ? 'Evento' :
                                                stage === 'desmontagem' ? 'Desmontagem' : 'Finalização';

                                        return (
                                            <div key={stage} className="border border-gray-200 rounded-lg p-3 bg-white">
                                                <h4 className="text-sm font-semibold mb-3 text-gray-700">{stageLabel}</h4>
                                                {Object.entries(dateGroups).map(([date, shifts]) => {
                                                    return (
                                                        <div key={date} className="mb-3 last:mb-0">
                                                            <p className="text-xs font-medium mb-2 text-gray-600">{date}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {shifts.map((shift) => {
                                                                    const isSelected = selectedEventDates.includes(shift.id)
                                                                    return (
                                                                        <Button
                                                                            key={shift.id}
                                                                            type="button"
                                                                            variant={isSelected ? "default" : "outline"}
                                                                            size="sm"
                                                                            onClick={() => handleShiftSelection(shift.id)}
                                                                            disabled={assignLoading}
                                                                            className="flex items-center gap-1 text-xs h-8"
                                                                        >
                                                                            {getPeriodIcon(shift.period)}
                                                                            <span>
                                                                                {shift.period === 'diurno' ? 'Diurno' : shift.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'}
                                                                            </span>
                                                                        </Button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>

                                {selectedEventDates.length > 0 && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            <strong>Turnos selecionados:</strong> {selectedEventDates.length} turno(s)
                                        </p>
                                        <div className="mt-2 space-y-2">
                                            {Object.entries(
                                                selectedEventDates.reduce((acc, shiftId) => {
                                                    const shift = getEventDays().find(s => s.id === shiftId);
                                                    if (!shift) return acc;

                                                    if (!acc[shift.date]) acc[shift.date] = [];
                                                    acc[shift.date].push(shift);
                                                    return acc;
                                                }, {} as Record<string, any[]>)
                                            ).map(([date, shifts]) => (
                                                <div key={date} className="bg-blue-50 border border-blue-200 rounded p-2">
                                                    <p className="text-xs font-medium text-blue-800 mb-1">{date}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {shifts.map((shift) => (
                                                            <span key={shift.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs">
                                                                {getPeriodIcon(shift.period)}
                                                                {shift.type === 'montagem' ? 'Mont' :
                                                                    shift.type === 'evento' ? 'Evt' :
                                                                        shift.type === 'desmontagem' ? 'Desm' : 'Fin'} -
                                                                {shift.period === 'diurno' ? 'Dia' : shift.period === 'noturno' ? 'Noite' : 'DI'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Seção de Seleção de Operadores - Só aparece quando não está importando */}
                            {!fileToImport && (
                                <div className="bg-gray-50 rounded-lg p-2 sm:p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                                        <h3 className="text-lg font-medium text-gray-900">Selecionar Operadores</h3>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={filteredAvailableOperators.length > 0 && selectedOperators.length === filteredAvailableOperators.length}
                                                onCheckedChange={handleSelectAllOperators}
                                            />
                                            <span className="text-sm text-gray-600">Selecionar todos</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center mb-4">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Buscar operadores..."
                                                value={assignSearch}
                                                onChange={(e) => setAssignSearch(e.target.value)}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="border rounded-lg max-h-48 sm:max-h-64 overflow-y-auto bg-white">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-8 sm:w-12"></TableHead>
                                                    <TableHead className="text-gray-900">Nome</TableHead>
                                                    <TableHead className="text-gray-900">CPF</TableHead>
                                                    <TableHead className="text-gray-900">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredAvailableOperators.length > 0 ? (
                                                    filteredAvailableOperators.map((operator) => (
                                                        <TableRow
                                                            key={operator.id}
                                                            className={`hover:bg-gray-50 transition-colors ${selectedOperators.includes(operator.id) ? 'bg-blue-50' : ''
                                                                }`}
                                                        >
                                                            <TableCell className="w-8 sm:w-12">
                                                                <div className="flex items-center justify-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedOperators.includes(operator.id)}
                                                                        onChange={() => {
                                                                            console.log("🔍 Checkbox nativa clicada para operador:", operator.id)
                                                                            handleSelectOperator(operator.id)
                                                                        }}
                                                                        className="cursor-pointer w-4 h-4"
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                <span className="text-gray-900 truncate max-w-[100px] sm:max-w-[180px]">{capitalizeWords(operator.nome)}</span>
                                                            </TableCell>
                                                            <TableCell className="text-gray-700">{formatCPF(operator.cpf)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-green-600 border-green-200">
                                                                    Disponível
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                                            {assignSearch ? 'Nenhum operador encontrado' : 'Nenhum operador disponível para Retirada'}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-2 sm:p-4 rounded-lg border gap-2">
                                <div className="text-sm text-gray-600 w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-1">
                                    {!fileToImport && <div>{selectedOperators.length} operador(es) selecionado(s)</div>}
                                    <div>{selectedEventDates.length} dia(s) selecionado(s)</div>
                                    {fileToImport && <div className="text-blue-600 truncate max-w-xs">{fileToImport.name}</div>}
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setAssignDialogOpen(false)
                                            setSelectedEventDates([])
                                            setFileToImport(null)
                                        }}
                                        className="w-full sm:w-auto"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={fileToImport ? handleConfirmImport : handleAssignOperators}
                                        disabled={
                                            assignLoading ||
                                            selectedEventDates.length === 0 ||
                                            (!fileToImport && selectedOperators.length === 0)
                                        }
                                        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                                    >
                                        {assignLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : fileToImport ? (
                                            <Upload className="h-4 w-4 mr-2" />
                                        ) : (
                                            <UserPlus className="h-4 w-4 mr-2" />
                                        )}
                                        {fileToImport ? "Importar" : `Atribuir ${selectedOperators.length > 0 ? `(${selectedOperators.length})` : ''}`}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>



                {/* Modal de Resumo de Importação */}
                <Dialog open={resumoDialogOpen} onOpenChange={setResumoDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Resumo da Importação de Operadores</DialogTitle>
                            <DialogDescription>
                                O sistema verificará se cada operador já existe por CPF. Se existir, será apenas atribuído ao evento. Se não existir, será criado um novo operador.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <h3 className="font-medium text-green-800">Importados com Sucesso</h3>
                                    <p className="text-2xl font-bold text-green-600">{resumoImportacao.importados.length}</p>
                                </div>
                                {resumoImportacao.falhados && resumoImportacao.falhados.length > 0 && (
                                    <div className="p-4 bg-red-50 rounded-lg">
                                        <h3 className="font-medium text-red-800">Falharam</h3>
                                        <p className="text-2xl font-bold text-red-600">{resumoImportacao.falhados.length}</p>
                                    </div>
                                )}
                            </div>

                            {resumoImportacao.importados.length > 0 && (
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <h3 className="font-medium text-blue-800">Turnos de Atribuição</h3>
                                    <div className="text-blue-600 text-sm">
                                        {selectedEventDates.length > 0 ? (
                                            <div className="space-y-1">
                                                {selectedEventDates.map(shiftId => {
                                                    const shift = getEventDays().find(s => s.id === shiftId)
                                                    return shift ? (
                                                        <div key={shiftId} className="flex items-center gap-1">
                                                            {getPeriodIcon(shift.period)}
                                                            <span>{shift.label}</span>
                                                        </div>
                                                    ) : (
                                                        <div key={shiftId}>{shiftId}</div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            'Sem turnos específicos'
                                        )}
                                    </div>
                                </div>
                            )}

                            {resumoImportacao.falhados && resumoImportacao.falhados.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Detalhes dos Erros:</h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {resumoImportacao.falhados.map((falha, index) => (
                                            <div key={index} className="p-2 bg-red-50 rounded text-sm">
                                                <p className="font-medium">{falha.item.nome}</p>
                                                <p className="text-red-600">{falha.motivo}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => {
                                    setResumoDialogOpen(false)
                                    setSelectedEventDates([])
                                }}>
                                    Cancelar
                                </Button>
                                <Button onClick={confirmarImportacao} disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Importação"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Detalhes da Ação */}
                <Dialog open={actionDetailsOpen} onOpenChange={setActionDetailsOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detalhes Completos da Ação</DialogTitle>
                            <DialogDescription>
                                Visualização completa de todos os dados registrados nesta ação
                            </DialogDescription>
                        </DialogHeader>
                        {selectedAction && (
                            <div className="space-y-6">
                                {/* Informações Básicas da Ação */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tipo da Ação</label>
                                        <Badge variant="outline" className={getActionBadgeColor(selectedAction.type)}>
                                            {selectedAction.type}
                                        </Badge>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Data/Hora da Ação</label>
                                        <p className="text-gray-900">{formatTimestamp(selectedAction.timestamp)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tabela</label>
                                        <p className="text-gray-900">{selectedAction.tabela || "-"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Event ID</label>
                                        <p className="text-gray-900 font-mono text-sm">{selectedAction.eventId || "-"}</p>
                                    </div>
                                </div>

                                {/* Informações do Operador que Executou */}
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <h3 className="text-lg font-semibold text-blue-900 mb-3">👨‍💼 Quem Executou a Ação</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nome</label>
                                            <p className="text-gray-900">{capitalizeWords(selectedAction.operatorName || selectedAction.operadorNome)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">CPF</label>
                                            <p className="text-gray-900">{formatCPF(selectedAction.operatorCpf || selectedAction.operadorCpf)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ID do Operador</label>
                                            <p className="text-gray-900 font-mono text-sm">{selectedAction.operatorId || selectedAction.operadorId}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Informações do Staff que Sofreu a Ação */}
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <h3 className="text-lg font-semibold text-green-900 mb-3">👤 Quem Sofreu a Ação</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nome</label>
                                            <p className="text-gray-900">{capitalizeWords(selectedAction.staffName)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">CPF</label>
                                            <p className="text-gray-900">{formatCPF(selectedAction.staffCpf)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ID do Staff</label>
                                            <p className="text-gray-900 font-mono text-sm">{selectedAction.staffId}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Empresa</label>
                                            <p className="text-gray-900">{selectedAction.empresa || "-"}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Função</label>
                                            <p className="text-gray-900">{selectedAction.funcao || "-"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Informações do Evento */}
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <h3 className="text-lg font-semibold text-purple-900 mb-3">📅 Informações do Evento</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Data de Trabalho</label>
                                            <p className="text-gray-900">{selectedAction.workDate || "-"}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Estágio</label>
                                            <p className="text-gray-900">{selectedAction.workStage || "-"}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Período</label>
                                            <p className="text-gray-900">{selectedAction.workPeriod || "-"}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Evento (Legado)</label>
                                            <p className="text-gray-900 text-sm">{selectedAction.evento || "-"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Credenciais e Pulseiras */}
                                <div className="p-4 bg-orange-50 rounded-lg">
                                    <h3 className="text-lg font-semibold text-orange-900 mb-3">🎫 Credenciais e Pulseiras</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Credenciais</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Atual</label>
                                                    <p className="text-gray-900">{selectedAction.credencial || "-"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Anterior</label>
                                                    <p className="text-gray-900">{selectedAction.credencialAnterior || "-"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Trocou Tipo</label>
                                                    <Badge variant={selectedAction.trocouTipoCredencial ? "default" : "secondary"}>
                                                        {selectedAction.trocouTipoCredencial ? "Sim" : "Não"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Pulseiras</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Atual</label>
                                                    <p className="text-gray-900">{selectedAction.pulseira || "-"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Anterior</label>
                                                    <p className="text-gray-900">{selectedAction.pulseiraAnterior || "-"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Check-in/Check-out */}
                                {(selectedAction.checkInTime || selectedAction.checkOutTime) && (
                                    <div className="p-4 bg-indigo-50 rounded-lg">
                                        <h3 className="text-lg font-semibold text-indigo-900 mb-3">⏰ Check-in/Check-out</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedAction.checkInTime && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Check-in</label>
                                                    <p className="text-green-600 font-medium">{selectedAction.checkInTime}</p>
                                                </div>
                                            )}
                                            {selectedAction.checkOutTime && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Check-out</label>
                                                    <p className="text-red-600 font-medium">{selectedAction.checkOutTime}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Observações */}
                                {selectedAction.observacoes && (
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 Observações</h3>
                                        <p className="text-gray-900 whitespace-pre-wrap">{selectedAction.observacoes}</p>
                                    </div>
                                )}

                                {/* Dados Técnicos */}
                                <details className="p-4 bg-gray-100 rounded-lg">
                                    <summary className="font-medium text-gray-900 cursor-pointer">🔧 Dados Técnicos (JSON)</summary>
                                    <pre className="mt-3 text-sm bg-white p-4 rounded border overflow-auto max-h-60">
                                        {JSON.stringify(selectedAction, null, 2)}
                                    </pre>
                                </details>

                                <div className="flex justify-end">
                                    <Button onClick={() => setActionDetailsOpen(false)}>
                                        Fechar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}
