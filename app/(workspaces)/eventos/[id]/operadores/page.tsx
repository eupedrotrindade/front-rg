/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useEffect, useState, useRef, useMemo } from "react"
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
import { formatCpf, isValidCpf, formatCpfInput, unformatCpf } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2, Download, Upload, Plus, Edit, Trash2, Users, UserPlus, RefreshCw, Activity } from "lucide-react"
import { useParams } from "next/navigation"
import { useOperatorsByEvent } from "@/features/operadores/api/query/use-operators-by-event"
import { useOperators } from "@/features/operadores/api/query/use-operators"
import type { Operator } from "@/features/operadores/types"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useQueryClient } from "@tanstack/react-query"

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

    // Função para gerar datas do evento
    const getEventDates = () => {
        if (!evento) return []

        const dates: string[] = []
        const startDate = new Date(evento.startDate)
        const endDate = new Date(evento.endDate)

        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0])
            currentDate.setDate(currentDate.getDate() + 1)
        }

        return dates
    }

    const { data: operadores = [], isLoading: loadingOperadores } = useOperatorsByEvent({
        eventId,
        search: filtro.busca,
        sortBy: ordenacao.campo,
        sortOrder: ordenacao.direcao
    })
    const { data: allOperators = [], isLoading: loadingAllOperators, refetch: refetchAllOperators } = useOperators()
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null

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
        if (eventos && Array.isArray(eventos)) {
            const evento = eventos.find((e: any) => e.id === eventId)
            if (evento) {
                setNomeEvento(evento.name || "Evento")
            }
        }
    }, [eventos, eventId])

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

        // Carregar datas de Retirada atuais
        const currentDates: string[] = []
        if (operador.id_events) {
            const eventAssignments = operador.id_events.split(',').map((assignment: string) => assignment.trim())
            for (const assignment of eventAssignments) {
                if (assignment.includes(':')) {
                    const [eventIdFromAssignment, date] = assignment.split(':')
                    if (eventIdFromAssignment === eventId) {
                        currentDates.push(date)
                    }
                }
            }
        }
        setEditSelectedEventDates(currentDates)
        setEditDialogOpen(true)
    }

    const abrirExcluir = (operador: Operator) => {
        setOperatorToDelete(operador)
        setDeleteDialogOpen(true)
    }

    const salvarEdicao = async () => {
        if (!operatorToEdit) return

        if (!editForm.nome || !editForm.cpf || !editForm.senha) {
            toast.error("Todos os campos são obrigatórios")
            return
        }

        if (!isValidCpf(unformatCpf(editForm.cpf))) {
            toast.error("CPF inválido")
            return
        }

        if (editSelectedEventDates.length === 0) {
            toast.error("Selecione pelo menos um dia do evento")
            return
        }

        setLoading(true)
        try {
            // Criar atribuições para todas as datas selecionadas
            const eventAssignments = editSelectedEventDates.map(date => `${eventId}:${date}`).join(',')

            await apiClient.put(`/operadores/${operatorToEdit.id}`, {
                nome: editForm.nome,
                cpf: unformatCpf(editForm.cpf),
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

        if (!isValidCpf(unformatCpf(createForm.cpf))) {
            toast.error("CPF inválido")
            return
        }

        setLoading(true)
        try {
            // Criar Retirada com data específica se disponível
            const eventAssignment = eventId

            await apiClient.post("/operadores", {
                nome: createForm.nome,
                cpf: unformatCpf(createForm.cpf),
                senha: createForm.senha,
                id_events: eventAssignment
            })

            toast.success("Operador criado com sucesso!")
            setCreateDialogOpen(false)
            setCreateForm({ nome: "", cpf: "", senha: "" })
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
            toast.error("Selecione pelo menos um dia do evento")
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

                    // Adicionar novas atribuições para cada dia selecionado
                    const newEventAssignments = selectedEventDates.map(date => `${eventId}:${date}`)
                    const newEvents = [...filteredEvents, ...newEventAssignments]

                    await apiClient.put(`/operadores/${operatorId}`, {
                        nome: operator.nome,
                        cpf: operator.cpf,
                        senha: operator.senha,
                        id_events: newEvents.join(',')
                    })
                }
            }

            const datesText = selectedEventDates.map(date => formatDatePtBr(date)).join(', ')
            toast.success(`${selectedOperators.length} operador(es) atribuído(s) com sucesso para os dias: ${datesText}!`)
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

    const handleDateSelection = (date: string) => {
        setSelectedEventDates(prev =>
            prev.includes(date)
                ? prev.filter(d => d !== date)
                : [...prev, date]
        )
    }

    const handleSelectAllDates = () => {
        const eventDates = getEventDates()
        if (selectedEventDates.length === eventDates.length) {
            setSelectedEventDates([])
        } else {
            setSelectedEventDates(eventDates)
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
            "Data de Retirada": (() => {
                const assignmentDate = getOperatorAssignmentDate(operador);
                return assignmentDate ? formatDatePtBr(assignmentDate) : "Sem data específica";
            })(),
            "Data de Criação": formatDatePtBr(new Date())
        }))

        const ws = XLSX.utils.json_to_sheet(dadosParaExportar)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Operadores")
        XLSX.writeFile(wb, `operadores-${nomeEvento}-${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const baixarModeloExcel = () => {
        const ws = XLSX.utils.json_to_sheet([
            { nome: "", cpf: "", senha: "", id_events: eventId }
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, `modelo-operadores-${nomeEvento}-${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const importarDoExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Armazenar o arquivo para processamento posterior
        setFileToImport(file)
        // Abrir dialog de Retirada que agora inclui seleção de datas
        setAssignDialogOpen(true)
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

                if (!isValidCpf(unformatCpf(row.cpf))) {
                    falhados.push({
                        item: { id: "", nome: row.nome, cpf: row.cpf, senha: row.senha, id_events: eventId, acoes: [] },
                        motivo: "CPF inválido"
                    })
                    continue
                }

                // Criar atribuições para todos os dias selecionados
                const eventAssignments = selectedEventDates.map(date => `${eventId}:${date}`).join(',')

                operadoresImportados.push({
                    id: "",
                    nome: row.nome,
                    cpf: unformatCpf(row.cpf),
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
        try {
            for (const operador of registrosUnicos) {
                try {
                    await apiClient.post("/operadores", {
                        nome: operador.nome,
                        cpf: operador.cpf,
                        senha: operador.senha,
                        id_events: operador.id_events
                    })
                } catch (error: any) {
                    // Se for erro de CPF duplicado, adicionar à lista de falhados
                    if (error?.response?.data?.error?.includes("Já existe um operador cadastrado com o CPF")) {
                        const falhados = resumoImportacao.falhados || []
                        falhados.push({
                            item: operador,
                            motivo: "CPF já cadastrado no sistema"
                        })
                        setResumoImportacao(prev => ({ ...prev, falhados }))
                    } else {
                        throw error // Re-throw outros erros
                    }
                }
            }

            const importadosComSucesso = registrosUnicos.length - (resumoImportacao.falhados?.length || 0)
            if (importadosComSucesso > 0) {
                toast.success(`${importadosComSucesso} operadores importados com sucesso!`)
            }

            if (resumoImportacao.falhados && resumoImportacao.falhados.length > 0) {
                toast.error(`${resumoImportacao.falhados.length} operadores falharam na importação`)
            }

            // Forçar atualização dos dados após importação
            await forceRefreshData()
        } catch (error: any) {
            toast.error("Erro ao importar operadores")
        } finally {
            setLoading(false)
        }
    }

    const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    // Função para extrair a data de Retirada do operador
    const getOperatorAssignmentDate = (operator: Operator) => {
        if (!operator?.id_events) return null

        try {
            const eventAssignments = operator.id_events.split(',').map((assignment: string) => assignment.trim())

            for (const assignment of eventAssignments) {
                if (assignment.includes(':')) {
                    const [eventIdFromAssignment, date] = assignment.split(':')
                    if (eventIdFromAssignment === eventId && date) {
                        return date.trim()
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao processar data de Retirada:', error)
        }

        return null
    }

    // Função para coletar todas as ações dos operadores
    const collectAllActions = useMemo(() => {
        if (!operadores || operadores.length === 0) return []

        const actions: any[] = []

        operadores.forEach(operator => {
            if (operator.acoes && Array.isArray(operator.acoes)) {
                operator.acoes.forEach((action: any) => {
                    actions.push({
                        ...action,
                        operadorId: operator.id,
                        operadorNome: operator.nome,
                        operadorCpf: operator.cpf
                    })
                })
            }
        })

        return actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }, [operadores])

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
        if (!cpf || !isValidCpf(unformatCpf(cpf))) {
            setCpfExists(false)
            return
        }

        try {
            const { data } = await apiClient.get("/operadores", {
                params: { search: unformatCpf(cpf), limit: 1 }
            })

            const exists = data.data && data.data.length > 0 && data.data[0].cpf === unformatCpf(cpf)
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
                    <TabsList className="grid w-full grid-cols-3 gap-14 rounded-lg p-4 bg-white">
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
                            value="todos-operadores"
                            className={`flex items-center justify-center p-4 gap-2 rounded-md transition-colors
                                data-[state=active]:bg-[#610e5c] data-[state=active]:text-white
                                focus:bg-[#610e5c] focus:text-white
                            `}
                        >
                            <UserPlus className="h-4 w-4" />
                            Todos os Operadores ({allOperators.length})
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
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-lg font-medium text-blue-600">
                                                        {getInitials(operador.nome)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{capitalizeWords(operador.nome)}</h3>
                                                    <p className="text-sm text-gray-600">{formatCPF(operador.cpf)}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
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
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Data de Retirada:</span>
                                                {(() => {
                                                    const assignmentDate = getOperatorAssignmentDate(operador);
                                                    if (!assignmentDate) {
                                                        return (
                                                            <Badge variant="outline" className="text-gray-500 border-gray-200">
                                                                Sem data específica
                                                            </Badge>
                                                        );
                                                    }
                                                    return (
                                                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                                                            {formatDatePtBr(assignmentDate)}
                                                        </Badge>
                                                    );
                                                })()}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Ações Realizadas:</span>
                                                <Badge variant="outline" className="text-green-600 border-green-200">
                                                    {operador.acoes?.length || 0} ações
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

                    <TabsContent value="todos-operadores" className="space-y-6">
                        {/* Filtros para Todos os Operadores */}
                        <div className="bg-white rounded-lg shadow-sm border p-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Buscar operadores
                                    </label>
                                    <Input
                                        placeholder="Digite o nome ou CPF..."
                                        value={allOperatorsSearch}
                                        onChange={(e) => setAllOperatorsSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button onClick={abrirAtribuirOperadores} variant="outline">
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Atribuir ao Evento
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Cards de Todos os Operadores */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredAllOperators.length > 0 ? (
                                filteredAllOperators.map((operador) => {
                                    const isAssignedToEvent = operadores.some(op => op.id === operador.id)
                                    const eventAssignments = operador.id_events ? operador.id_events.split(',').filter(Boolean) : []

                                    return (
                                        <div key={operador.id} className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${isAssignedToEvent ? 'ring-2 ring-blue-200' : ''}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isAssignedToEvent ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                        <span className={`text-lg font-medium ${isAssignedToEvent ? 'text-blue-600' : 'text-gray-600'}`}>
                                                            {getInitials(operador.nome)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{capitalizeWords(operador.nome)}</h3>
                                                        <p className="text-sm text-gray-600">{formatCPF(operador.cpf)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    {isAssignedToEvent && (
                                                        <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                                                            Atribuído
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedOperators([operador.id])
                                                            setAssignDialogOpen(true)
                                                        }}
                                                    >
                                                        <UserPlus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Status:</span>
                                                    <Badge variant="outline" className={isAssignedToEvent ? "text-green-600 border-green-200" : "text-gray-500 border-gray-200"}>
                                                        {isAssignedToEvent ? "Atribuído ao Evento" : "Disponível"}
                                                    </Badge>
                                                </div>

                                                {eventAssignments.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="text-sm text-gray-600">Eventos Atribuídos:</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {eventAssignments.slice(0, 2).map((assignment: string, index: number) => {
                                                                const [eventIdFromAssignment, date] = assignment.split(':')
                                                                return (
                                                                    <Badge key={index} variant="outline" className="text-xs text-[#610e5c] border-[#610e5c]">
                                                                        {eventIdFromAssignment === eventId ? `${formatDatePtBr(date)}` : eventIdFromAssignment}
                                                                    </Badge>
                                                                )
                                                            })}
                                                            {eventAssignments.length > 2 && (
                                                                <Badge variant="outline" className="text-xs text-gray-600 border-gray-200">
                                                                    +{eventAssignments.length - 2} mais
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <Users className="h-16 w-16 mx-auto" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        {allOperatorsSearch ? 'Nenhum operador encontrado' : 'Nenhum operador disponível'}
                                    </h3>
                                    <p className="text-gray-500">
                                        {allOperatorsSearch ? 'Tente ajustar os filtros de busca' : 'Crie operadores para começar'}
                                    </p>
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
                                            <TableHead className="text-left font-medium text-gray-900">Operador</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Tipo</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Credencial</TableHead>
                                            <TableHead className="text-left font-medium text-gray-900">Pulseira</TableHead>

                                            <TableHead className="text-left font-medium text-gray-900">Data/Hora</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredActions.length > 0 ? (
                                            filteredActions.map((action, index) => (
                                                <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                                <span className="text-sm font-medium text-blue-600">
                                                                    {getInitials(action.operadorNome)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-900">{capitalizeWords(action.operadorNome)}</span>
                                                                <p className="text-xs text-gray-500">{formatCPF(action.operadorCpf)}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={getActionBadgeColor(action.type)}>
                                                            {action.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-700">
                                                        {action.credencial || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-gray-700">
                                                        {action.pulseira || "-"}
                                                    </TableCell>

                                                    <TableCell className="text-gray-700">
                                                        {formatTimestamp(action.timestamp)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
                    <DialogContent className="max-w-2xl">
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
                                    <label className="block text-sm font-medium text-gray-700">Data de Retirada</label>
                                    <p className="text-gray-900">
                                        {(() => {
                                            const assignmentDate = getOperatorAssignmentDate(selectedOperator);
                                            if (!assignmentDate) {
                                                return (
                                                    <Badge variant="outline" className="text-gray-500 border-gray-200">
                                                        Sem data específica
                                                    </Badge>
                                                );
                                            }
                                            return (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200">
                                                    {formatDatePtBr(assignmentDate)}
                                                </Badge>
                                            );
                                        })()}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ações Realizadas</label>
                                    <div className="mt-2 max-h-60 overflow-y-auto">
                                        {selectedOperator.acoes?.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedOperator.acoes.map((acao: any, index: number) => (
                                                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-medium">{acao.type}</p>
                                                                <p className="text-sm text-gray-600">{acao.timestamp}</p>
                                                            </div>
                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                {acao.tabela}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">Nenhuma ação registrada</p>
                                        )}
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
                                            if (editSelectedEventDates.length === getEventDates().length) {
                                                setEditSelectedEventDates([])
                                            } else {
                                                setEditSelectedEventDates(getEventDates())
                                            }
                                        }}
                                        className="text-gray-900"
                                    >
                                        {editSelectedEventDates.length === getEventDates().length ? "Desmarcar Todos" : "Marcar Todos"}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-7 gap-2">
                                    {getEventDates().map((date) => {
                                        const isSelected = editSelectedEventDates.includes(date)
                                        const dateObj = new Date(date)
                                        const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' })
                                        const dayNumber = dateObj.getDate()

                                        return (
                                            <button
                                                key={date}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setEditSelectedEventDates(prev => prev.filter(d => d !== date))
                                                    } else {
                                                        setEditSelectedEventDates(prev => [...prev, date])
                                                    }
                                                }}
                                                className={`
                                                    p-3 rounded-lg border-2 transition-all duration-200 text-center
                                                    ${isSelected
                                                        ? 'bg-blue-500 text-white border-blue-500'
                                                        : 'bg-white text-gray-900 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                                                    }
                                                `}
                                            >
                                                <div className="text-xs font-medium">{dayName}</div>
                                                <div className="text-lg font-bold">{dayNumber}</div>
                                            </button>
                                        )
                                    })}
                                </div>

                                {editSelectedEventDates.length > 0 && (
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-sm text-blue-900">
                                            <strong>Dias selecionados:</strong> {editSelectedEventDates.length} dia(s)
                                        </p>
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
                    <DialogContent className="bg-white text-gray-900">
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
                                <Input
                                    type="password"
                                    value={createForm.senha}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, senha: e.target.value }))}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => {
                                    setCreateDialogOpen(false)
                                    setCreateForm({ nome: "", cpf: "", senha: "" })
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
                                    ? `Selecione os dias do evento "${nomeEvento}" para importar os operadores`
                                    : `Selecione os operadores e os dias do evento "${nomeEvento}" para Retirada`
                                }
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            {/* Seção de Seleção de Dias */}
                            <div className="bg-gray-50 rounded-lg p-2 sm:p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                                    <h3 className="text-lg font-medium text-gray-900">Selecionar Dias do Evento</h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSelectAllDates}
                                    >
                                        {selectedEventDates.length === getEventDates().length ? "Desmarcar Todos" : "Marcar Todos"}
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <div className="grid grid-cols-7 min-w-[420px] gap-2">
                                        {/* Cabeçalho dos dias da semana */}
                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                            <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-2">
                                                {day}
                                            </div>
                                        ))}

                                        {/* Dias do evento */}
                                        {getEventDates().map((date, index) => {
                                            const isSelected = selectedEventDates.includes(date)
                                            const dayNumber = new Date(date).getDate()

                                            return (
                                                <div
                                                    key={date}
                                                    className={`
                                                        relative p-2 text-center cursor-pointer rounded-lg border-2 transition-all
                                                        ${isSelected
                                                            ? 'bg-blue-500 text-white border-blue-500'
                                                            : 'bg-white text-gray-900 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                        }
                                                    `}
                                                    onClick={() => handleDateSelection(date)}
                                                >
                                                    <div className="text-xs sm:text-sm font-medium">{dayNumber}</div>
                                                    <div className="text-[10px] sm:text-xs opacity-75">
                                                        {new Date(date).toLocaleDateString('pt-BR', { month: 'short' })}
                                                    </div>
                                                    {isSelected && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                                            <span className="text-white text-xs">✓</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {selectedEventDates.length > 0 && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            <strong>Dias selecionados:</strong> {selectedEventDates.length} dia(s)
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1 break-words">
                                            {selectedEventDates.map(date => formatDatePtBr(date)).join(', ')}
                                        </p>
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
                                                                <div className="flex items-center gap-2 sm:gap-3">
                                                                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                                        <span className="text-xs sm:text-sm font-medium text-blue-600">
                                                                            {getInitials(operator.nome)}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-gray-900 truncate max-w-[100px] sm:max-w-[180px]">{capitalizeWords(operator.nome)}</span>
                                                                </div>
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
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Resumo da Importação</DialogTitle>
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
                                    <h3 className="font-medium text-blue-800">Dias de Retirada</h3>
                                    <p className="text-blue-600">
                                        {selectedEventDates.length > 0
                                            ? selectedEventDates.map(date => formatDatePtBr(date)).join(', ')
                                            : 'Sem datas específicas'
                                        }
                                    </p>
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
            </div>
        </EventLayout>
    )
}
