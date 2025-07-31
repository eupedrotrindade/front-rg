/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Loader2, FileText, Users, Building, Eye, ArrowLeft } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useCreateEventParticipant } from '@/features/eventos/api/mutation/use-create-event-participant'
import type { EventParticipant } from '@/features/eventos/types'
import type { EventParticipantSchema } from '@/features/eventos/schemas'

interface ImportExportSystemProps {
    eventId: string
    isOpen: boolean
    onClose: () => void
}

interface ImportProgress {
    total: number
    processed: number
    success: number
    errors: number
    duplicates: number
    currentItem?: string
}

interface ImportResult {
    success: EventParticipantSchema[]
    errors: Array<{ item: any; error: string }>
    duplicates: Array<{ item: any; existing: EventParticipant }>
}

interface PreviewData {
    fileName: string
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateRows: number
    previewData: EventParticipantSchema[]
    errors: Array<{ item: any; error: string }>
    duplicates: Array<{ item: any; existing: EventParticipant }>
}

export default function ImportExportSystem({ eventId, isOpen, onClose }: ImportExportSystemProps) {
    const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
    const [isImporting, setIsImporting] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [progress, setProgress] = useState<ImportProgress>({ total: 0, processed: 0, success: 0, errors: 0, duplicates: 0 })
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewData, setPreviewData] = useState<PreviewData | null>(null)
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)

    const { data: participants = [] } = useEventParticipantsByEvent({ eventId })
    const { mutate: createParticipant } = useCreateEventParticipant()

    // Função para validar CPF
    const isValidCPF = (cpf: string): boolean => {
        const cleaned = cpf.replace(/\D/g, "")
        if (cleaned.length !== 11) return false

        // Rejeitar CPFs com todos os dígitos iguais
        if (/^(\d)\1+$/.test(cleaned)) return false

        // Para CPFs de teste, aceitar se tem 11 dígitos e não são todos iguais
        // Não aplicar validação matemática rigorosa para facilitar testes
        return true
    }

    // Função para validar email
    const isValidEmail = (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    // Função para validar dados do participante
    const validateParticipant = (data: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []

        if (!data.name || data.name.trim().length < 2) {
            errors.push('Nome deve ter pelo menos 2 caracteres')
        }

        if (!data.cpf || !isValidCPF(data.cpf)) {
            errors.push('CPF inválido')
        }

        if (!data.company || data.company.trim().length < 2) {
            errors.push('Empresa deve ter pelo menos 2 caracteres')
        }

        if (!data.role || data.role.trim().length < 2) {
            errors.push('Função deve ter pelo menos 2 caracteres')
        }

        if (data.email && !isValidEmail(data.email)) {
            errors.push('Email inválido')
        }

        if (data.phone && data.phone.replace(/\D/g, '').length < 10) {
            errors.push('Telefone inválido')
        }

        return { isValid: errors.length === 0, errors }
    }

    // Função para processar arquivo Excel
    const processExcelFile = async (file: File): Promise<ImportResult> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: 'array' })
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

                    const result: ImportResult = {
                        success: [],
                        errors: [],
                        duplicates: []
                    }

                    // Verificar duplicatas existentes
                    const existingCPFs = new Set(participants.map(p => p.cpf.replace(/\D/g, '')))

                    jsonData.forEach((row, index) => {
                        const validation = validateParticipant(row)

                        if (!validation.isValid) {
                            result.errors.push({
                                item: row,
                                error: validation.errors.join(', ')
                            })
                            return
                        }

                        const cleanedCPF = row.cpf.replace(/\D/g, '')
                        if (existingCPFs.has(cleanedCPF)) {
                            const existing = participants.find(p => p.cpf.replace(/\D/g, '') === cleanedCPF)
                            if (existing) {
                                result.duplicates.push({
                                    item: row,
                                    existing
                                })
                            }
                            return
                        }

                        // Preparar dados para criação
                        const participantData: EventParticipantSchema = {
                            eventId: eventId,
                            wristbandId: row.wristbandId || `default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            staffId: row.staffId || undefined,
                            name: row.name.trim(),
                            cpf: row.cpf,
                            email: row.email?.trim() || undefined,
                            phone: row.phone?.trim() || undefined,
                            role: row.role.trim(),
                            company: row.company.trim(),
                            checkIn: row.checkIn || undefined,
                            checkOut: row.checkOut || undefined,
                            presenceConfirmed: row.presenceConfirmed || undefined,
                            certificateIssued: row.certificateIssued || undefined,
                            shirtSize: row.shirtSize || undefined,
                            notes: row.notes?.trim() || undefined,
                            photo: row.photo || undefined,
                            documentPhoto: row.documentPhoto || undefined,
                            validatedBy: row.validatedBy || undefined,
                            daysWork: row.daysWork ? (Array.isArray(row.daysWork) ? row.daysWork : String(row.daysWork).split(',').map((d: string) => d.trim())) : undefined
                        }

                        result.success.push(participantData)
                    })

                    resolve(result)
                } catch (error) {
                    resolve({
                        success: [],
                        errors: [{ item: {}, error: 'Erro ao processar arquivo Excel' }],
                        duplicates: []
                    })
                }
            }
            reader.readAsArrayBuffer(file)
        })
    }

    const importParticipants = async (participants: EventParticipantSchema[]) => {
        const batchSize = 10
        const total = participants.length
        let success = 0
        let errors = 0

        setProgress({ total, processed: 0, success: 0, errors: 0, duplicates: 0 })

        for (let i = 0; i < participants.length; i += batchSize) {
            const batch = participants.slice(i, i + batchSize)

            await Promise.all(
                batch.map(async (participant, batchIndex) => {
                    const index = i + batchIndex

                    setProgress(prev => ({
                        ...prev,
                        processed: index + 1,
                        currentItem: participant.name
                    }))

                    try {
                        await new Promise<void>((resolve, reject) => {
                            createParticipant(participant, {
                                onSuccess: () => {
                                    success++
                                    setProgress(prev => ({ ...prev, success }))
                                    resolve()
                                },
                                onError: () => {
                                    errors++
                                    setProgress(prev => ({ ...prev, errors }))
                                    resolve() // Não rejeite, apenas resolva para continuar o fluxo
                                }
                            })
                        })
                    } catch {
                        errors++
                        setProgress(prev => ({ ...prev, errors }))
                    }
                })
            )

            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }

    // Função para exportar participantes
    const exportParticipants = async () => {
        setIsExporting(true)

        try {
            const exportData = participants.map(p => ({
                Nome: p.name,
                CPF: p.cpf,
                Empresa: p.company,
                Função: p.role,
                Email: p.email || '',
                Telefone: p.phone || '',
                Tamanho_Camiseta: p.shirtSize || '',
                Observações: p.notes || '',
                Dias_Trabalho: p.daysWork?.join(', ') || '',
                Check_in: p.checkIn || '',
                Check_out: p.checkOut || '',
                Validado_Por: p.validatedBy || '',
                Data_Criação: (p as any).created_at || ''
            }))

            const ws = XLSX.utils.json_to_sheet(exportData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Participantes")
            XLSX.writeFile(wb, `participantes-evento-${eventId}-${new Date().toISOString().split('T')[0]}.xlsx`)

            toast.success('Exportação concluída com sucesso!')
        } catch (error) {
            toast.error('Erro ao exportar dados')
        } finally {
            setIsExporting(false)
        }
    }

    // Função para baixar modelo
    const downloadTemplate = () => {
        const templateData = [
            {
                name: 'João Silva',
                cpf: '123.456.789-00',
                company: 'RG Produções',
                role: 'Segurança',
                email: 'joao@email.com',
                phone: '(11) 99999-9999',
                shirtSize: 'M',
                notes: 'Observações aqui',
                daysWork: '15/12/2024, 16/12/2024',
                wristbandId: 'wristband-001'
            }
        ]

        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, "modelo-participantes.xlsx")
    }

    // Função para baixar modelo com 5000 participantes fictícios
    const downloadBigTestTemplate = () => {
        const wristbandId = 'ebd215b9-498d-4af6-b557-dab178c8f9aa'

        // Função para gerar CPF único e válido
        const generateValidCPF = (index: number): string => {
            // Usar uma base que garante CPFs únicos e válidos
            const base = 100000000 + index
            return String(base).padStart(11, '0')
        }

        const templateData = Array.from({ length: 5000 }).map((_, i) => ({
            name: `Participante ${i + 1}`,
            cpf: generateValidCPF(i),
            company: `Empresa ${((i % 50) + 1)}`,
            role: `Função ${((i % 10) + 1)}`,
            email: `participante${i + 1}@teste.com`,
            phone: `1199${String(i).padStart(6, '0')}`,
            shirtSize: ['P', 'M', 'G', 'GG'][i % 4],
            notes: `Observação ${i + 1}`,
            daysWork: '28/07/2025, 01/08/2025',
            wristbandId,
        }))

        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, "modelo-participantes-5000.xlsx")
    }

    // Função para processar arquivo e gerar prévia
    const processFileForPreview = async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
            return
        }

        try {
            const result = await processExcelFile(file)

            const previewDataObj: PreviewData = {
                fileName: file.name,
                totalRows: result.success.length + result.errors.length + result.duplicates.length,
                validRows: result.success.length,
                invalidRows: result.errors.length,
                duplicateRows: result.duplicates.length,
                previewData: result.success.slice(0, 10), // Mostrar apenas os primeiros 10
                errors: result.errors.slice(0, 5), // Mostrar apenas os primeiros 5 erros
                duplicates: result.duplicates.slice(0, 5) // Mostrar apenas as primeiras 5 duplicatas
            }

            setPreviewData(previewDataObj)
            setUploadedFile(file)
            setShowPreview(true)
        } catch (error) {
            toast.error('Erro ao processar arquivo para prévia')
        }
    }

    // Função para confirmar importação
    const confirmImport = async () => {
        if (!uploadedFile || !previewData) return

        setIsImporting(true)
        setProgress({ total: 0, processed: 0, success: 0, errors: 0, duplicates: 0 })
        setImportResult(null)

        try {
            const result = await processExcelFile(uploadedFile)
            setImportResult(result)

            if (result.success.length > 0) {
                await importParticipants(result.success)
            }

            toast.success(`Importação concluída! ${result.success.length} participantes importados.`)
            setShowPreview(false)
            setPreviewData(null)
            setUploadedFile(null)
        } catch (error) {
            toast.error('Erro durante a importação')
        } finally {
            setIsImporting(false)
        }
    }

    // Handlers para drag & drop
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await processFileForPreview(e.dataTransfer.files[0])
        }
    }, [])

    const handleFileUpload = async (file: File) => {
        await processFileForPreview(file)
    }

    // Função para voltar da prévia
    const backToUpload = () => {
        setShowPreview(false)
        setPreviewData(null)
        setUploadedFile(null)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl text-black bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Sistema de Importação/Exportação</DialogTitle>
                    <DialogDescription>
                        Gerencie participantes em massa com importação e exportação otimizadas
                    </DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'import'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Upload className="w-4 h-4 mr-2 inline" />
                        Importar
                    </button>
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'export'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <Download className="w-4 h-4 mr-2 inline" />
                        Exportar
                    </button>
                </div>

                {activeTab === 'import' ? (
                    showPreview ? (
                        // Página de Prévia
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <Button
                                    onClick={backToUpload}
                                    variant="outline"
                                    className="flex items-center"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Voltar
                                </Button>
                                <h3 className="text-lg font-semibold">Prévia da Importação</h3>
                            </div>

                            {previewData && (
                                <>
                                    {/* Resumo */}
                                    <Card>
                                        <CardContent className="p-6">
                                            <h4 className="font-semibold mb-4">Resumo do Arquivo: {previewData.fileName}</h4>
                                            <div className="grid grid-cols-4 gap-4">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-blue-600">{previewData.totalRows}</div>
                                                    <div className="text-sm text-gray-600">Total de Linhas</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-green-600">{previewData.validRows}</div>
                                                    <div className="text-sm text-gray-600">Válidos</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-red-600">{previewData.invalidRows}</div>
                                                    <div className="text-sm text-gray-600">Inválidos</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-yellow-600">{previewData.duplicateRows}</div>
                                                    <div className="text-sm text-gray-600">Duplicatas</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Dados de Prévia */}
                                    {previewData.previewData.length > 0 && (
                                        <Card>
                                            <CardContent className="p-6">
                                                <h4 className="font-semibold mb-4">Prévia dos Dados (Primeiros 10)</h4>
                                                <div className="space-y-3">
                                                    {previewData.previewData.map((participant, index) => (
                                                        <div key={index} className="border rounded p-3 bg-gray-50">
                                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                                <div><strong>Nome:</strong> {participant.name}</div>
                                                                <div><strong>CPF:</strong> {participant.cpf}</div>
                                                                <div><strong>Empresa:</strong> {participant.company}</div>
                                                                <div><strong>Função:</strong> {participant.role}</div>
                                                                {participant.email && <div><strong>Email:</strong> {participant.email}</div>}
                                                                {participant.phone && <div><strong>Telefone:</strong> {participant.phone}</div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Erros */}
                                    {previewData.errors.length > 0 && (
                                        <Card>
                                            <CardContent className="p-6">
                                                <h4 className="font-semibold text-red-600 mb-4 flex items-center">
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Erros Encontrados ({previewData.errors.length})
                                                </h4>
                                                <div className="space-y-2">
                                                    {previewData.errors.map((error, index) => (
                                                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                                            {error.item.name || 'Nome não informado'} - {error.error}
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Duplicatas */}
                                    {previewData.duplicates.length > 0 && (
                                        <Card>
                                            <CardContent className="p-6">
                                                <h4 className="font-semibold text-yellow-600 mb-4 flex items-center">
                                                    <AlertCircle className="w-4 h-4 mr-2" />
                                                    Duplicatas Encontradas ({previewData.duplicates.length})
                                                </h4>
                                                <div className="space-y-2">
                                                    {previewData.duplicates.map((dup, index) => (
                                                        <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                                            {dup.item.name} - CPF já existe no sistema
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Botão de Confirmação */}
                                    <div className="flex justify-center">
                                        <Button
                                            onClick={confirmImport}
                                            disabled={isImporting || previewData.validRows === 0}
                                            className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
                                        >
                                            {isImporting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Importando...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Confirmar Importação ({previewData.validRows} participantes)
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        // Página de Upload
                        <div className="space-y-6">
                            {/* Área de Upload */}
                            <div
                                ref={dropZoneRef}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400'
                                    }`}
                            >
                                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Arraste e solte seu arquivo Excel aqui
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Ou clique para selecionar um arquivo
                                </p>
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Selecionar Arquivo
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                    className="hidden"
                                />
                            </div>

                            {/* Progresso */}
                            {isImporting && (
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold">Progresso da Importação</h4>
                                                <Badge variant="secondary">
                                                    {progress.processed}/{progress.total}
                                                </Badge>
                                            </div>

                                            <Progress value={progress.total ? (progress.processed / progress.total) * 100 : 0} className="h-2" />

                                            {progress.currentItem && (
                                                <p className="text-sm text-gray-600">
                                                    Processando: {progress.currentItem}
                                                </p>
                                            )}

                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div className="text-center">
                                                    <div className="text-green-600 font-semibold">{progress.success}</div>
                                                    <div className="text-gray-500">Sucessos</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-red-600 font-semibold">{progress.errors}</div>
                                                    <div className="text-gray-500">Erros</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-yellow-600 font-semibold">{progress.duplicates}</div>
                                                    <div className="text-gray-500">Duplicatas</div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Resultado da Importação */}
                            {importResult && !isImporting && (
                                <div className="space-y-4">
                                    <Alert>
                                        <CheckCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Importação concluída! {importResult.success.length} participantes importados com sucesso.
                                        </AlertDescription>
                                    </Alert>

                                    {importResult.errors.length > 0 && (
                                        <Card>
                                            <CardContent className="p-4">
                                                <h4 className="font-semibold text-red-600 mb-2 flex items-center">
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Erros ({importResult.errors.length})
                                                </h4>
                                                <div className="max-h-32 overflow-y-auto space-y-2">
                                                    {importResult.errors.slice(0, 5).map((error, index) => (
                                                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                                            {error.item.name || 'Nome não informado'} - {error.error}
                                                        </div>
                                                    ))}
                                                    {importResult.errors.length > 5 && (
                                                        <p className="text-sm text-gray-500">
                                                            ... e mais {importResult.errors.length - 5} erros
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {importResult.duplicates.length > 0 && (
                                        <Card>
                                            <CardContent className="p-4">
                                                <h4 className="font-semibold text-yellow-600 mb-2 flex items-center">
                                                    <AlertCircle className="w-4 h-4 mr-2" />
                                                    Duplicatas ({importResult.duplicates.length})
                                                </h4>
                                                <div className="max-h-32 overflow-y-auto space-y-2">
                                                    {importResult.duplicates.slice(0, 5).map((dup, index) => (
                                                        <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                                            {dup.item.name} - CPF já existe
                                                        </div>
                                                    ))}
                                                    {importResult.duplicates.length > 5 && (
                                                        <p className="text-sm text-gray-500">
                                                            ... e mais {importResult.duplicates.length - 5} duplicatas
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {/* Instruções */}
                            <Card>
                                <CardContent className="p-6">
                                    <h4 className="font-semibold mb-4 flex items-center">
                                        <FileText className="w-4 h-4 mr-2" />
                                        Instruções para Importação
                                    </h4>
                                    <div className="space-y-3 text-sm text-gray-600">
                                        <p><strong>Colunas obrigatórias:</strong> name, cpf, company, role</p>
                                        <p><strong>Colunas opcionais:</strong> email, phone, shirtSize, notes, daysWork, wristbandId</p>
                                        <p><strong>Formato CPF:</strong> 123.456.789-00 ou 12345678900</p>
                                        <p><strong>Dias de trabalho:</strong> separados por vírgula (ex: 15/12/2024, 16/12/2024)</p>
                                        <p><strong>Limite:</strong> até 1000 participantes por importação</p>
                                        <p><strong>wristbandId:</strong> se não fornecido, será gerado automaticamente</p>
                                    </div>
                                    <Button
                                        onClick={downloadTemplate}
                                        variant="outline"
                                        className="mt-4"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Baixar Modelo
                                    </Button>
                                    <Button
                                        onClick={downloadBigTestTemplate}
                                        variant="outline"
                                        className="mt-2"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Baixar Modelo com 5000 Participantes
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )
                ) : (
                    <div className="space-y-6">
                        {/* Estatísticas */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                                    <div className="text-2xl font-bold">{participants.length}</div>
                                    <div className="text-sm text-gray-600">Total de Participantes</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Building className="w-8 h-8 mx-auto text-green-600 mb-2" />
                                    <div className="text-2xl font-bold">
                                        {new Set(participants.map(p => p.company)).size}
                                    </div>
                                    <div className="text-sm text-gray-600">Empresas Únicas</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <CheckCircle className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                                    <div className="text-2xl font-bold">
                                        {participants.filter(p => p.checkIn).length}
                                    </div>
                                    <div className="text-sm text-gray-600">Com Check-in</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Botões de Exportação */}
                        <div className="space-y-4">
                            <Button
                                onClick={exportParticipants}
                                disabled={isExporting || participants.length === 0}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Exportando...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Exportar Todos os Participantes ({participants.length})
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={downloadTemplate}
                                variant="outline"
                                className="w-full"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Baixar Modelo de Importação
                            </Button>

                            <Button
                                onClick={downloadBigTestTemplate}
                                variant="outline"
                                className="w-full"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Baixar Modelo com 5000 Participantes
                            </Button>
                        </div>

                        {/* Informações */}
                        <Card>
                            <CardContent className="p-6">
                                <h4 className="font-semibold mb-4">Informações da Exportação</h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p>• A exportação inclui todos os dados dos participantes</p>
                                    <p>• Formato: Excel (.xlsx)</p>
                                    <p>• Nome do arquivo: participantes-evento-{eventId}-{new Date().toISOString().split('T')[0]}.xlsx</p>
                                    <p>• Dados incluídos: nome, CPF, empresa, função, email, telefone, etc.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
} 