/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Download,
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle,
    XCircle,
    Loader2,
    FileText,
    Users,
    Building,
    ArrowLeft,
    ArrowRight,
    Check,
    Clock,
    AlertTriangle,
    Search,
    SortAsc,
    SortDesc,
} from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCreateEventParticipant } from "@/features/eventos/api/mutation/use-create-event-participant"
import type { EventParticipant } from "@/features/eventos/types"
import type { EventParticipantSchema } from "@/features/eventos/schemas"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import router from "next/router"

interface ImportProgress {
    total: number
    processed: number
    success: number
    errors: number
    duplicates: number
    currentItem?: string
    currentBatch?: number
    totalBatches?: number
}

interface ImportResult {
    success: EventParticipantSchema[]
    errors: Array<{ item: any; error: string; row: number }>
    duplicates: Array<{ item: any; existing: EventParticipant; row: number }>
}

interface ProcessedData {
    fileName: string
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateRows: number
    data: EventParticipantSchema[]
    errors: Array<{ item: any; error: string; row: number }>
    duplicates: Array<{ item: any; existing: EventParticipant; row: number }>
}

type ImportStep = "upload" | "preview" | "validation" | "import" | "complete"

export default function ImportExportPage() {
    const params = useParams()
    const eventId = params.id as string
    const [activeTab, setActiveTab] = useState<"import" | "export">("import")

    // Import States
    const [currentStep, setCurrentStep] = useState<ImportStep>("upload")
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [progress, setProgress] = useState<ImportProgress>({
        total: 0,
        processed: 0,
        success: 0,
        errors: 0,
        duplicates: 0,
    })
    const [importResult, setImportResult] = useState<ImportResult | null>(null)

    // Na seção de estados, adicionar configurações de lote:
    const [batchConfig, setBatchConfig] = useState({
        batchSize: 25, // Reduzido para ser mais conservador
        pauseBetweenBatches: 2000, // 2 segundos entre lotes
        pauseBetweenItems: 100, // 100ms entre itens
    })

    // UI States
    const [dragActive, setDragActive] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    // Filtros e busca
    const [searchTerm, setSearchTerm] = useState("")
    const [sortBy, setSortBy] = useState<"name" | "company" | "role">("name")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
    const [filterCompany, setFilterCompany] = useState("all")

    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)

    // Atalhos de teclado
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'i':
                    e.preventDefault()
                    setActiveTab('import')
                    break
                case 'e':
                    e.preventDefault()
                    setActiveTab('export')
                    break
                case 'o':
                    e.preventDefault()
                    fileInputRef.current?.click()
                    break
            }
        }
    }, [])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    const { data: participants = [] } = useEventParticipantsByEvent({ eventId })
    const { mutate: createParticipant } = useCreateEventParticipant()

    // Validation functions
    const isValidCPF = (cpf: string): boolean => {
        const cleaned = cpf.replace(/\D/g, "")
        if (cleaned.length !== 11) return false
        if (/^(\d)\1+$/.test(cleaned)) return false
        return true
    }

    const isValidEmail = (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const validateParticipant = (data: any, rowIndex: number): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []

        if (!data.name || data.name.toString().trim().length < 2) {
            errors.push("Nome deve ter pelo menos 2 caracteres")
        }
        if (!data.cpf || !isValidCPF(data.cpf.toString())) {
            errors.push("CPF inválido")
        }
        if (!data.company || data.company.toString().trim().length < 2) {
            errors.push("Empresa deve ter pelo menos 2 caracteres")
        }
        if (!data.role || data.role.toString().trim().length < 2) {
            errors.push("Função deve ter pelo menos 2 caracteres")
        }
        if (data.email && !isValidEmail(data.email.toString())) {
            errors.push("Email inválido")
        }
        if (data.phone && data.phone.toString().replace(/\D/g, "").length < 10) {
            errors.push("Telefone inválido")
        }

        return { isValid: errors.length === 0, errors }
    }

    // Process Excel file
    const processExcelFile = async (file: File): Promise<ProcessedData> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: "array" })
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

                    const result: ProcessedData = {
                        fileName: file.name,
                        totalRows: jsonData.length,
                        validRows: 0,
                        invalidRows: 0,
                        duplicateRows: 0,
                        data: [],
                        errors: [],
                        duplicates: [],
                    }

                    const existingCPFs = new Set(participants.map((p) => p.cpf.replace(/\D/g, "")))
                    const processedCPFs = new Set<string>()

                    jsonData.forEach((row, index) => {
                        const rowNumber = index + 2 // Excel row number (header is row 1)
                        const validation = validateParticipant(row, rowNumber)

                        if (!validation.isValid) {
                            result.errors.push({
                                item: row,
                                error: validation.errors.join(", "),
                                row: rowNumber,
                            })
                            result.invalidRows++
                            return
                        }

                        const cleanedCPF = row.cpf.toString().replace(/\D/g, "")

                        // Check for duplicates in existing data
                        if (existingCPFs.has(cleanedCPF)) {
                            const existing = participants.find((p) => p.cpf.replace(/\D/g, "") === cleanedCPF)
                            if (existing) {
                                result.duplicates.push({
                                    item: row,
                                    existing,
                                    row: rowNumber,
                                })
                                result.duplicateRows++
                                return
                            }
                        }

                        // Check for duplicates within the file
                        if (processedCPFs.has(cleanedCPF)) {
                            result.duplicates.push({
                                item: row,
                                existing: {} as EventParticipant, // Placeholder for file duplicate
                                row: rowNumber,
                            })
                            result.duplicateRows++
                            return
                        }

                        processedCPFs.add(cleanedCPF)

                        const participantData: EventParticipantSchema = {
                            eventId: eventId,
                            wristbandId: row.wristbandId || `wb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            staffId: row.staffId || undefined,
                            name: row.name.toString().trim(),
                            cpf: row.cpf.toString(),
                            email: row.email?.toString().trim() || undefined,
                            phone: row.phone?.toString().trim() || undefined,
                            role: row.role.toString().trim(),
                            company: row.company.toString().trim(),
                            checkIn: row.checkIn || undefined,
                            checkOut: row.checkOut || undefined,
                            presenceConfirmed: row.presenceConfirmed || undefined,
                            certificateIssued: row.certificateIssued || undefined,
                            shirtSize: row.shirtSize || undefined,
                            notes: row.notes?.toString().trim() || undefined,
                            photo: row.photo || undefined,
                            documentPhoto: row.documentPhoto || undefined,
                            validatedBy: row.validatedBy || undefined,
                            daysWork: row.daysWork
                                ? Array.isArray(row.daysWork)
                                    ? row.daysWork
                                    : row.daysWork
                                        .toString()
                                        .split(",")
                                        .map((d: string) => d.trim())
                                : undefined,
                        }

                        result.data.push(participantData)
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

    // Substituir a função importParticipants com pausas maiores:
    const importParticipants = async (participants: EventParticipantSchema[]) => {
        const { batchSize, pauseBetweenBatches, pauseBetweenItems } = batchConfig
        const totalBatches = Math.ceil(participants.length / batchSize)
        let success = 0
        let errors = 0

        setProgress({
            total: participants.length,
            processed: 0,
            success: 0,
            errors: 0,
            duplicates: 0,
            totalBatches,
            currentBatch: 0,
        })

        console.log(`🚀 Iniciando importação de ${participants.length} participantes em ${totalBatches} lotes`)
        console.log(
            `📦 Configuração: ${batchSize} por lote, ${pauseBetweenBatches}ms entre lotes, ${pauseBetweenItems}ms entre itens`,
        )

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIndex = batchIndex * batchSize
            const endIndex = Math.min(startIndex + batchSize, participants.length)
            const batch = participants.slice(startIndex, endIndex)

            console.log(`📦 Processando lote ${batchIndex + 1}/${totalBatches} (${batch.length} participantes)`)

            setProgress((prev) => ({
                ...prev,
                currentBatch: batchIndex + 1,
                currentItem: `Processando lote ${batchIndex + 1} de ${totalBatches} (${batch.length} participantes)`,
            }))

            // Processar cada item do lote sequencialmente
            for (let i = 0; i < batch.length; i++) {
                const participant = batch[i]
                const globalIndex = startIndex + i

                setProgress((prev) => ({
                    ...prev,
                    processed: globalIndex + 1,
                    currentItem: `Lote ${batchIndex + 1}/${totalBatches} - ${participant.name} (${i + 1}/${batch.length})`,
                }))

                try {
                    await new Promise<void>((resolve) => {
                        createParticipant(participant, {
                            onSuccess: () => {
                                success++
                                setProgress((prev) => ({ ...prev, success }))
                                console.log(`✅ Sucesso: ${participant.name} (${success}/${participants.length})`)
                                resolve()
                            },
                            onError: (error) => {
                                console.error(`❌ Erro ao criar participante ${participant.name}:`, error)
                                errors++
                                setProgress((prev) => ({ ...prev, errors }))
                                resolve()
                            },
                        })
                    })
                } catch (error) {
                    console.error(`❌ Erro inesperado para ${participant.name}:`, error)
                    errors++
                    setProgress((prev) => ({ ...prev, errors }))
                }

                // Pausa entre itens do mesmo lote
                if (i < batch.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, pauseBetweenItems))
                }
            }

            console.log(`✅ Lote ${batchIndex + 1} concluído. Sucessos: ${success}, Erros: ${errors}`)

            // Pausa maior entre lotes (exceto no último lote)
            if (batchIndex < totalBatches - 1) {
                console.log(`⏸️ Pausando ${pauseBetweenBatches}ms antes do próximo lote...`)

                // Mostrar countdown da pausa
                for (let countdown = Math.ceil(pauseBetweenBatches / 1000); countdown > 0; countdown--) {
                    setProgress((prev) => ({
                        ...prev,
                        currentItem: `Pausando ${countdown}s antes do próximo lote...`,
                    }))
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }
            }
        }

        console.log(`🎉 Importação concluída! Total: ${participants.length}, Sucessos: ${success}, Erros: ${errors}`)
        return { success, errors }
    }

    // Step handlers
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
            setCurrentStep("preview")
            toast.success("Arquivo processado com sucesso!")
        } catch (error) {
            toast.error("Erro ao processar arquivo")
            console.error(error)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleNextStep = () => {
        if (currentStep === "preview") {
            setCurrentStep("validation")
        } else if (currentStep === "validation") {
            setCurrentStep("import")
        }
    }

    const handlePrevStep = () => {
        if (currentStep === "validation") {
            setCurrentStep("preview")
        } else if (currentStep === "import") {
            setCurrentStep("validation")
        } else if (currentStep === "preview") {
            setCurrentStep("upload")
            setProcessedData(null)
            setUploadedFile(null)
        }
    }

    const handleStartImport = async () => {
        if (!processedData) return

        setIsImporting(true)
        setCurrentStep("import")

        try {
            const result = await importParticipants(processedData.data)

            setImportResult({
                success: processedData.data,
                errors: processedData.errors,
                duplicates: processedData.duplicates,
            })

            setCurrentStep("complete")
            toast.success(`Importação concluída! ${result.success} participantes importados com sucesso.`)
        } catch (error) {
            toast.error("Erro durante a importação")
            console.error(error)
        } finally {
            setIsImporting(false)
        }
    }

    const resetImport = () => {
        setCurrentStep("upload")
        setUploadedFile(null)
        setProcessedData(null)
        setImportResult(null)
        setProgress({ total: 0, processed: 0, success: 0, errors: 0, duplicates: 0 })
    }

    // Drag & Drop handlers
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
            await handleFileUpload(e.dataTransfer.files[0])
        }
    }, [])

    // Export function
    const exportParticipants = async () => {
        setIsExporting(true)
        try {
            const exportData = participants.map((p) => ({
                Nome: p.name,
                CPF: p.cpf,
                Empresa: p.company,
                Função: p.role,
                Email: p.email || "",
                Telefone: p.phone || "",
                Tamanho_Camiseta: p.shirtSize || "",
                Observações: p.notes || "",
                Dias_Trabalho: p.daysWork?.join(", ") || "",
                Check_in: p.checkIn || "",
                Check_out: p.checkOut || "",
                Validado_Por: p.validatedBy || "",
                Data_Criação: (p as any).created_at || "",
            }))

            const ws = XLSX.utils.json_to_sheet(exportData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Participantes")
            XLSX.writeFile(wb, `participantes-evento-${eventId}-${new Date().toISOString().split("T")[0]}.xlsx`)
            toast.success("Exportação concluída com sucesso!")
        } catch (error) {
            toast.error("Erro ao exportar dados")
        } finally {
            setIsExporting(false)
        }
    }

    // Template download functions
    const downloadTemplate = () => {
        const templateData = [
            {
                name: "João Silva",
                cpf: "123.456.789-00",
                company: "RG Produções",
                role: "Segurança",
                email: "joao@email.com",
                phone: "(11) 99999-9999",
                shirtSize: "M",
                notes: "Observações aqui",
                daysWork: "15/12/2024, 16/12/2024",
                wristbandId: "wristband-001",
            },
        ]
        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, "modelo-participantes.xlsx")
    }

    const downloadBigTestTemplate = () => {
        const wristbandId = "ebd215b9-498d-4af6-b557-dab178c8f9aa"
        const generateValidCPF = (index: number): string => {
            const base = 100000000 + index
            return String(base).padStart(11, "0")
        }

        const templateData = Array.from({ length: 5000 }).map((_, i) => ({
            name: `Participante ${i + 1}`,
            cpf: generateValidCPF(i),
            company: `Empresa ${(i % 50) + 1}`,
            role: `Função ${(i % 10) + 1}`,
            email: `participante${i + 1}@teste.com`,
            phone: `1199${String(i).padStart(6, "0")}`,
            shirtSize: ["P", "M", "G", "GG"][i % 4],
            notes: `Observação ${i + 1}`,
            daysWork: "28/07/2025, 01/08/2025",
            wristbandId,
        }))

        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, "modelo-participantes-5000.xlsx")
    }

    const getInitials = (name: string): string => {
        return name
            .split(" ")
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    // Funções para filtrar e ordenar dados
    const getFilteredAndSortedData = () => {
        if (!processedData) return []

        const filtered = processedData.data.filter((participant) => {
            const matchesSearch = searchTerm === "" ||
                participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                participant.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                participant.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                participant.cpf.includes(searchTerm)

            const matchesCompany = filterCompany === "all" ||
                participant.company === filterCompany

            return matchesSearch && matchesCompany
        })

        // Ordenação
        filtered.sort((a, b) => {
            const aValue = a[sortBy].toLowerCase()
            const bValue = b[sortBy].toLowerCase()

            if (sortOrder === "asc") {
                return aValue.localeCompare(bValue)
            } else {
                return bValue.localeCompare(aValue)
            }
        })

        return filtered
    }

    const getUniqueCompanies = () => {
        if (!processedData) return []
        return Array.from(new Set(processedData.data.map(p => p.company))).sort()
    }
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null
    // Step indicator component
    const StepIndicator = () => {
        const steps = [
            { key: "upload", label: "Upload", icon: Upload },
            { key: "preview", label: "Prévia", icon: FileText },
            { key: "validation", label: "Validação", icon: AlertTriangle },
            { key: "import", label: "Importação", icon: Clock },
            { key: "complete", label: "Concluído", icon: Check },
        ]

        const getStepIndex = (step: ImportStep) => steps.findIndex((s) => s.key === step)
        const currentIndex = getStepIndex(currentStep)

        return (

            <div className="flex items-center justify-between mb-8">
                {steps.map((step, index) => {
                    const Icon = step.icon
                    const isActive = index === currentIndex
                    const isCompleted = index < currentIndex
                    const isDisabled = index > currentIndex

                    return (
                        <div key={step.key} className="flex items-center">


                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${isCompleted
                                    ? "bg-green-500 border-green-500 text-white"
                                    : isActive
                                        ? "bg-blue-500 border-blue-500 text-white"
                                        : "bg-gray-100 border-gray-300 text-gray-400"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="ml-3">
                                <div
                                    className={`text-sm font-medium ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"
                                        }`}
                                >
                                    {step.label}
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />
                            )}
                        </div>
                    )
                })}
            </div>

        )
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={evento?.name || ""}>

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="mb-8">
                    <button className="text-white hover:text-white bg-purple-600 p-2 rounded-full flex items-center justify-center" onClick={() => window.history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Importação/Exportação de Participantes</h1>
                            <p className="text-gray-600">Gerencie participantes em massa com importação e exportação otimizadas</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setActiveTab("import")}>
                                <Upload className="w-4 h-4 mr-2" />
                                Importar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setActiveTab("export")}>
                                <Download className="w-4 h-4 mr-2" />
                                Exportar
                            </Button>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <span>Ctrl+I</span>
                                <span>•</span>
                                <span>Ctrl+E</span>
                                <span>•</span>
                                <span>Ctrl+O</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                    <button
                        onClick={() => {
                            setActiveTab("import")
                            resetImport()
                        }}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === "import" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        <Upload className="w-4 h-4 mr-2 inline" />
                        Importar
                    </button>
                    <button
                        onClick={() => setActiveTab("export")}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === "export" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        <Download className="w-4 h-4 mr-2 inline" />
                        Exportar
                    </button>
                </div>

                {activeTab === "import" ? (
                    <div className="space-y-6">
                        <StepIndicator />

                        {/* Step 1: Upload */}
                        {currentStep === "upload" && (
                            <div className="space-y-6">
                                <div
                                    ref={dropZoneRef}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                                        }`}
                                >
                                    <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Arraste e solte seu arquivo Excel aqui</h3>
                                    <p className="text-gray-600 mb-4">Ou clique para selecionar um arquivo</p>
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isProcessing}
                                        className="bg-blue-600 hover:bg-blue-700"
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
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                        className="hidden"
                                    />
                                </div>

                                {/* Instructions */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center">
                                            <FileText className="w-4 h-4 mr-2" />
                                            Instruções para Importação
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3 text-sm text-gray-600">
                                            <p>
                                                <strong>Colunas obrigatórias:</strong> name, cpf, company, role
                                            </p>
                                            <p>
                                                <strong>Colunas opcionais:</strong> email, phone, shirtSize, notes, daysWork, wristbandId
                                            </p>
                                            <p>
                                                <strong>Formato CPF:</strong> 123.456.789-00 ou 12345678900
                                            </p>
                                            <p>
                                                <strong>Dias de trabalho:</strong> separados por vírgula (ex: 15/12/2024, 16/12/2024)
                                            </p>
                                            <p>
                                                <strong>Limite:</strong> até 5000 participantes por importação
                                            </p>
                                            <p>
                                                <strong>wristbandId:</strong> se não fornecido, será gerado automaticamente
                                            </p>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <Button onClick={downloadTemplate} variant="outline" className="w-full bg-transparent">
                                                <Download className="w-4 h-4 mr-2" />
                                                Baixar Modelo
                                            </Button>
                                            <Button onClick={downloadBigTestTemplate} variant="outline" className="w-full bg-transparent">
                                                <FileText className="w-4 h-4 mr-2" />
                                                Baixar Modelo com 5000 Participantes
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 2: Preview */}
                        {currentStep === "preview" && processedData && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Prévia dos Dados - {processedData.fileName}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-4 gap-4 mb-6">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">{processedData.totalRows}</div>
                                                <div className="text-sm text-gray-600">Total de Linhas</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-600">{processedData.validRows}</div>
                                                <div className="text-sm text-gray-600">Válidos</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-red-600">{processedData.invalidRows}</div>
                                                <div className="text-sm text-gray-600">Inválidos</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-yellow-600">{processedData.duplicateRows}</div>
                                                <div className="text-sm text-gray-600">Duplicatas</div>
                                            </div>
                                        </div>

                                        {/* Controles de Busca e Filtros */}
                                        <div className="mb-6 space-y-4">
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <div className="flex-1">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                        <Input
                                                            placeholder="Buscar por nome, empresa, função ou CPF..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="pl-10"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Select value={filterCompany} onValueChange={setFilterCompany}>
                                                        <SelectTrigger className="w-48">
                                                            <SelectValue placeholder="Filtrar por empresa" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Todas as empresas</SelectItem>
                                                            {getUniqueCompanies().map((company) => (
                                                                <SelectItem key={company} value={company}>
                                                                    {company}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                                                        <SelectTrigger className="w-32">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="name">Nome</SelectItem>
                                                            <SelectItem value="company">Empresa</SelectItem>
                                                            <SelectItem value="role">Função</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                                    >
                                                        {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-sm text-gray-600">
                                                <span>
                                                    Mostrando {Math.min(getFilteredAndSortedData().length, 50)} de {getFilteredAndSortedData().length} resultados
                                                </span>
                                                <div className="flex gap-2">
                                                    <Badge variant="secondary">{processedData.data.length} total</Badge>
                                                    {searchTerm && <Badge variant="outline">Busca: &quot;{searchTerm}&quot;</Badge>}
                                                    {filterCompany && filterCompany !== "all" && <Badge variant="outline">Empresa: {filterCompany}</Badge>}
                                                </div>
                                            </div>
                                        </div>

                                        {processedData.data.length > 0 && (
                                            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                            <TableHead className="px-6 py-4">Participante</TableHead>
                                                            <TableHead className="px-6 py-4 hidden md:table-cell">Empresa</TableHead>
                                                            <TableHead className="px-6 py-4 hidden md:table-cell">Função</TableHead>
                                                            <TableHead className="px-6 py-4">CPF</TableHead>
                                                            <TableHead className="px-6 py-4">Email</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {getFilteredAndSortedData().slice(0, 50).map((participant, index) => (
                                                            <TableRow key={index} className="hover:bg-purple-50">
                                                                <TableCell className="px-6 py-4">
                                                                    <div className="flex items-center">
                                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                                                            <span className="text-sm font-bold text-white">
                                                                                {getInitials(participant.name)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="ml-4">
                                                                            <div className="text-sm font-semibold text-gray-900">{participant.name}</div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="px-6 py-4 hidden md:table-cell">
                                                                    <Badge variant="secondary">{participant.company}</Badge>
                                                                </TableCell>
                                                                <TableCell className="px-6 py-4 hidden md:table-cell">{participant.role}</TableCell>
                                                                <TableCell className="px-6 py-4 font-mono">{participant.cpf}</TableCell>
                                                                <TableCell className="px-6 py-4">{participant.email || "-"}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                {processedData.data.length > 10 && (
                                                    <div className="px-6 py-4 bg-gray-50 text-center text-sm text-gray-600">
                                                        ... e mais {processedData.data.length - 10} participantes
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="flex justify-between">
                                    <Button onClick={handlePrevStep} variant="outline">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Voltar
                                    </Button>
                                    <Button onClick={handleNextStep} disabled={processedData.validRows === 0}>
                                        Próximo
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Validation */}
                        {currentStep === "validation" && processedData && (
                            <div className="space-y-6">
                                {/* Configuração de Lote */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Configurações de Importação</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Tamanho do Lote</label>
                                                <select
                                                    value={batchConfig.batchSize}
                                                    onChange={(e) => setBatchConfig((prev) => ({ ...prev, batchSize: Number(e.target.value) }))}
                                                    className="w-full p-2 border border-gray-300 rounded-md"
                                                >
                                                    <option value={10}>10 participantes</option>
                                                    <option value={25}>25 participantes</option>
                                                    <option value={50}>50 participantes</option>
                                                    <option value={100}>100 participantes</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Pausa entre Lotes (segundos)
                                                </label>
                                                <select
                                                    value={batchConfig.pauseBetweenBatches / 1000}
                                                    onChange={(e) =>
                                                        setBatchConfig((prev) => ({ ...prev, pauseBetweenBatches: Number(e.target.value) * 1000 }))
                                                    }
                                                    className="w-full p-2 border border-gray-300 rounded-md"
                                                >
                                                    <option value={1}>1 segundo</option>
                                                    <option value={2}>2 segundos</option>
                                                    <option value={3}>3 segundos</option>
                                                    <option value={5}>5 segundos</option>
                                                    <option value={10}>10 segundos</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Pausa entre Itens (ms)</label>
                                                <select
                                                    value={batchConfig.pauseBetweenItems}
                                                    onChange={(e) =>
                                                        setBatchConfig((prev) => ({ ...prev, pauseBetweenItems: Number(e.target.value) }))
                                                    }
                                                    className="w-full p-2 border border-gray-300 rounded-md"
                                                >
                                                    <option value={50}>50ms</option>
                                                    <option value={100}>100ms</option>
                                                    <option value={200}>200ms</option>
                                                    <option value={500}>500ms</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                            <p className="text-sm text-blue-800">
                                                <strong>Tempo estimado:</strong>{" "}
                                                {Math.ceil(
                                                    (processedData.validRows / batchConfig.batchSize) * (batchConfig.pauseBetweenBatches / 1000) +
                                                    (processedData.validRows * batchConfig.pauseBetweenItems) / 1000,
                                                )}{" "}
                                                segundos para {processedData.validRows} participantes
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Resto do conteúdo de validação permanece igual */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Validação dos Dados</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                                <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                                                <div className="text-2xl font-bold text-green-600">{processedData.validRows}</div>
                                                <div className="text-sm text-gray-600">Prontos para Importar</div>
                                            </div>
                                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                                <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                                                <div className="text-2xl font-bold text-red-600">{processedData.invalidRows}</div>
                                                <div className="text-sm text-gray-600">Com Erros</div>
                                            </div>
                                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                                <AlertCircle className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                                                <div className="text-2xl font-bold text-yellow-600">{processedData.duplicateRows}</div>
                                                <div className="text-sm text-gray-600">Duplicatas</div>
                                            </div>
                                        </div>

                                        {processedData.errors.length > 0 && (
                                            <div className="mb-6">
                                                <h4 className="font-semibold text-red-600 mb-3 flex items-center">
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Erros Encontrados ({processedData.errors.length})
                                                </h4>
                                                <div className="max-h-40 overflow-y-auto space-y-2">
                                                    {processedData.errors.slice(0, 10).map((error, index) => (
                                                        <div key={index} className="text-sm bg-red-50 p-3 rounded border-l-4 border-red-400">
                                                            <div className="font-medium">
                                                                Linha {error.row}: {error.item.name || "Nome não informado"}
                                                            </div>
                                                            <div className="text-red-600">{error.error}</div>
                                                        </div>
                                                    ))}
                                                    {processedData.errors.length > 10 && (
                                                        <p className="text-sm text-gray-500 text-center">
                                                            ... e mais {processedData.errors.length - 10} erros
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {processedData.duplicates.length > 0 && (
                                            <div className="mb-6">
                                                <h4 className="font-semibold text-yellow-600 mb-3 flex items-center">
                                                    <AlertCircle className="w-4 h-4 mr-2" />
                                                    Duplicatas Encontradas ({processedData.duplicates.length})
                                                </h4>
                                                <div className="max-h-40 overflow-y-auto space-y-2">
                                                    {processedData.duplicates.slice(0, 10).map((dup, index) => (
                                                        <div key={index} className="text-sm bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                                                            <div className="font-medium">
                                                                Linha {dup.row}: {dup.item.name}
                                                            </div>
                                                            <div className="text-yellow-600">CPF {dup.item.cpf} já existe no sistema</div>
                                                        </div>
                                                    ))}
                                                    {processedData.duplicates.length > 10 && (
                                                        <p className="text-sm text-gray-500 text-center">
                                                            ... e mais {processedData.duplicates.length - 10} duplicatas
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="flex justify-between">
                                    <Button onClick={handlePrevStep} variant="outline">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Voltar
                                    </Button>
                                    <Button
                                        onClick={handleStartImport}
                                        disabled={processedData.validRows === 0}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        Iniciar Importação ({processedData.validRows} participantes)
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Melhorar o Step 4 (Import Progress) para mostrar mais detalhes: */}
                        {currentStep === "import" && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Importação em Andamento</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold">Progresso Geral</h4>
                                                <Badge variant="secondary">
                                                    {progress.processed}/{progress.total}
                                                </Badge>
                                            </div>
                                            <Progress
                                                value={progress.total ? (progress.processed / progress.total) * 100 : 0}
                                                className="h-3"
                                            />

                                            {progress.currentBatch && progress.totalBatches && (
                                                <div className="text-center">
                                                    <div className="text-sm font-medium text-gray-700">
                                                        Lote {progress.currentBatch} de {progress.totalBatches}
                                                    </div>
                                                    <Progress
                                                        value={progress.totalBatches ? (progress.currentBatch / progress.totalBatches) * 100 : 0}
                                                        className="h-2 mt-1"
                                                    />
                                                </div>
                                            )}

                                            {progress.currentItem && (
                                                <div className="text-sm text-gray-600 text-center bg-gray-50 p-2 rounded">
                                                    {progress.currentItem}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div className="text-center p-3 bg-green-50 rounded">
                                                    <div className="text-green-600 font-semibold text-lg">{progress.success}</div>
                                                    <div className="text-gray-500">Sucessos</div>
                                                </div>
                                                <div className="text-center p-3 bg-red-50 rounded">
                                                    <div className="text-red-600 font-semibold text-lg">{progress.errors}</div>
                                                    <div className="text-gray-500">Erros</div>
                                                </div>
                                                <div className="text-center p-3 bg-blue-50 rounded">
                                                    <div className="text-blue-600 font-semibold text-lg">{progress.processed}</div>
                                                    <div className="text-gray-500">Processados</div>
                                                </div>
                                            </div>

                                            {/* Configurações atuais */}
                                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                                <div className="text-sm text-blue-800">
                                                    <strong>Configurações:</strong> {batchConfig.batchSize} por lote,{" "}
                                                    {batchConfig.pauseBetweenBatches / 1000}s entre lotes, {batchConfig.pauseBetweenItems}ms entre
                                                    itens
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 5: Complete */}
                        {currentStep === "complete" && importResult && (
                            <div className="space-y-6">
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Importação concluída com sucesso! {progress.success} participantes foram importados.
                                    </AlertDescription>
                                </Alert>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Resumo da Importação</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                                <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                                                <div className="text-2xl font-bold text-green-600">{progress.success}</div>
                                                <div className="text-sm text-gray-600">Importados</div>
                                            </div>
                                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                                <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                                                <div className="text-2xl font-bold text-red-600">{progress.errors}</div>
                                                <div className="text-sm text-gray-600">Erros</div>
                                            </div>
                                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                                <AlertCircle className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                                                <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates.length}</div>
                                                <div className="text-sm text-gray-600">Duplicatas</div>
                                            </div>
                                        </div>

                                        <div className="flex justify-center">
                                            <Button onClick={resetImport} className="bg-blue-600 hover:bg-blue-700">
                                                <Upload className="w-4 h-4 mr-2" />
                                                Nova Importação
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                ) : (
                    // Export Tab
                    <div className="space-y-6">
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
                                    <div className="text-2xl font-bold">{new Set(participants.map((p) => p.company)).size}</div>
                                    <div className="text-sm text-gray-600">Empresas Únicas</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <CheckCircle className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                                    <div className="text-2xl font-bold">{participants.filter((p) => p.checkIn).length}</div>
                                    <div className="text-sm text-gray-600">Com Check-in</div>
                                </CardContent>
                            </Card>
                        </div>

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

                            <Separator />

                            <Button onClick={downloadTemplate} variant="outline" className="w-full bg-transparent">
                                <FileText className="w-4 h-4 mr-2" />
                                Baixar Modelo de Importação
                            </Button>
                            <Button onClick={downloadBigTestTemplate} variant="outline" className="w-full bg-transparent">
                                <FileText className="w-4 h-4 mr-2" />
                                Baixar Modelo com 5000 Participantes
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Informações da Exportação</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p>• A exportação inclui todos os dados dos participantes</p>
                                    <p>• Formato: Excel (.xlsx)</p>
                                    <p>
                                        • Nome do arquivo: participantes-evento-{eventId}-{new Date().toISOString().split("T")[0]}.xlsx
                                    </p>
                                    <p>• Dados incluídos: nome, CPF, empresa, função, email, telefone, etc.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </EventLayout>
    )
}
