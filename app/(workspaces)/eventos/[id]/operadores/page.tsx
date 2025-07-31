/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import apiClient from "@/lib/api-client"
import { formatCpf, isValidCpf } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2, Download, Upload, Plus, Edit, Trash2 } from "lucide-react"
import { useParams } from "next/navigation"
import { useOperatorsByEvent } from "@/features/operadores/api/query/use-operators-by-event"
import type { Operator } from "@/features/operadores/types"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import EventLayout from "@/components/dashboard/dashboard-layout"

export default function OperadoresPage() {
    const params = useParams()
    const eventId = params.id as string

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

    // Estados para criação
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [createForm, setCreateForm] = useState({
        nome: "",
        cpf: "",
        senha: ""
    })

    // Estados para exclusão
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [operatorToDelete, setOperatorToDelete] = useState<Operator | null>(null)

    const { data: operadores = [], isLoading: loadingOperadores } = useOperatorsByEvent({
        eventId,
        search: filtro.busca,
        sortBy: ordenacao.campo,
        sortOrder: ordenacao.direcao
    })
    const { data: eventos = [] } = useEventos()

    useEffect(() => {
        if (eventos && Array.isArray(eventos)) {
            const evento = eventos.find((e: any) => e.id === eventId)
            if (evento) {
                setNomeEvento(evento.name || "Evento")
            }
        }
    }, [eventos, eventId])

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
            cpf: operador.cpf,
            senha: operador.senha
        })
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

        if (!isValidCpf(editForm.cpf)) {
            toast.error("CPF inválido")
            return
        }

        setLoading(true)
        try {
            await apiClient.put(`/operadores/${operatorToEdit.id}`, {
                nome: editForm.nome,
                cpf: editForm.cpf,
                senha: editForm.senha,
                id_events: eventId
            })

            toast.success("Operador atualizado com sucesso!")
            setEditDialogOpen(false)
            setEditForm({ nome: "", cpf: "", senha: "" })
        } catch (error) {
            toast.error("Erro ao atualizar operador")
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

        if (!isValidCpf(createForm.cpf)) {
            toast.error("CPF inválido")
            return
        }

        setLoading(true)
        try {
            await apiClient.post("/operadores", {
                nome: createForm.nome,
                cpf: createForm.cpf,
                senha: createForm.senha,
                id_events: eventId
            })

            toast.success("Operador criado com sucesso!")
            setCreateDialogOpen(false)
            setCreateForm({ nome: "", cpf: "", senha: "" })
        } catch (error) {
            toast.error("Erro ao criar operador")
        } finally {
            setLoading(false)
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
            "Data de Criação": new Date().toLocaleDateString('pt-BR')
        }))

        const ws = XLSX.utils.json_to_sheet(dadosParaExportar)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Operadores")
        XLSX.writeFile(wb, `operadores-${nomeEvento}-${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const baixarModeloExcel = () => {
        const ws = XLSX.utils.json_to_sheet([
            { nome: "", cpf: "", senha: "" }
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, "modelo-operadores.xlsx")
    }

    const importarDoExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImportDialogLoading(true)
        try {
            const data = await file.arrayBuffer()
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

                operadoresImportados.push({
                    id: "",
                    nome: row.nome,
                    cpf: row.cpf,
                    senha: row.senha,
                    id_events: eventId,
                    acoes: []
                })
            }

            setRegistrosUnicos(operadoresImportados)
            setResumoImportacao({ importados: operadoresImportados, falhados })
            setResumoDialogOpen(true)
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
                await apiClient.post("/operadores", {
                    nome: operador.nome,
                    cpf: operador.cpf,
                    senha: operador.senha,
                    id_events: eventId
                })
            }

            toast.success(`${registrosUnicos.length} operadores importados com sucesso!`)
            setResumoDialogOpen(false)
        } catch (error) {
            toast.error("Erro ao importar operadores")
        } finally {
            setLoading(false)
        }
    }

    const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    if (loadingOperadores) {
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
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Operador
                        </Button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
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

                {/* Tabela */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-left font-medium text-gray-900">Nome</TableHead>
                                    <TableHead className="text-left font-medium text-gray-900">CPF</TableHead>
                                    <TableHead className="text-left font-medium text-gray-900">Ações</TableHead>
                                    <TableHead className="text-left font-medium text-gray-900">Operações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {operadores.length > 0 ? (
                                    operadores.map((operador) => (
                                        <TableRow key={operador.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <span className="text-sm font-medium text-blue-600">
                                                            {getInitials(operador.nome)}
                                                        </span>
                                                    </div>
                                                    <span className="text-gray-900">{capitalizeWords(operador.nome)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-700">{formatCPF(operador.cpf)}</TableCell>
                                            <TableCell>
                                                <div className="text-sm text-gray-500">
                                                    {operador.acoes?.length || 0} ações
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getBotaoAcao(operador)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                            Nenhum operador encontrado
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

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
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Operador</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <Input
                                    value={editForm.nome}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                                <Input
                                    value={editForm.cpf}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, cpf: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                <Input
                                    type="password"
                                    value={editForm.senha}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, senha: e.target.value }))}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => {
                                    setEditDialogOpen(false)
                                    setEditForm({ nome: "", cpf: "", senha: "" })
                                }}>
                                    Cancelar
                                </Button>
                                <Button onClick={salvarEdicao} disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal de Criação */}
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Novo Operador</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <Input
                                    value={createForm.nome}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, nome: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                                <Input
                                    value={createForm.cpf}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, cpf: e.target.value }))}
                                />
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
                                }}>
                                    Cancelar
                                </Button>
                                <Button onClick={salvarNovo} disabled={loading}>
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
                                <Button variant="outline" onClick={() => setResumoDialogOpen(false)}>
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
