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
import { Separator } from "@/components/ui/separator"
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
    Calendar,
    X,
    Plus,
    Settings,
    Palette,
} from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCreateEventParticipant } from "@/features/eventos/api/mutation/use-create-event-participant"
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event"
import { useCreateCredential } from "@/features/eventos/api/mutation/use-credential-mutations"
import { useEmpresas } from "@/features/eventos/api/query/use-empresas"
import { useCreateEmpresa } from "@/features/eventos/api/mutation"
import type { EventParticipant, CreateCredentialRequest, CreateEmpresaRequest } from "@/features/eventos/types"
import type { EventParticipantSchema } from "@/features/eventos/schemas"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
    missingCredentials: Array<{ name: string; count: number }>
    missingCompanies: Array<{ name: string; count: number }>
}

interface CreationProgress {
    type: "credential" | "company"
    current: number
    total: number
    currentItem: string
    isCreating: boolean
    completed: string[]
    failed: string[]
}

type ImportStep = "date" | "upload" | "preview" | "validation" | "creation" | "import" | "complete"

export default function ImportExportPage() {
    const params = useParams()
    const eventId = params.id as string
    const [activeTab, setActiveTab] = useState<"import" | "export">("import")

    // Import States
    const [currentStep, setCurrentStep] = useState<ImportStep>("date")
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

    // Creation States
    const [creationProgress, setCreationProgress] = useState<CreationProgress>({
        type: "credential",
        current: 0,
        total: 0,
        currentItem: "",
        isCreating: false,
        completed: [],
        failed: [],
    })
    const [credentialColors, setCredentialColors] = useState<{ [key: string]: string }>({})
    const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false)
    const [shouldCancelCreation, setShouldCancelCreation] = useState(false)

    // Batch configuration
    const [batchConfig, setBatchConfig] = useState({
        batchSize: 25,
        pauseBetweenBatches: 2000,
        pauseBetweenItems: 100,
    })

    // UI States
    const [dragActive, setDragActive] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [selectedEventDates, setSelectedEventDates] = useState<string[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [sortBy, setSortBy] = useState<"name" | "company" | "role">("name")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
    const [filterCompany, setFilterCompany] = useState("all")

    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)

    // API Hooks
    const { data: participants = [] } = useEventParticipantsByEvent({ eventId })
    const { mutate: createParticipant } = useCreateEventParticipant()
    const { data: credentials = [], refetch: refetchCredentials } = useCredentialsByEvent(eventId)
    const { mutate: createCredential } = useCreateCredential()
    const { data: empresas = [] } = useEmpresas()
    const { mutate: createEmpresa } = useCreateEmpresa()
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find((e) => e.id === eventId) : null

    // Keyboard shortcuts
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case "i":
                    e.preventDefault()
                    setActiveTab("import")
                    break
                case "e":
                    e.preventDefault()
                    setActiveTab("export")
                    break
                case "o":
                    e.preventDefault()
                    fileInputRef.current?.click()
                    break
            }
        }
    }, [])

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [handleKeyDown])

    // Validation functions
    const isValidCPF = (cpf: string): boolean => {
        if (!cpf || cpf.trim() === "") return true
        const cleaned = cpf.replace(/\D/g, "")
        if (cleaned.length >= 8 && cleaned.length <= 14) {
            return true
        }
        if (cpf.includes(".") || cpf.includes("-")) {
            const cleanedWithFormat = cpf.replace(/[.-]/g, "")
            if (cleanedWithFormat.length >= 8 && cleanedWithFormat.length <= 14) {
                return true
            }
        }
        return false
    }

    const isValidRG = (rg: string): boolean => {
        if (!rg || rg.trim() === "") return true
        const cleaned = rg.replace(/\D/g, "")
        if (cleaned.length >= 8 && cleaned.length <= 12) {
            return true
        }
        if (rg.includes(".") || rg.includes("-")) {
            const cleanedWithFormat = rg.replace(/[.-]/g, "")
            if (cleanedWithFormat.length >= 8 && cleanedWithFormat.length <= 12) {
                return true
            }
        }
        return false
    }

    const validateParticipant = (data: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []

        if (!data.nome || data.nome.toString().trim().length < 2) {
            errors.push("Nome é obrigatório e deve ter pelo menos 2 caracteres")
        }

        if (!data.empresa || data.empresa.toString().trim().length < 2) {
            errors.push("Empresa é obrigatória e deve ter pelo menos 2 caracteres")
        }

        if (!data.funcao || data.funcao.toString().trim().length < 2) {
            errors.push("Função é obrigatória e deve ter pelo menos 2 caracteres")
        }

        const hasCPF = data.cpf && data.cpf.toString().trim() !== ""
        const hasRG = data.rg && data.rg.toString().trim() !== ""

        if (!hasCPF && !hasRG) {
            errors.push("CPF ou RG é obrigatório (pelo menos um)")
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    }

    // Normalization functions
    const normalizeCredentialName = (name: string): string => {
        return name.toString().trim().toUpperCase()
    }

    const normalizeCompanyName = (name: string): string => {
        return name.toString().trim().toUpperCase()
    }

    const findCredentialByName = (name: string) => {
        const normalizedName = normalizeCredentialName(name)
        return credentials.find((credential) => normalizeCredentialName(credential.nome) === normalizedName)
    }

    const findCompanyByName = (name: string) => {
        const normalizedName = normalizeCompanyName(name)
        return (empresas || []).find((empresa) => {
            const empresaNormalized = normalizeCompanyName(empresa.nome)
            return empresaNormalized === normalizedName
        })
    }

    // Creation functions
    const createCredentialFunction = async (name: string, color: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const normalizedName = normalizeCredentialName(name)
            const daysWorks =
                selectedEventDates.length > 0
                    ? selectedEventDates.map((date) => new Date(date).toLocaleDateString("pt-BR"))
                    : [new Date().toLocaleDateString("pt-BR")]

            const credentialData: CreateCredentialRequest = {
                nome: normalizedName,
                id_events: eventId,
                days_works: daysWorks,
                cor: color,
            }

            createCredential(credentialData, {
                onSuccess: (data) => {
                    resolve(data.id)
                },
                onError: (error) => {
                    console.error(`Erro ao criar credencial ${normalizedName}:`, error)
                    resolve(null)
                },
            })
        })
    }

    const createCompanyFunction = async (name: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const normalizedName = normalizeCompanyName(name)
            const days =
                selectedEventDates.length > 0 ? selectedEventDates.map((date) => new Date(date).toISOString().slice(0, 10)) : []

            const companyData: CreateEmpresaRequest = {
                nome: normalizedName,
                id_evento: eventId,
                days: days,
            }

            createEmpresa(companyData, {
                onSuccess: (data) => {
                    resolve(data.id)
                },
                onError: (error) => {
                    console.error(`Erro ao criar empresa ${normalizedName}:`, error)
                    resolve(null)
                },
            })
        })
    }

    // Main creation process
    const handleStartCreation = async () => {
        if (!processedData) return

        setIsCreationDialogOpen(true)
        setShouldCancelCreation(false)

        // Create credentials first
        if (processedData.missingCredentials.length > 0) {
            await createMissingCredentials()
        }

        // Then create companies
        if (processedData.missingCompanies.length > 0 && !shouldCancelCreation) {
            await createMissingCompanies()
        }

        setIsCreationDialogOpen(false)

        if (!shouldCancelCreation) {
            // Reprocess data after creation
            await reprocessDataAfterCreation()
            setCurrentStep("import")
        }
    }

    const createMissingCredentials = async () => {
        if (!processedData?.missingCredentials) return

        setCreationProgress({
            type: "credential",
            current: 0,
            total: processedData.missingCredentials.length,
            currentItem: "",
            isCreating: true,
            completed: [],
            failed: [],
        })

        for (let i = 0; i < processedData.missingCredentials.length; i++) {
            if (shouldCancelCreation) break

            const credential = processedData.missingCredentials[i]
            const color = credentialColors[credential.name] || "#3B82F6"

            setCreationProgress((prev) => ({
                ...prev,
                current: i + 1,
                currentItem: credential.name,
            }))

            const credentialId = await createCredentialFunction(credential.name, color)

            setCreationProgress((prev) => ({
                ...prev,
                completed: credentialId ? [...prev.completed, credential.name] : prev.completed,
                failed: !credentialId ? [...prev.failed, credential.name] : prev.failed,
            }))

            // Pause between creations
            if (i < processedData.missingCredentials.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }
    }

    const createMissingCompanies = async () => {
        if (!processedData?.missingCompanies) return

        setCreationProgress({
            type: "company",
            current: 0,
            total: processedData.missingCompanies.length,
            currentItem: "",
            isCreating: true,
            completed: [],
            failed: [],
        })

        for (let i = 0; i < processedData.missingCompanies.length; i++) {
            if (shouldCancelCreation) break

            const company = processedData.missingCompanies[i]

            setCreationProgress((prev) => ({
                ...prev,
                current: i + 1,
                currentItem: company.name,
            }))

            const companyId = await createCompanyFunction(company.name)

            setCreationProgress((prev) => ({
                ...prev,
                completed: companyId ? [...prev.completed, company.name] : prev.completed,
                failed: !companyId ? [...prev.failed, company.name] : prev.failed,
            }))

            // Pause between creations
            if (i < processedData.missingCompanies.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 3000))
            }
        }
    }

    const reprocessDataAfterCreation = async () => {
        if (!uploadedFile) return

        try {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            await refetchCredentials()
            const newProcessedData = await processExcelFile(uploadedFile)
            setProcessedData(newProcessedData)

            const successCount = creationProgress.completed.length
            if (successCount > 0) {
                toast.success(`${successCount} itens criados com sucesso!`)
            }

            const failedCount = creationProgress.failed.length
            if (failedCount > 0) {
                toast.error(`${failedCount} itens falharam ao serem criados`)
            }
        } catch (error) {
            console.error("Erro ao reprocessar dados:", error)
            toast.error("Erro ao atualizar dados após criação")
        }
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
                        missingCredentials: [],
                        missingCompanies: [],
                    }

                    const existingCPFs = new Set(participants.map((p) => p.cpf.replace(/\D/g, "")))
                    const processedCPFs = new Set<string>()
                    const credentialCounts: { [key: string]: number } = {}
                    const companyCounts: { [key: string]: number } = {}

                    jsonData.forEach((row, index) => {
                        const rowNumber = index + 2
                        const validation = validateParticipant(row)

                        if (!validation.isValid) {
                            result.errors.push({
                                item: row,
                                error: validation.errors.join(", "),
                                row: rowNumber,
                            })
                            result.invalidRows++
                            return
                        }

                        const cleanedCPF = row.cpf ? row.cpf.toString().replace(/\D/g, "") : ""
                        const cleanedRG = row.rg ? row.rg.toString().replace(/\D/g, "") : ""

                        // Check for duplicates
                        const isDuplicate = existingCPFs.has(cleanedCPF) || (cleanedRG && existingCPFs.has(cleanedRG))

                        if (isDuplicate) {
                            const existing = participants.find(
                                (p) => p.cpf.replace(/\D/g, "") === cleanedCPF || (cleanedRG && p.cpf.replace(/\D/g, "") === cleanedRG),
                            )
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
                        const hasDuplicateInFile =
                            (cleanedCPF && processedCPFs.has(cleanedCPF)) || (cleanedRG && processedCPFs.has(cleanedRG))

                        if (hasDuplicateInFile) {
                            result.duplicates.push({
                                item: row,
                                existing: {} as EventParticipant,
                                row: rowNumber,
                            })
                            result.duplicateRows++
                            return
                        }

                        if (cleanedCPF) processedCPFs.add(cleanedCPF)
                        if (cleanedRG) processedCPFs.add(cleanedRG)

                        // Process credential
                        let credentialId: string | undefined = undefined
                        if (row.credencial) {
                            const credentialName = normalizeCredentialName(row.credencial)
                            const existingCredential = findCredentialByName(credentialName)
                            if (existingCredential) {
                                credentialId = existingCredential.id
                            } else {
                                credentialCounts[credentialName] = (credentialCounts[credentialName] || 0) + 1
                            }
                        }

                        // Process company
                        if (row.empresa) {
                            const companyName = normalizeCompanyName(row.empresa)
                            const existingCompany = findCompanyByName(companyName)
                            if (!existingCompany) {
                                companyCounts[companyName] = (companyCounts[companyName] || 0) + 1
                            }
                        }

                        const participantData: EventParticipantSchema = {
                            eventId: eventId,
                            credentialId: credentialId,
                            wristbandId: undefined,
                            staffId: row.staffId || undefined,
                            name: row.nome.toString().trim(),
                            cpf: (() => {
                                if (row.cpf) {
                                    const cpfStr = row.cpf.toString().replace(/\D/g, "")
                                    if (cpfStr.length > 0) {
                                        return cpfStr.padStart(11, "0")
                                    }
                                }
                                if (row.rg) {
                                    const rgStr = row.rg.toString().replace(/\D/g, "")
                                    if (rgStr.length > 0) {
                                        return rgStr.padStart(11, "0")
                                    }
                                }
                                return "00000000000"
                            })(),
                            email: row.email?.toString().trim() || undefined,
                            phone: row.phone?.toString().trim() || undefined,
                            role: row.funcao.toString().trim(),
                            company: row.empresa.toString().trim(),
                            checkIn: row.checkIn || undefined,
                            checkOut: row.checkOut || undefined,
                            presenceConfirmed: row.presenceConfirmed || undefined,
                            certificateIssued: row.certificateIssued || undefined,
                            notes: row.notes?.toString().trim() || undefined,
                            photo: row.photo || undefined,
                            documentPhoto: row.documentPhoto || undefined,
                            validatedBy: row.validatedBy || undefined,
                            daysWork: selectedEventDates
                                ? selectedEventDates.map((date) => new Date(date).toLocaleDateString("pt-BR"))
                                : undefined,
                        }

                        result.data.push(participantData)
                        result.validRows++
                    })

                    // Process missing credentials and companies
                    result.missingCredentials = Object.entries(credentialCounts).map(([name, count]) => ({
                        name,
                        count,
                    }))

                    result.missingCompanies = Object.entries(companyCounts).map(([name, count]) => ({
                        name,
                        count,
                    }))

                    // Initialize credential colors
                    const colors = {}
                    result.missingCredentials.forEach((cred, index) => {
                        const hue = (index * 137.5) % 360 // Golden angle for good color distribution
                            ; (colors as Record<string, string>)[cred.name] = `hsl(${hue}, 70%, 50%)`
                    })
                    setCredentialColors(colors)

                    resolve(result)
                } catch (error) {
                    reject(new Error("Erro ao processar arquivo Excel"))
                }
            }
            reader.onerror = () => reject(new Error("Erro ao ler arquivo"))
            reader.readAsArrayBuffer(file)
        })
    }

    // Import participants
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

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIndex = batchIndex * batchSize
            const endIndex = Math.min(startIndex + batchSize, participants.length)
            const batch = participants.slice(startIndex, endIndex)

            setProgress((prev) => ({
                ...prev,
                currentBatch: batchIndex + 1,
                currentItem: `Processando lote ${batchIndex + 1} de ${totalBatches} (${batch.length} participantes)`,
            }))

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
                                resolve()
                            },
                            onError: (error) => {
                                console.error(`Erro ao criar participante ${participant.name}:`, error)
                                errors++
                                setProgress((prev) => ({ ...prev, errors }))
                                resolve()
                            },
                        })
                    })
                } catch (error) {
                    console.error(`Erro inesperado para ${participant.name}:`, error)
                    errors++
                    setProgress((prev) => ({ ...prev, errors }))
                }

                if (i < batch.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, pauseBetweenItems))
                }
            }

            if (batchIndex < totalBatches - 1) {
                for (let countdown = Math.ceil(pauseBetweenBatches / 1000); countdown > 0; countdown--) {
                    setProgress((prev) => ({
                        ...prev,
                        currentItem: `Pausando ${countdown}s antes do próximo lote...`,
                    }))
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }
            }
        }

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
            // Check if we need to create credentials or companies
            if (processedData?.missingCredentials?.length || processedData?.missingCompanies?.length) {
                setCurrentStep("creation")
            } else {
                setCurrentStep("import")
            }
        } else if (currentStep === "creation") {
            setCurrentStep("import")
        }
    }

    const handlePrevStep = () => {
        if (currentStep === "creation") {
            setCurrentStep("validation")
        } else if (currentStep === "validation") {
            setCurrentStep("preview")
        } else if (currentStep === "import") {
            if (processedData?.missingCredentials?.length || processedData?.missingCompanies?.length) {
                setCurrentStep("creation")
            } else {
                setCurrentStep("validation")
            }
        } else if (currentStep === "preview") {
            setCurrentStep("upload")
            setProcessedData(null)
            setUploadedFile(null)
        } else if (currentStep === "upload") {
            setCurrentStep("date")
            setSelectedEventDates([])
        }
    }

    const handleStartImport = async () => {
        if (!processedData || selectedEventDates.length === 0) return

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
        setCurrentStep("date")
        setUploadedFile(null)
        setProcessedData(null)
        setImportResult(null)
        setSelectedEventDates([])
        setCredentialColors({})
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
        const ws = XLSX.utils.json_to_sheet([
            {
                nome: "João Silva",
                cpf: "12345678900",
                funcao: "Desenvolvedor",
                empresa: "Empresa ABC",
                credencial: "CREDENCIAL-001",
            },
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, `modelo-participantes-${eventId}-${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    // Date functions
    const getEventDates = () => {
        if (!evento) return []
        const dates: string[] = []
        if (evento.preparationStartDate && evento.preparationEndDate) {
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)
            const currentDate = new Date(startDate)
            while (currentDate <= endDate) {
                dates.push(currentDate.toISOString().split("T")[0])
                currentDate.setDate(currentDate.getDate() + 1)
            }
        }
        return dates
    }

    const handleDateSelect = (date: string) => {
        setSelectedEventDates((prev) => {
            const isSelected = prev.includes(date)
            if (isSelected) {
                return prev.filter((d) => d !== date)
            } else {
                return [...prev, date].sort()
            }
        })
    }

    const handleSelectAllDates = () => {
        const allDates = getEventDates()
        setSelectedEventDates(allDates)
    }

    const handleClearDates = () => {
        setSelectedEventDates([])
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
        })
    }

    const getDayNumber = (dateString: string) => {
        return new Date(dateString).getDate()
    }

    const groupDatesByMonth = (dates: string[]) => {
        const groups: { [key: string]: string[] } = {}
        dates.forEach((date) => {
            const monthKey = new Date(date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
            if (!groups[monthKey]) {
                groups[monthKey] = []
            }
            groups[monthKey].push(date)
        })
        return groups
    }

    // Step indicator component
    const StepIndicator = () => {
        const steps = [
            { key: "date", label: "Data", icon: Clock },
            { key: "upload", label: "Upload", icon: Upload },
            { key: "preview", label: "Prévia", icon: FileText },
            { key: "validation", label: "Validação", icon: AlertTriangle },
            { key: "creation", label: "Criação", icon: Settings },
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
                    const isSkipped =
                        step.key === "creation" &&
                        !processedData?.missingCredentials?.length &&
                        !processedData?.missingCompanies?.length &&
                        currentIndex > 4

                    return (
                        <div key={step.key} className="flex items-center">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${isCompleted
                                    ? "bg-green-500 border-green-500 text-white"
                                    : isActive
                                        ? "bg-blue-500 border-blue-500 text-white"
                                        : isSkipped
                                            ? "bg-gray-200 border-gray-300 text-gray-400"
                                            : "bg-gray-100 border-gray-300 text-gray-400"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="ml-3">
                                <div
                                    className={`text-sm font-medium ${isActive
                                        ? "text-blue-600"
                                        : isCompleted
                                            ? "text-green-600"
                                            : isSkipped
                                                ? "text-gray-400"
                                                : "text-gray-400"
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

    // Check if can proceed with import
    const canProceedWithImport = () => {
        if (!processedData) return false
        const hasMissingCredentials = processedData.missingCredentials && processedData.missingCredentials.length > 0
        const hasMissingCompanies = processedData.missingCompanies && processedData.missingCompanies.length > 0
        const hasValidRows = processedData.validRows > 0
        return !hasMissingCredentials && !hasMissingCompanies && hasValidRows
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={evento?.name || ""}>
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="mb-8">
                    <button
                        className="text-white hover:text-white bg-purple-600 p-2 rounded-full flex items-center justify-center"
                        onClick={() => window.location.href = `/eventos/${params.id}`}
                    >
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

                        {/* Step 1: Date Selection */}
                        {currentStep === "date" && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center">
                                            <Calendar className="w-5 h-5 mr-2" />
                                            Selecionar Datas do Evento
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-600 mb-6">
                                            Selecione uma ou mais datas do evento para as quais os participantes serão importados.
                                        </p>

                                        {/* Calendar controls */}
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-blue-700 bg-blue-50">
                                                    {selectedEventDates.length} data(s) selecionada(s)
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleSelectAllDates}
                                                    className="text-blue-700 border-blue-300 hover:bg-blue-50 bg-transparent"
                                                >
                                                    Selecionar Todas
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleClearDates}
                                                    className="text-gray-600 border-gray-300 hover:bg-gray-50 bg-transparent"
                                                >
                                                    Limpar Seleção
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Calendar */}
                                        <div className="space-y-6">
                                            {Object.entries(groupDatesByMonth(getEventDates())).map(([month, dates]) => (
                                                <div key={month} className="border border-gray-200 rounded-lg p-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{month}</h3>
                                                    <div className="grid grid-cols-7 gap-2">
                                                        {/* Week header */}
                                                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                                                            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                                                {day}
                                                            </div>
                                                        ))}
                                                        {/* Days */}
                                                        {dates.map((date) => {
                                                            const isSelected = selectedEventDates.includes(date)
                                                            const isToday = date === new Date().toISOString().split("T")[0]
                                                            return (
                                                                <button
                                                                    key={date}
                                                                    onClick={() => handleDateSelect(date)}
                                                                    className={`
                                                                        relative p-3 rounded-lg text-center transition-all duration-200
                                                                        ${isSelected
                                                                            ? "bg-blue-600 text-white shadow-md"
                                                                            : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                                                                        }
                                                                        ${isToday ? "ring-2 ring-blue-300" : ""}
                                                                    `}
                                                                >
                                                                    <div className="text-sm font-medium">{getDayNumber(date)}</div>
                                                                    {isSelected && <Check className="w-4 h-4 absolute top-1 right-1" />}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Selected dates */}
                                        {selectedEventDates.length > 0 && (
                                            <div className="mt-6">
                                                <h4 className="text-sm font-medium text-gray-700 mb-3">Datas Selecionadas:</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedEventDates.map((date) => (
                                                        <Badge key={date} variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                                                            {formatDate(date)}
                                                            <button onClick={() => handleDateSelect(date)} className="ml-2 hover:text-blue-600">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-6">
                                            <Button
                                                onClick={() => setCurrentStep("upload")}
                                                disabled={selectedEventDates.length === 0}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                Próximo
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 2: Upload */}
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
                                                <strong>Colunas obrigatórias:</strong> nome, empresa, funcao
                                            </p>
                                            <p>
                                                <strong>Identificação:</strong> cpf OU rg (pelo menos um é obrigatório)
                                            </p>
                                            <p>
                                                <strong>Coluna opcional:</strong> credencial
                                            </p>
                                            <p>
                                                <strong>Formato CPF:</strong> aceita qualquer formato, será formatado automaticamente
                                            </p>
                                            <p>
                                                <strong>Formato RG:</strong> aceita qualquer formato, será formatado automaticamente
                                            </p>
                                            <p>
                                                <strong>Formato credencial:</strong> será convertida para maiúsculo automaticamente
                                            </p>
                                            <p>
                                                <strong>Data do evento:</strong> será selecionada antes da importação
                                            </p>
                                            <p>
                                                <strong>Limite:</strong> até 5000 participantes por importação
                                            </p>
                                        </div>
                                        <div className="mt-4">
                                            <Button onClick={downloadTemplate} variant="outline" className="w-full bg-transparent">
                                                <Download className="w-4 h-4 mr-2" />
                                                Baixar Modelo
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 3: Preview */}
                        {currentStep === "preview" && processedData && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Prévia dos Dados</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                Dados Válidos
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-green-600">{processedData.validRows}</div>
                                            <p className="text-sm text-gray-600">participantes prontos para importação</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <XCircle className="h-5 w-5 text-red-600" />
                                                Dados Inválidos
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-red-600">{processedData.invalidRows}</div>
                                            <p className="text-sm text-gray-600">participantes com problemas</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                                                Duplicatas
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-yellow-600">{processedData.duplicateRows}</div>
                                            <p className="text-sm text-gray-600">participantes duplicados</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="flex justify-between">
                                    <Button variant="outline" onClick={handlePrevStep}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Voltar
                                    </Button>
                                    <Button onClick={handleNextStep} disabled={processedData.invalidRows > 0}>
                                        Continuar
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Validation */}
                        {currentStep === "validation" && processedData && (
                            <div className="space-y-6">
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
                                                    onChange={(e) =>
                                                        setBatchConfig((prev) => ({
                                                            ...prev,
                                                            batchSize: Number(e.target.value),
                                                        }))
                                                    }
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
                                                        setBatchConfig((prev) => ({
                                                            ...prev,
                                                            pauseBetweenBatches: Number(e.target.value) * 1000,
                                                        }))
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
                                                        setBatchConfig((prev) => ({
                                                            ...prev,
                                                            pauseBetweenItems: Number(e.target.value),
                                                        }))
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

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Resumo da Validação</CardTitle>
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

                                        {/* Missing items summary */}
                                        {(processedData.missingCredentials.length > 0 || processedData.missingCompanies.length > 0) && (
                                            <Alert className="mb-4">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription>
                                                    Foram encontrados {processedData.missingCredentials.length} credenciais e{" "}
                                                    {processedData.missingCompanies.length} empresas que precisam ser criadas antes da importação.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="flex justify-between">
                                    <Button onClick={handlePrevStep} variant="outline">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Voltar
                                    </Button>
                                    <Button onClick={handleNextStep} className="bg-blue-600 hover:bg-blue-700">
                                        Continuar
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Creation */}
                        {currentStep === "creation" && processedData && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Criar Credenciais e Empresas</h3>
                                    <Badge variant="secondary">
                                        {(processedData.missingCredentials.length || 0) + (processedData.missingCompanies.length || 0)}{" "}
                                        itens para criar
                                    </Badge>
                                </div>

                                {/* Missing Credentials */}
                                {processedData.missingCredentials.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                Credenciais Faltantes ({processedData.missingCredentials.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {processedData.missingCredentials.map((cred) => (
                                                    <div key={cred.name} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-6 h-6 rounded border-2 border-gray-300"
                                                                style={{ backgroundColor: credentialColors[cred.name] || "#3B82F6" }}
                                                            />
                                                            <div>
                                                                <div className="font-medium">{cred.name}</div>
                                                                <div className="text-sm text-gray-600">{cred.count} participantes</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="color"
                                                                value={credentialColors[cred.name] || "#3B82F6"}
                                                                onChange={(e) =>
                                                                    setCredentialColors((prev) => ({
                                                                        ...prev,
                                                                        [cred.name]: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-8 h-8 rounded border cursor-pointer"
                                                                title="Escolher cor"
                                                            />
                                                            <Palette className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                                                <div className="text-sm text-blue-800">
                                                    <p className="font-medium mb-1">Configurações das credenciais:</p>
                                                    <p>• Evento: {evento?.name}</p>
                                                    <p>
                                                        • Dias de trabalho:{" "}
                                                        {selectedEventDates.map((date) => new Date(date).toLocaleDateString("pt-BR")).join(", ")}
                                                    </p>
                                                    <p>• Atribuição automática baseada na função do participante</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Missing Companies */}
                                {processedData.missingCompanies.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Building className="h-5 w-5 text-green-600" />
                                                Empresas Faltantes ({processedData.missingCompanies.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {processedData.missingCompanies.map((company) => (
                                                    <div
                                                        key={company.name}
                                                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Building className="w-5 h-5 text-green-600" />
                                                            <div>
                                                                <div className="font-medium">{company.name}</div>
                                                                <div className="text-sm text-gray-600">{company.count} participantes</div>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className="text-green-700">
                                                            Será criada
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 p-3 bg-green-100 rounded-lg">
                                                <div className="text-sm text-green-800">
                                                    <p className="font-medium mb-1">Configurações das empresas:</p>
                                                    <p>• Evento: {evento?.name}</p>
                                                    <p>
                                                        • Dias:{" "}
                                                        {selectedEventDates.map((date) => new Date(date).toISOString().slice(0, 10)).join(", ")}
                                                    </p>
                                                    <p>• Atribuição automática dos participantes</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Creation Summary */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Resumo da Criação</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                <FileText className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {processedData.missingCredentials.length}
                                                </div>
                                                <div className="text-sm text-gray-600">Credenciais</div>
                                            </div>
                                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                                <Building className="w-8 h-8 mx-auto text-green-600 mb-2" />
                                                <div className="text-2xl font-bold text-green-600">{processedData.missingCompanies.length}</div>
                                                <div className="text-sm text-gray-600">Empresas</div>
                                            </div>
                                        </div>

                                        <Alert>
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>
                                                Este processo criará automaticamente as credenciais e empresas necessárias. Haverá uma pausa
                                                entre cada criação para evitar sobrecarga do sistema.
                                            </AlertDescription>
                                        </Alert>

                                        <div className="mt-4">
                                            <Button
                                                onClick={handleStartCreation}
                                                className="w-full bg-purple-600 hover:bg-purple-700"
                                                disabled={creationProgress.isCreating}
                                            >
                                                {creationProgress.isCreating ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Criando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Criar Todos os Itens
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-between">
                                    <Button onClick={handlePrevStep} variant="outline">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Voltar
                                    </Button>
                                    <Button
                                        onClick={() => setCurrentStep("import")}
                                        disabled={!canProceedWithImport()}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {!canProceedWithImport() ? (
                                            "Crie todos os itens primeiro"
                                        ) : (
                                            <>
                                                Prosseguir para Importação
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 6: Import Progress */}
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

                                {!isImporting && (
                                    <div className="text-center">
                                        <Button
                                            onClick={handleStartImport}
                                            className="bg-green-600 hover:bg-green-700"
                                            disabled={!processedData || processedData.validRows === 0}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            Iniciar Importação ({processedData?.validRows || 0} participantes)
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 7: Complete */}
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
                                    <p>• Dados incluídos: nome, CPF, empresa, função, email, telefone, dias de trabalho, etc.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Creation Progress Dialog */}
                <Dialog open={isCreationDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {creationProgress.type === "credential" ? (
                                    <>
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        Criando Credenciais
                                    </>
                                ) : (
                                    <>
                                        <Building className="h-5 w-5 text-green-600" />
                                        Criando Empresas
                                    </>
                                )}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center justify-center py-6">
                            <div
                                className={`h-8 w-8 mb-4 animate-spin rounded-full border-4 border-t-transparent ${creationProgress.type === "credential" ? "border-blue-500" : "border-green-500"
                                    }`}
                            />
                            <div className="text-center space-y-2">
                                <div className="text-sm text-gray-600">
                                    <p>
                                        Item atual: <strong>{creationProgress.currentItem}</strong>
                                    </p>
                                    <p>
                                        Progresso: <strong>{creationProgress.current}</strong> de <strong>{creationProgress.total}</strong>
                                    </p>
                                </div>
                                {creationProgress.total > 0 && (
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${creationProgress.type === "credential" ? "bg-blue-600" : "bg-green-600"
                                                }`}
                                            style={{ width: `${(creationProgress.current / creationProgress.total) * 100}%` }}
                                        />
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    {creationProgress.type === "credential"
                                        ? "Aguardando 1 segundo entre cada criação..."
                                        : "Aguardando 3 segundos entre cada criação..."}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShouldCancelCreation(true)}
                                    className="mt-4 text-red-600 border-red-300 hover:bg-red-50"
                                >
                                    Cancelar Criação
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </EventLayout>
    )
}
