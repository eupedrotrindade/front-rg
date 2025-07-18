"use client"

import type React from "react"

import { useOperators } from "@/features/operadores/api/query/use-operators"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useMemo, useCallback, useEffect } from "react"
import {
    Search,
    Filter,
    X,
    ChevronUp,
    ChevronDown,
    Download,
    Calendar,
    CreditCard,
    Building,
    FileText,
    UserCheck,
    UserX,
    RefreshCw,
    UserPlus,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import * as XLSX from "xlsx"

const actionTypes = [
    { value: "checkin", label: "Check-in", icon: UserCheck, color: "bg-green-500 text-green-800" },
    { value: "checkout", label: "Check-out", icon: UserX, color: "bg-red-500 text-red-800" },
    { value: "troca_pulseira", label: "Troca de Pulseira", icon: RefreshCw, color: "bg-blue-500 text-blue-800" },
    { value: "criar_staff", label: "Criação de Staff", icon: UserPlus, color: "bg-purple-500 text-purple-800" },
]

type SortField = "timestamp" | "operadorNome" | "type" | "staffName"
type SortDirection = "asc" | "desc"

const ITEMS_PER_PAGE = 20

const OperatorActionsHistory = () => {
    const { data: operators = [], isLoading } = useOperators()

    // Estados dos filtros
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [pulseira, setPulseira] = useState("")
    const [evento, setEvento] = useState("")
    const [actionType, setActionType] = useState("")
    const [credencial, setCredencial] = useState("")

    // Estados de ordenação e paginação
    const [sortField, setSortField] = useState<SortField>("timestamp")
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
    const [currentPage, setCurrentPage] = useState(1)

    // Estados do Dialog
    const [myActionsDialogOpen, setMyActionsDialogOpen] = useState(false)
    const [myCpf, setMyCpf] = useState<string | null>(null)

    // Debounce para busca
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    // Reset página quando filtros mudam
    useEffect(() => {
        setCurrentPage(1)
    }, [debouncedSearch, pulseira, evento, actionType, credencial])

    // Descobre o CPF do operador logado (localStorage)
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const operadorRaw = localStorage.getItem("operador")
                if (operadorRaw) {
                    const operador = JSON.parse(operadorRaw)
                    setMyCpf(operador.cpf)
                }
            } catch { }
        }
    }, [])

    // Junta todas as ações de todos operadores
    const allActions = useMemo(() => {
        return operators.flatMap((op) =>
            Array.isArray(op.acoes)
                ? op.acoes.map((a) => ({
                    ...a,
                    operadorNome: op.nome,
                    operadorCpf: op.cpf,
                    operadorId: op.id,
                }))
                : [],
        )
    }, [operators])

    // Filtros aplicados
    const filteredActions = useMemo(() => {
        return allActions.filter((a) => {
            const matchSearch =
                !debouncedSearch ||
                (a.staffName && a.staffName.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
                (a.operadorNome && a.operadorNome.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
                (a.operadorCpf && a.operadorCpf.includes(debouncedSearch))

            const matchPulseira = !pulseira || (a.pulseira && a.pulseira.toLowerCase().includes(pulseira.toLowerCase()))
            const matchEvento = !evento || (a.evento && a.evento.toLowerCase().includes(evento.toLowerCase()))
            const matchCredencial =
                !credencial || (a.credencial && a.credencial.toLowerCase().includes(credencial.toLowerCase()))
            const matchType = !actionType || a.type === actionType

            return matchSearch && matchPulseira && matchEvento && matchCredencial && matchType
        })
    }, [allActions, debouncedSearch, pulseira, evento, credencial, actionType])

    // Ordenação
    const sortedActions = useMemo(() => {
        return [...filteredActions].sort((a, b) => {
            let aValue = a[sortField]
            let bValue = b[sortField]

            if (sortField === "timestamp") {
                aValue = new Date(aValue || 0).getTime()
                bValue = new Date(bValue || 0).getTime()
            } else {
                aValue = String(aValue || "").toLowerCase()
                bValue = String(bValue || "").toLowerCase()
            }

            if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
            if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
            return 0
        })
    }, [filteredActions, sortField, sortDirection])

    // Paginação
    const paginatedActions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
        return sortedActions.slice(startIndex, startIndex + ITEMS_PER_PAGE)
    }, [sortedActions, currentPage])

    const totalPages = Math.ceil(sortedActions.length / ITEMS_PER_PAGE)

    // Funções auxiliares
    const handleSort = useCallback(
        (field: SortField) => {
            if (sortField === field) {
                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
            } else {
                setSortField(field)
                setSortDirection("asc")
            }
        },
        [sortField],
    )

    const clearAllFilters = useCallback(() => {
        setSearch("")
        setPulseira("")
        setEvento("")
        setActionType("")
        setCredencial("")
        setCurrentPage(1)
    }, [])

    const getActionTypeConfig = (type: string) => {
        return (
            actionTypes.find((at) => at.value === type) || {
                value: type,
                label: type,
                icon: FileText,
                color: "bg-gray-100 text-gray-800",
            }
        )
    }

    const exportToCSV = useCallback(() => {
        const headers = ["Data/Hora", "Operador", "CPF", "Ação", "Staff", "Pulseira", "Evento", "Credencial", "Tabela"]
        const csvContent = [
            headers.join(","),
            ...sortedActions.map((a) =>
                [
                    a.timestamp ? new Date(a.timestamp).toLocaleString("pt-BR") : "",
                    a.operadorNome || "",
                    a.operadorCpf || "",
                    a.type || "",
                    a.staffName || "",
                    a.pulseira || "",
                    a.evento || "",
                    a.credencial || "",
                    a.tabela || "",
                ]
                    .map((field) => `"${field}"`)
                    .join(","),
            ),
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = `historico-acoes-${new Date().toISOString().split("T")[0]}.csv`
        link.click()
    }, [sortedActions])

    const exportToExcel = useCallback(() => {
        const headers = [
            "Data/Hora",
            "Operador",
            "CPF",
            "Ação",
            "Staff",
            "Pulseira",
            "Evento",
            "Credencial",
            "Tabela",
        ]
        const data = sortedActions.map((a) => [
            a.timestamp ? new Date(a.timestamp).toLocaleString("pt-BR") : "",
            a.operadorNome || "",
            a.operadorCpf || "",
            a.type || "",
            a.staffName || "",
            a.pulseira || "",
            a.evento || "",
            a.credencial || "",
            a.tabela || "",
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Ações")
        XLSX.writeFile(wb, `historico-acoes-${new Date().toISOString().split("T")[0]}.xlsx`)
    }, [sortedActions])

    // Filtra ações do operador logado
    const myActions = useMemo(() => {
        if (!myCpf) return []
        return allActions.filter(a => a.operadorCpf === myCpf)
    }, [allActions, myCpf])

    const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort(field)}
            className="h-auto p-0 font-medium hover:bg-transparent"
        >
            <div className="flex items-center gap-1">
                {children}
                {sortField === field &&
                    (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
            </div>
        </Button>
    )

    const LoadingSkeleton = () => (
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex space-x-4">
                    {Array.from({ length: 9 }).map((_, j) => (
                        <Skeleton key={j} className="h-4 w-20" />
                    ))}
                </div>
            ))}
        </div>
    )

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Histórico de Ações dos Operadores</h1>
                    <p className="text-muted-foreground mt-1">Visualize e gerencie todas as ações realizadas pelos operadores</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={exportToCSV} variant="outline" className="gap-2 bg-transparent">
                        <Download className="h-4 w-4" />
                        Exportar CSV
                    </Button>
                    <Button onClick={exportToExcel} variant="outline" className="gap-2 bg-transparent">
                        <Download className="h-4 w-4" />
                        Exportar Excel
                    </Button>
                    {myCpf && (
                        <Button onClick={() => setMyActionsDialogOpen(true)} variant="secondary" className="gap-2">
                            <UserCheck className="h-4 w-4" />
                            Ver minhas ações
                        </Button>
                    )}
                </div>
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar operador, CPF ou staff..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filtrar por pulseira"
                                value={pulseira}
                                onChange={(e) => setPulseira(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filtrar por evento"
                                value={evento}
                                onChange={(e) => setEvento(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filtrar por credencial"
                                value={credencial}
                                onChange={(e) => setCredencial(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Select value={actionType} onValueChange={setActionType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Tipo de ação" />
                            </SelectTrigger>
                            <SelectContent>
                                {actionTypes.map((a) => (
                                    <SelectItem key={a.value} value={a.value}>
                                        <div className="flex items-center gap-2">
                                            <a.icon className="h-4 w-4" />
                                            {a.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {(search || pulseira || evento || credencial || actionType) && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Filtros ativos:</span>
                                {search && <Badge variant="secondary">Busca: {search}</Badge>}
                                {pulseira && <Badge variant="secondary">Pulseira: {pulseira}</Badge>}
                                {evento && <Badge variant="secondary">Evento: {evento}</Badge>}
                                {credencial && <Badge variant="secondary">Credencial: {credencial}</Badge>}
                                {actionType && <Badge variant="secondary">Tipo: {getActionTypeConfig(actionType).label}</Badge>}
                            </div>
                            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-2">
                                <X className="h-4 w-4" />
                                Limpar todos
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Resultados */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                            Resultados ({sortedActions.length} {sortedActions.length === 1 ? "ação" : "ações"})
                        </CardTitle>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                Página {currentPage} de {totalPages}
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto history-table">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <SortButton field="timestamp">Data/Hora</SortButton>
                                    </TableHead>
                                    <TableHead>
                                        <SortButton field="operadorNome">Operador</SortButton>
                                    </TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead>
                                        <SortButton field="type">Ação</SortButton>
                                    </TableHead>
                                    <TableHead>
                                        <SortButton field="staffName">Staff</SortButton>
                                    </TableHead>
                                    <TableHead>Pulseira</TableHead>
                                    <TableHead>Evento</TableHead>
                                    <TableHead>Credencial</TableHead>
                                    <TableHead>Tabela</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9}>
                                            <LoadingSkeleton />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedActions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Search className="h-8 w-8" />
                                                <p>Nenhuma ação encontrada</p>
                                                <p className="text-sm">Tente ajustar os filtros de busca</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedActions.map((a, idx) => {
                                        const actionConfig = getActionTypeConfig(a.type)
                                        return (
                                            <TableRow key={`${a.operadorId}-${idx}`} className="hover:bg-muted/50">
                                                <TableCell className="font-mono text-sm">
                                                    {a.timestamp ? new Date(a.timestamp).toLocaleString("pt-BR") : "-"}
                                                </TableCell>
                                                <TableCell className="font-medium">{a.operadorNome}</TableCell>
                                                <TableCell className="font-mono text-sm">{a.operadorCpf}</TableCell>
                                                <TableCell>
                                                    <Badge className={actionConfig.color}>
                                                        <actionConfig.icon className="h-3 w-3 mr-1" />
                                                        {actionConfig.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{a.staffName || "-"}</TableCell>
                                                <TableCell className="font-mono text-sm">{a.pulseira || "-"}</TableCell>
                                                <TableCell>{a.evento || "-"}</TableCell>
                                                <TableCell>{a.credencial || "-"}</TableCell>
                                                <TableCell>{a.tabela || "-"}</TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
                                {Math.min(currentPage * ITEMS_PER_PAGE, sortedActions.length)} de {sortedActions.length} resultados
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Anterior
                                </Button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum
                                        if (totalPages <= 5) {
                                            pageNum = i + 1
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i
                                        } else {
                                            pageNum = currentPage - 2 + i
                                        }

                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        )
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Próxima
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de ações do operador logado */}
            <Dialog open={myActionsDialogOpen} onOpenChange={setMyActionsDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Minhas Ações</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-x-auto history-table">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data/Hora</TableHead>
                                    <TableHead>Ação</TableHead>
                                    <TableHead>Staff</TableHead>
                                    <TableHead>Pulseira</TableHead>
                                    <TableHead>Evento</TableHead>
                                    <TableHead>Credencial</TableHead>
                                    <TableHead>Tabela</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {myActions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Nenhuma ação encontrada para seu usuário.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    myActions.map((a, idx) => {
                                        const actionConfig = getActionTypeConfig(a.type)
                                        return (
                                            <TableRow key={idx}>
                                                <TableCell>{a.timestamp ? new Date(a.timestamp).toLocaleString("pt-BR") : "-"}</TableCell>
                                                <TableCell>
                                                    <Badge className={actionConfig.color}>
                                                        <actionConfig.icon className="h-3 w-3 mr-1" />
                                                        {actionConfig.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{a.staffName || "-"}</TableCell>
                                                <TableCell>{a.pulseira || "-"}</TableCell>
                                                <TableCell>{a.evento || "-"}</TableCell>
                                                <TableCell>{a.credencial || "-"}</TableCell>
                                                <TableCell>{a.tabela || "-"}</TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default OperatorActionsHistory
