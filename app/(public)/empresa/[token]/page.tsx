'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building, Users, Calendar, MapPin, Phone, Mail, User, Clock, CheckCircle, XCircle, Upload, FileSpreadsheet, Download, AlertCircle, Loader2, FileText, Check, X, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useParams } from "next/navigation"
import { getEmpresa } from "@/features/eventos/actions/get-empresas"
import { getEvent } from "@/features/eventos/actions/get-event"
import { getEventParticipantsByEvent } from "@/features/eventos/actions/get-event-participant"
import { updateEventParticipant } from "@/features/eventos/actions/update-event-participant"
import { useImportRequestsByEmpresa } from "@/features/eventos/api/query/use-import-requests"
import type { Empresa, EventParticipant, Event, ImportRequest } from "@/features/eventos/types"
import { apiClient } from "@/lib/api-client"
import { useClerk } from "@clerk/nextjs"
import * as XLSX from "xlsx"

interface DecodedToken {
    empresaId: string
    eventId: string
    timestamp: number
}

interface ImportData {
    nome: string
    cpf: string
    funcao: string
    empresa: string
    credencial: string
}

interface ProcessedImportData {
    fileName: string
    totalRows: number
    validRows: number
    invalidRows: number
    data: ImportData[]
    errors: Array<{ item: Record<string, unknown>; error: string; row: number }>
}

interface ImportRequestData {
    nome: string
    cpf: string
    funcao: string
    empresa: string
    credencial: string
}



export default function PublicEmpresaPage() {
    const [empresa, setEmpresa] = useState<Empresa | null>(null)
    const [event, setEvent] = useState<Event | null>(null)
    const [participants, setParticipants] = useState<EventParticipant[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedDay, setSelectedDay] = useState<string>("")
    const [editingParticipant, setEditingParticipant] = useState<string | null>(null)
    const [editingField, setEditingField] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<string>("")
    const [saving, setSaving] = useState(false)
    const [editingEmpresa, setEditingEmpresa] = useState<string | null>(null)
    const [empresaEditValue, setEmpresaEditValue] = useState<string>("")

    // Import states
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [processedData, setProcessedData] = useState<ProcessedImportData | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [dragActive, setDragActive] = useState(false)

    const { user } = useClerk()
    const isClerkUser = !!user

    const params = useParams()
    const token = params.token as string

    // Buscar histórico de importações da empresa
    const { data: importHistory, isLoading: loadingHistory } = useImportRequestsByEmpresa(
        empresa?.id || ""
    )





    // Decodificar token
    const decodeToken = (token: string): DecodedToken | null => {
        try {
            const decoded = atob(token)
            const [empresaId, eventId, timestamp] = decoded.split(':')
            return {
                empresaId,
                eventId,
                timestamp: parseInt(timestamp)
            }
        } catch (error) {
            console.error("Erro ao decodificar token:", error)
            return null
        }
    }

    // Verificar se o token é válido (não expirado - 7 dias)
    const isTokenValid = (timestamp: number) => {
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
        return Date.now() - timestamp < sevenDaysInMs
    }

    // Buscar dados da empresa
    const fetchEmpresaData = async (empresaId: string, eventId: string) => {
        try {
            // Buscar empresa
            const empresaData = await getEmpresa(empresaId)
            if (!empresaData) {
                setError("Empresa não encontrada")
                setLoading(false)
                return
            }
            setEmpresa(empresaData)

            // Buscar evento
            const eventData = await getEvent(eventId)
            if (!eventData) {
                setError("Evento não encontrado")
                setLoading(false)
                return
            }
            setEvent(eventData)

            // Buscar participantes da empresa
            const allParticipants = await getEventParticipantsByEvent(eventId)

            // Filtrar participantes da empresa
            const empresaParticipants = allParticipants.filter((p: EventParticipant) =>
                p.company?.toLowerCase() === empresaData.nome?.toLowerCase()
            )
            setParticipants(empresaParticipants)

            // Selecionar primeiro dia por padrão
            if (empresaData.days && empresaData.days.length > 0) {
                setSelectedDay(empresaData.days[0])
            }

        } catch (error) {
            console.error("Erro ao buscar dados:", error)
            setError("Erro ao carregar dados da empresa")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const decoded = decodeToken(token)
        if (!decoded) {
            setError("Token inválido")
            setLoading(false)
            return
        }

        if (!isTokenValid(decoded.timestamp)) {
            setError("Link expirado. Solicite um novo link de acesso.")
            setLoading(false)
            return
        }

        fetchEmpresaData(decoded.empresaId, decoded.eventId)
    }, [token])

    // Função para formatar data
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    // Função para obter período do dia
    const getDayPeriod = (day: string) => {
        if (!event) return ''

        const date = new Date(day)
        const setupStart = event.setupStartDate ? new Date(event.setupStartDate) : null
        const setupEnd = event.setupEndDate ? new Date(event.setupEndDate) : null
        const prepStart = event.preparationStartDate ? new Date(event.preparationStartDate) : null
        const prepEnd = event.preparationEndDate ? new Date(event.preparationEndDate) : null
        const finalStart = event.finalizationStartDate ? new Date(event.finalizationStartDate) : null
        const finalEnd = event.finalizationEndDate ? new Date(event.finalizationEndDate) : null

        if (setupStart && setupEnd && date >= setupStart && date <= setupEnd) {
            return 'Montagem'
        } else if (prepStart && prepEnd && date >= prepStart && date <= prepEnd) {
            return 'Evento'
        } else if (finalStart && finalEnd && date >= finalStart && date <= finalEnd) {
            return 'Desmontagem'
        }

        return 'Evento'
    }

    // Função para formatar status da importação
    const getImportStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
            case 'approved':
                return { label: 'Aprovada', color: 'bg-green-100 text-green-800 border-green-200' }
            case 'rejected':
                return { label: 'Rejeitada', color: 'bg-red-100 text-red-800 border-red-200' }
            case 'completed':
                return { label: 'Concluída', color: 'bg-blue-100 text-blue-800 border-blue-200' }
            default:
                return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800 border-gray-200' }
        }
    }

    // Filtrar participantes por dia selecionado
    const participantsByDay = participants.filter(p =>
        p.daysWork?.includes(selectedDay)
    )

    // Função para iniciar edição de campo
    const startEditing = (participantId: string, field: string, currentValue: string) => {
        if (!isClerkUser) return
        setEditingParticipant(participantId)
        setEditingField(field)
        setEditValue(currentValue || "")
    }

    // Função para salvar edição
    const saveEdit = async (participantId: string, field: string) => {
        if (!isClerkUser || !editValue.trim()) return

        setSaving(true)
        try {
            const participant = participants.find(p => p.id === participantId)
            if (!participant) return

            const updatedData = {
                ...participant,
                [field]: editValue.trim()
            }

            const updated = await updateEventParticipant(participantId, updatedData)
            if (updated) {
                setParticipants(prev =>
                    prev.map(p => p.id === participantId ? updated : p)
                )
                toast.success("Informação atualizada com sucesso!")
            }
        } catch (error) {
            console.error("Erro ao atualizar participante:", error)
            toast.error("Erro ao atualizar informação")
        } finally {
            setSaving(false)
            setEditingParticipant(null)
            setEditingField(null)
            setEditValue("")
        }
    }

    // Função para cancelar edição
    const cancelEdit = () => {
        setEditingParticipant(null)
        setEditingField(null)
        setEditValue("")
    }

    // Função para iniciar edição de campo da empresa
    const startEditingEmpresa = (field: string, currentValue: string) => {
        if (!isClerkUser) return
        setEditingEmpresa(field)
        setEmpresaEditValue(currentValue || "")
    }

    // Função para salvar edição da empresa
    const saveEmpresaEdit = async (field: string) => {
        if (!isClerkUser || !empresa) return

        setSaving(true)
        try {
            const updatedData = {
                ...empresa,
                [field]: empresaEditValue.trim()
            }

            const response = await apiClient.put(`/empresas/${empresa.id}`, updatedData)
            if (response.data) {
                setEmpresa(response.data)
                toast.success("Informação da empresa atualizada com sucesso!")
            }
        } catch (error) {
            console.error("Erro ao atualizar empresa:", error)
            toast.error("Erro ao atualizar informação da empresa")
        } finally {
            setSaving(false)
            setEditingEmpresa(null)
            setEmpresaEditValue("")
        }
    }

    // Função para cancelar edição da empresa
    const cancelEmpresaEdit = () => {
        setEditingEmpresa(null)
        setEmpresaEditValue("")
    }

    // Função para renderizar campo editável da empresa
    const renderEditableEmpresaField = (field: string, label: string, icon: React.ReactNode, value: string) => {
        const isEditing = editingEmpresa === field

        if (!isEditing) {
            return (
                <div
                    className={`flex items-center space-x-3 ${isClerkUser ? 'cursor-pointer hover:bg-gray-100 p-2 rounded' : ''}`}
                    onClick={() => isClerkUser && startEditingEmpresa(field, value)}
                >
                    {icon}
                    <span className="text-sm text-gray-700">
                        {value || "Não informado"}
                    </span>
                    {isClerkUser && (
                        <span className="text-xs text-blue-500">(editar)</span>
                    )}
                </div>
            )
        }

        return (
            <div className="flex items-center space-x-3">
                {icon}
                <input
                    type="text"
                    value={empresaEditValue}
                    onChange={(e) => setEmpresaEditValue(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Digite ${label.toLowerCase()}`}
                    autoFocus
                />
                <button
                    onClick={() => saveEmpresaEdit(field)}
                    disabled={saving}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                >
                    {saving ? "Salvando..." : "✓"}
                </button>
                <button
                    onClick={cancelEmpresaEdit}
                    className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                >
                    ✕
                </button>
            </div>
        )
    }

    // Função para renderizar campo editável
    const renderEditableField = (participant: EventParticipant, field: string, label: string, icon: React.ReactNode) => {
        const value = participant[field as keyof EventParticipant] as string || ""
        const isEditing = editingParticipant === participant.id && editingField === field

        if (!isEditing) {
            return (
                <div
                    className={`flex items-center space-x-2 ${isClerkUser && !value ? 'cursor-pointer hover:bg-gray-100 p-1 rounded' : ''}`}
                    onClick={() => isClerkUser && !value && startEditing(participant.id, field, value)}
                >
                    {icon}
                    <span className="text-sm text-gray-600">
                        {value || (isClerkUser ? "Clique para adicionar" : "Não informado")}
                    </span>
                    {isClerkUser && !value && (
                        <span className="text-xs text-blue-500">(editar)</span>
                    )}
                </div>
            )
        }

        return (
            <div className="flex items-center space-x-2">
                {icon}
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Digite ${label.toLowerCase()}`}
                    autoFocus
                />
                <button
                    onClick={() => saveEdit(participant.id, field)}
                    disabled={saving}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                >
                    {saving ? "Salvando..." : "✓"}
                </button>
                <button
                    onClick={cancelEdit}
                    className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                >
                    ✕
                </button>
            </div>
        )
    }

    // Funções de importação
    const downloadTemplate = () => {
        const templateData = [
            {
                nome: "João Silva",
                cpf: "12345678900",
                funcao: "Desenvolvedor",
                empresa: "Empresa ABC",
                credencial: "CREDENCIAL-001",
            }
        ]

        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, `modelo-colaboradores-${empresa?.nome || 'empresa'}-${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    const validateImportData = (data: Record<string, unknown>): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []

        if (!data.nome || data.nome.toString().trim().length < 2) {
            errors.push("Nome é obrigatório e deve ter pelo menos 2 caracteres")
        }

        if (!data.cpf || data.cpf.toString().trim() === "") {
            errors.push("CPF é obrigatório")
        }

        if (!data.funcao || data.funcao.toString().trim().length < 2) {
            errors.push("Função é obrigatória e deve ter pelo menos 2 caracteres")
        }

        if (!data.empresa || data.empresa.toString().trim().length < 2) {
            errors.push("Empresa é obrigatória e deve ter pelo menos 2 caracteres")
        }

        if (!data.credencial || data.credencial.toString().trim() === "") {
            errors.push("Credencial é obrigatória")
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    }

    const processExcelFile = async (file: File): Promise<ProcessedImportData> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: "array" })
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

                    const result: ProcessedImportData = {
                        fileName: file.name,
                        totalRows: jsonData.length,
                        validRows: 0,
                        invalidRows: 0,
                        data: [],
                        errors: [],
                    }

                    jsonData.forEach((row, index) => {
                        const rowNumber = index + 2
                        const validation = validateImportData(row)

                        if (!validation.isValid) {
                            result.errors.push({
                                item: row,
                                error: validation.errors.join(", "),
                                row: rowNumber,
                            })
                            result.invalidRows++
                            return
                        }

                        const importData: ImportData = {
                            nome: String(row.nome || '').trim(),
                            cpf: String(row.cpf || '').trim(),
                            funcao: String(row.funcao || '').trim(),
                            empresa: String(row.empresa || '').trim(),
                            credencial: String(row.credencial || '').trim(),
                        }

                        result.data.push(importData)
                        result.validRows++
                    })

                    resolve(result)
                } catch (error) {
                    reject(new Error("Erro ao processar arquivo Excel"))
                }
            }
            reader.onerror = () => reject(new Error("Erro ao ler arquivo"))
            reader.readAsArrayBuffer(file)
        })
    }

    const handleFileUpload = async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)")
            return
        }

        setIsProcessing(true)
        try {
            const processed = await processExcelFile(file)
            setProcessedData(processed)
            setUploadedFile(file)
            toast.success("Arquivo processado com sucesso!")
        } catch (error) {
            toast.error("Erro ao processar arquivo")
            console.error(error)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleSubmitImport = async () => {
        if (!processedData || !empresa || !event) return

        setIsSubmitting(true)
        try {
            const decoded = decodeToken(token)
            if (!decoded) {
                toast.error("Token inválido")
                return
            }

            const importRequestData = {
                eventId: decoded.eventId,
                empresaId: decoded.empresaId,
                fileName: processedData.fileName,
                totalRows: processedData.totalRows,
                validRows: processedData.validRows,
                invalidRows: processedData.invalidRows,
                duplicateRows: 0,
                data: processedData.data,
                errors: processedData.errors,
                duplicates: [],
                missingCredentials: [],
                missingCompanies: [],
                requestedBy: empresa.nome || "Empresa"
            }

            const response = await apiClient.post('/import-requests', importRequestData)

            if (response.data) {
                toast.success("Solicitação de importação enviada com sucesso! Aguarde a aprovação do administrador.")
                setProcessedData(null)
                setUploadedFile(null)
            }
        } catch (error) {
            console.error("Erro ao enviar solicitação:", error)
            toast.error("Erro ao enviar solicitação de importação")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleFileUpload(e.dataTransfer.files[0])
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dados da empresa...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Button
                        onClick={() => window.close()}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Fechar
                    </Button>
                </div>
            </div>
        )
    }

    if (!empresa || !event) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Empresa não encontrada</h1>
                    <p className="text-gray-600">A empresa solicitada não foi encontrada.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                <Building className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{empresa.nome}</h1>
                                <p className="text-gray-600">{event.name}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Acesso Público</p>
                            <p className="text-xs text-gray-400">
                                Expira em {formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())}
                            </p>
                            {isClerkUser && (
                                <div className="mt-2">
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                        Modo Edição Ativo
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Informações da Empresa */}
                    <div className="lg:col-span-1">
                        <Card className="h-fit">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Building className="h-5 w-5" />
                                    <span>Informações da Empresa</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {renderEditableEmpresaField('cnpj', 'CNPJ', <Badge variant="outline" className="text-xs">CNPJ</Badge>, empresa.cnpj || "")}

                                {renderEditableEmpresaField('email', 'Email', <Mail className="h-4 w-4 text-gray-400" />, empresa.email || "")}

                                {renderEditableEmpresaField('telefone', 'Telefone', <Phone className="h-4 w-4 text-gray-400" />, empresa.telefone || "")}

                                {renderEditableEmpresaField('endereco', 'Endereço', <MapPin className="h-4 w-4 text-gray-400" />, empresa.endereco || "")}

                                <div className="flex items-start space-x-3">
                                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                    <div className="text-sm text-gray-700">
                                        <p>{empresa.cidade && empresa.estado ? `${empresa.cidade} - ${empresa.estado}` : "Cidade/Estado: Não informado"}</p>
                                        <p>{empresa.cep ? `CEP: ${empresa.cep}` : "CEP: Não informado"}</p>
                                    </div>
                                </div>

                                {renderEditableEmpresaField('responsavel', 'Responsável', <User className="h-4 w-4 text-gray-400" />, empresa.responsavel || "")}

                                <div className="pt-4 border-t">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Observações</h4>
                                    {renderEditableEmpresaField('observacoes', 'Observações', <span className="text-sm text-gray-600">•</span>, empresa.observacoes || "")}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dias de Trabalho */}
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Calendar className="h-5 w-5" />
                                    <span>Dias de Trabalho</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {empresa.days && empresa.days.length > 0 ? (
                                        empresa.days.map((day, index) => (
                                            <div
                                                key={index}
                                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedDay === day
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-200 hover:border-purple-300'
                                                    }`}
                                                onClick={() => setSelectedDay(day)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {formatDate(day)}
                                                    </span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {getDayPeriod(day)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">Nenhum dia configurado</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>


                    </div>

                    {/* Área Principal com Abas */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="colaboradores" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 gap-8">
                                <TabsTrigger value="colaboradores" className="flex items-center justify-center space-x-2 p-4 data-[state=active]:bg-[#610e5c] data-[state=active]:text-white rounded-md">
                                    <Users className="h-4 w-4" />
                                    <span>Colaboradores</span>
                                </TabsTrigger>
                                <TabsTrigger value="importar" className="flex items-center justify-center space-x-2 p-4 data-[state=active]:bg-[#610e5c] data-[state=active]:text-white rounded-md">
                                    <Upload className="h-4 w-4" />
                                    <span>Importar</span>
                                </TabsTrigger>
                                <TabsTrigger value="historico" className="flex items-center justify-center space-x-2 p-4 data-[state=active]:bg-[#610e5c] data-[state=active]:text-white rounded-md">
                                    <FileText className="h-4 w-4" />
                                    <span>Histórico</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* Aba Colaboradores */}
                            <TabsContent value="colaboradores" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <Users className="h-5 w-5" />
                                            <span>Colaboradores</span>
                                            {selectedDay && (
                                                <Badge variant="outline" className="ml-2">
                                                    {formatDate(selectedDay)} - {getDayPeriod(selectedDay)}
                                                </Badge>
                                            )}
                                            {isClerkUser && (
                                                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-600 border-blue-200">
                                                    Edição Ativa
                                                </Badge>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedDay ? (
                                            participantsByDay.length > 0 ? (
                                                <div className="space-y-4">
                                                    {participantsByDay.map((participant) => (
                                                        <div
                                                            key={participant.id}
                                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                                                        >
                                                            <div className="flex items-center space-x-4">
                                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                                                    <User className="h-5 w-5 text-white" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-medium text-gray-900">
                                                                        {participant.name}
                                                                    </h3>
                                                                    <p className="text-sm text-gray-600">
                                                                        {participant.role || 'Colaborador'}
                                                                    </p>
                                                                    {participant.cpf && (
                                                                        <p className="text-xs text-gray-500">
                                                                            CPF: {participant.cpf}
                                                                        </p>
                                                                    )}
                                                                    {isClerkUser && (
                                                                        <p className="text-xs text-blue-500">
                                                                            Clique nos campos vazios para editar
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center space-x-4">
                                                                {renderEditableField(participant, 'email', 'Email', <Mail className="h-4 w-4 text-gray-400" />)}
                                                                {renderEditableField(participant, 'phone', 'Telefone', <Phone className="h-4 w-4 text-gray-400" />)}

                                                                <div className="flex items-center space-x-2">
                                                                    {participant.checkIn ? (
                                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                                    ) : (
                                                                        <Clock className="h-4 w-4 text-yellow-500" />
                                                                    )}
                                                                    <span className="text-xs text-gray-500">
                                                                        {participant.checkIn ? 'Check-in realizado' : 'Aguardando check-in'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                        Nenhum colaborador encontrado
                                                    </h3>
                                                    <p className="text-gray-600">
                                                        Não há colaboradores registrados para este dia.
                                                    </p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="text-center py-8">
                                                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    Selecione um dia
                                                </h3>
                                                <p className="text-gray-600">
                                                    Escolha um dia de trabalho para ver os colaboradores.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Estatísticas */}
                                {selectedDay && participantsByDay.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Estatísticas do Dia</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {participantsByDay.length}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Total</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {participantsByDay.filter(p => p.checkIn).length}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Check-in</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-purple-600">
                                                        {participantsByDay.filter(p => p.email).length}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Com Email</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-orange-600">
                                                        {participantsByDay.filter(p => p.phone).length}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Com Telefone</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            {/* Aba Importar */}
                            <TabsContent value="importar" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <FileSpreadsheet className="h-5 w-5" />
                                            <span>Importar Colaboradores</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Instruções */}
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-blue-900 mb-2">Instruções para Importação</h4>
                                            <div className="text-sm text-blue-800 space-y-1">
                                                <p><strong>Colunas obrigatórias:</strong> nome, cpf, funcao, empresa, credencial</p>
                                                <p><strong>Formato:</strong> Excel (.xlsx ou .xls)</p>
                                                <p><strong>Limite:</strong> até 1000 colaboradores por importação</p>
                                                <p><strong>Processo:</strong> A solicitação será enviada para aprovação do administrador</p>
                                            </div>
                                        </div>

                                        {/* Download do modelo */}
                                        <div className="flex justify-center">
                                            <Button onClick={downloadTemplate} variant="outline" className="bg-transparent">
                                                <Download className="h-4 w-4 mr-2" />
                                                Baixar Modelo
                                            </Button>
                                        </div>

                                        {/* Área de upload */}
                                        <div
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                                                }`}
                                        >
                                            <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                {uploadedFile ? "Arquivo carregado" : "Arraste e solte seu arquivo Excel aqui"}
                                            </h3>
                                            <p className="text-gray-600 mb-4">
                                                {uploadedFile ? uploadedFile.name : "Ou clique para selecionar um arquivo"}
                                            </p>
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                                className="hidden"
                                                id="file-upload"
                                            />
                                            <label
                                                htmlFor="file-upload"
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Processando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Selecionar Arquivo
                                                    </>
                                                )}
                                            </label>
                                        </div>

                                        {/* Resultado do processamento */}
                                        {processedData && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                                        <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                                                        <div className="text-2xl font-bold text-green-600">{processedData.validRows}</div>
                                                        <div className="text-sm text-gray-600">Válidos</div>
                                                    </div>
                                                    <div className="text-center p-4 bg-red-50 rounded-lg">
                                                        <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                                                        <div className="text-2xl font-bold text-red-600">{processedData.invalidRows}</div>
                                                        <div className="text-sm text-gray-600">Inválidos</div>
                                                    </div>
                                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                        <FileText className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                                                        <div className="text-2xl font-bold text-blue-600">{processedData.totalRows}</div>
                                                        <div className="text-sm text-gray-600">Total</div>
                                                    </div>
                                                </div>

                                                {/* Erros detalhados */}
                                                {processedData.errors.length > 0 && (
                                                    <div className="bg-red-50 p-4 rounded-lg">
                                                        <h4 className="font-medium text-red-900 mb-2">Erros encontrados:</h4>
                                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                                            {processedData.errors.map((error, index) => (
                                                                <div key={index} className="text-sm text-red-800">
                                                                    <strong>Linha {error.row}:</strong> {error.error}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Botão de envio */}
                                                <div className="flex justify-center">
                                                    <Button
                                                        onClick={handleSubmitImport}
                                                        disabled={isSubmitting || processedData.validRows === 0}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        {isSubmitting ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Enviando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4 mr-2" />
                                                                Enviar Solicitação ({processedData.validRows} colaboradores)
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Aba Histórico */}
                            <TabsContent value="historico" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <FileText className="h-5 w-5" />
                                            <span>Histórico de Importações</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {loadingHistory ? (
                                            <div className="text-center py-8">
                                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                                                <p className="text-gray-600">Carregando histórico...</p>
                                            </div>
                                        ) : importHistory && importHistory.length > 0 ? (
                                            <div className="space-y-4">
                                                {importHistory.map((importReq) => {
                                                    const statusInfo = getImportStatusInfo(importReq.status)
                                                    return (
                                                        <div key={importReq.id} className="border rounded-lg p-4 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-2">
                                                                    <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                                                                    <span className="font-medium text-sm">{importReq.fileName}</span>
                                                                </div>
                                                                <Badge className={`text-xs ${statusInfo.color}`}>
                                                                    {statusInfo.label}
                                                                </Badge>
                                                            </div>

                                                            {/* Informações do evento */}
                                                            {importReq.event && (
                                                                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                                    <span className="font-medium">Evento:</span> {importReq.event.name || 'N/A'}
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                                                                <div>
                                                                    <span className="font-medium">Total:</span> {importReq.totalRows ?? 'N/A'}
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium">Válidos:</span> {importReq.validRows ?? 'N/A'}
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium">Inválidos:</span> {importReq.invalidRows ?? 'N/A'}
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium">Duplicados:</span> {importReq.duplicateRows ?? 'N/A'}
                                                                </div>
                                                            </div>



                                                            <div className="text-xs text-gray-500">
                                                                <div>Solicitado em: {formatDate(importReq.createdAt)}</div>
                                                                {importReq.approvedAt && (
                                                                    <div>Processado em: {formatDate(importReq.approvedAt)}</div>
                                                                )}
                                                                {importReq.approvedBy && (
                                                                    <div>Aprovado por: {importReq.approvedBy}</div>
                                                                )}
                                                            </div>

                                                            {/* Dados da importação (expandível) */}
                                                            {importReq.data && Array.isArray(importReq.data) && importReq.data.length > 0 && (
                                                                <details className="text-xs">
                                                                    <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                                                                        Ver dados importados ({importReq.data.length} colaboradores)
                                                                    </summary>
                                                                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                                                        {importReq.data.slice(0, 5).map((item: ImportRequestData, index: number) => (
                                                                            <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                                                                                <div><strong>Nome:</strong> {item.nome || 'N/A'}</div>
                                                                                <div><strong>CPF:</strong> {item.cpf || 'N/A'}</div>
                                                                                <div><strong>Função:</strong> {item.funcao || 'N/A'}</div>
                                                                                <div><strong>Credencial:</strong> {item.credencial || 'N/A'}</div>
                                                                            </div>
                                                                        ))}
                                                                        {importReq.data.length > 5 && (
                                                                            <div className="text-gray-500 italic">
                                                                                ... e mais {importReq.data.length - 5} colaboradores
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </details>
                                                            )}

                                                            {importReq.status === 'rejected' && importReq.notes && (
                                                                <div className="bg-red-50 p-3 rounded text-xs text-red-800">
                                                                    <strong>Motivo da rejeição:</strong> {importReq.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    Nenhuma importação encontrada
                                                </h3>
                                                <p className="text-gray-600">
                                                    Ainda não foram realizadas solicitações de importação.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    )
} 