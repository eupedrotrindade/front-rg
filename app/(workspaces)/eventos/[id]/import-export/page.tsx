/* eslint-disable prefer-const */
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
    Sun,
    Moon,
} from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCreateEventParticipant } from "@/features/eventos/api/mutation/use-create-event-participant"
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event"
import { useCreateCredential } from "@/features/eventos/api/mutation/use-credential-mutations"
import { useEmpresasByEvent } from "@/features/eventos/api/query/use-empresas"
import { useCreateEmpresa } from "@/features/eventos/api/mutation"
import type { EventParticipant, CreateCredentialRequest, CreateEmpresaRequest, CreateEventParticipantRequest } from "@/features/eventos/types"
import type { EventParticipantSchema } from "@/features/eventos/schemas"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatEventDate } from "@/lib/utils"

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
    success: CreateEventParticipantRequest[]
    errors: Array<{ item: any; error: string; row: number }>
    duplicates: Array<{ item: any; existing: EventParticipant; row: number }>
}
type dataType = {
    cpf: string
    nome: string
    funcao: string
    empresa: string
    credencial: string
}
interface ProcessedData {
    fileName: string
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateRows: number
    data: dataType[]
    errors: Array<{ item: any; error: string; row: number }>
    duplicates: Array<{ item: any; existing: EventParticipant; row: number }>
    warnings: Array<{ item: any; warning: string; row: number }>
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

type ImportStep = "date" | "upload" | "preview" | "validation" | "creation" | "verification" | "import" | "complete"

export default function ImportExportPage() {
    const params = useParams()
    const eventId = params.id as string
    const [activeTab, setActiveTab] = useState<"import" | "export">("import")

    // Import States
    const [currentStep, setCurrentStep] = useState<ImportStep>("date")
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, percentage: 0 })
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
        batchSize: 10, // Reduced for Supabase
        pauseBetweenBatches: 15000, // 15 seconds
        pauseBetweenItems: 1000, // 1 second
        maxRetries: 3,
        backoffMultiplier: 2,
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

    // Rate limiting e controle de carga
    const [apiMetrics, setApiMetrics] = useState({
        consecutiveErrors: 0,
        lastErrorTime: null as Date | null,
        avgResponseTime: 0,
        totalRequests: 0,
        isThrottled: false,
    })

    // API Hooks
    const { data: participants = [] } = useEventParticipantsByEvent({ eventId })
    const { mutate: createParticipant } = useCreateEventParticipant()
    const { data: credentials = [], refetch: refetchCredentials } = useCredentialsByEvent(eventId)
    const { mutate: createCredential } = useCreateCredential()
    const { data: empresas = [], refetch: refetchEmpresas } = useEmpresasByEvent(eventId)
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

    // Document handling functions
    const unformatDocument = (document: string): string => {
        if (!document) return ""
        return document.toString().replace(/[^\d]/g, "")
    }

    const formatDocumentForStorage = (document: string): string => {
        if (!document) return "00000000000"

        const cleaned = unformatDocument(document)
        if (cleaned.length === 0) return "00000000000"

        if (cleaned.length === 11) {
            // Se tem 11 dígitos, é CPF - manter como está
            return cleaned
        } else {
            // Qualquer outro tamanho, pad para 11 dígitos para compatibilidade com o sistema
            return cleaned.padStart(11, "0")
        }
    }

    const validateParticipant = (data: any): { isValid: boolean; errors: string[]; warnings: string[] } => {
        const errors: string[] = []
        const warnings: string[] = []

        // Validação detalhada do nome
        if (!data.nome) {
            errors.push("❌ CAMPO OBRIGATÓRIO: Nome não foi informado ou está em branco")
        } else if (data.nome.toString().trim().length < 2) {
            errors.push(`❌ NOME INVÁLIDO: "${data.nome}" tem apenas ${data.nome.toString().trim().length} caractere(s), mínimo são 2`)
        } else if (data.nome.toString().trim().length > 100) {
            errors.push(`❌ NOME MUITO LONGO: "${data.nome}" tem ${data.nome.toString().trim().length} caracteres, máximo são 100`)
        }

        // Validação detalhada da empresa
        if (!data.empresa) {
            errors.push("❌ CAMPO OBRIGATÓRIO: Empresa não foi informada ou está em branco")
        } else if (data.empresa.toString().trim().length < 2) {
            errors.push(`❌ EMPRESA INVÁLIDA: "${data.empresa}" tem apenas ${data.empresa.toString().trim().length} caractere(s), mínimo são 2`)
        } else if (data.empresa.toString().trim().length > 100) {
            errors.push(`❌ EMPRESA MUITO LONGA: "${data.empresa}" tem ${data.empresa.toString().trim().length} caracteres, máximo são 100`)
        }

        // Validação detalhada da função
        if (!data.funcao) {
            errors.push("❌ CAMPO OBRIGATÓRIO: Função não foi informada ou está em branco")
        } else if (data.funcao.toString().trim().length < 2) {
            errors.push(`❌ FUNÇÃO INVÁLIDA: "${data.funcao}" tem apenas ${data.funcao.toString().trim().length} caractere(s), mínimo são 2`)
        } else if (data.funcao.toString().trim().length > 100) {
            errors.push(`❌ FUNÇÃO MUITO LONGA: "${data.funcao}" tem ${data.funcao.toString().trim().length} caracteres, máximo são 100`)
        }

        // Validação de credencial (se fornecida)
        if (data.credencial && data.credencial.toString().trim().length > 0) {
            if (data.credencial.toString().trim().length < 2) {
                errors.push(`❌ CREDENCIAL INVÁLIDA: "${data.credencial}" tem apenas ${data.credencial.toString().trim().length} caractere(s), mínimo são 2`)
            } else if (data.credencial.toString().trim().length > 100) {
                errors.push(`❌ CREDENCIAL MUITO LONGA: "${data.credencial}" tem ${data.credencial.toString().trim().length} caracteres, máximo são 100`)
            }
        }

        // Validação simplificada de documento - aceita qualquer valor nas colunas CPF ou RG
        let hasDocument = false
        let documentInfo = []

        // Verificar coluna CPF
        if (data.cpf && data.cpf.toString().trim() !== "") {
            hasDocument = true
            documentInfo.push(`CPF: ${data.cpf}`)
        }

        // Verificar coluna RG
        if (data.rg && data.rg.toString().trim() !== "") {
            hasDocument = true
            documentInfo.push(`RG: ${data.rg}`)
        }

        // Permitir participantes sem documento mas mostrar aviso
        if (!hasDocument) {
            warnings.push(`⚠️ SEM DOCUMENTO: ${data.nome || 'Nome não informado'} não possui CPF nem RG preenchido - será processado mesmo assim`)
        } else {
            warnings.push(`✅ DOCUMENTO OK: ${documentInfo.join(', ')}`)
        }

        // Validação adicional de caracteres especiais problemáticos
        const fieldsToCheck = ['nome', 'empresa', 'funcao', 'credencial']
        fieldsToCheck.forEach(field => {
            if (data[field]) {
                const value = data[field].toString()
                const problematicChars = value.match(/[^\w\sÀ-ÿ\-\.]/g)
                if (problematicChars) {
                    warnings.push(`⚠️ CARACTERES ESPECIAIS em ${field.toUpperCase()}: "${problematicChars.join('')}" podem causar problemas`)
                }
            }
        })

        return {
            isValid: errors.length === 0, // Bloquear apenas em erros reais
            errors,
            warnings,
        }
    }

    // Normalization functions
    const normalizeCredentialName = (name: string): string => {
        return name.toString().trim().toUpperCase()
    }

    const normalizeCompanyName = (name: string): string => {
        return name.toString().trim().toUpperCase()
    }

    const normalizeStaffName = (name: string): string => {
        return name.toString().trim().toUpperCase()
    }

    const normalizeFunctionName = (name: string): string => {
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

    // Creation functions with verification - CREATE FOR ALL SELECTED SHIFTS
    const createCredentialFunction = async (name: string, color: string): Promise<{ success: boolean; id: string | null }> => {
        const normalizedName = normalizeCredentialName(name)
        
        if (selectedEventDates.length === 0) {
            console.warn('⚠️ Nenhum turno selecionado para criar credencial')
            return { success: false, id: null }
        }

        console.log(`🎫 Criando credencial "${normalizedName}" para ${selectedEventDates.length} turnos:`, selectedEventDates)

        // Create credential for EACH selected shift
        const results: { success: boolean; id: string | null }[] = []
        
        for (let i = 0; i < selectedEventDates.length; i++) {
            const shiftId = selectedEventDates[i]
            const { dateISO, stage, period } = parseShiftId(shiftId)
            
            const shiftData = {
                shiftId: shiftId,
                workDate: dateISO,
                workStage: stage as 'montagem' | 'evento' | 'desmontagem',
                workPeriod: period
            }

            console.log(`📝 Criando credencial ${i + 1}/${selectedEventDates.length}:`, {
                nome: normalizedName,
                turno: shiftId,
                data: dateISO,
                estagio: stage,
                periodo: period
            })

            const credentialData: CreateCredentialRequest = {
                nome: `${normalizedName}`,
                id_events: eventId,
                days_works: [shiftId], // One shift per credential
                cor: color,
                // ✅ Add shift-based fields for this specific shift
                shiftId: shiftData.shiftId,
                workDate: shiftData.workDate,
                workStage: shiftData.workStage,
                workPeriod: shiftData.workPeriod,
            }

            const result = await new Promise<{ success: boolean; id: string | null }>((resolve) => {
                createCredential(credentialData, {
                    onSuccess: async (data) => {
                        console.log(`✅ Credencial criada para turno ${shiftId}:`, data)
                        
                        // Wait and verify creation
                        setTimeout(async () => {
                            await refetchCredentials()
                            resolve({ success: true, id: data.id })
                        }, 1000)
                    },
                    onError: (error) => {
                        console.error(`❌ Erro ao criar credencial para turno ${shiftId}:`, error)
                        resolve({ success: false, id: null })
                    },
                })
            })

            results.push(result)

            // Pause between creations to avoid API overload
            if (i < selectedEventDates.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500))
            }
        }

        // Return success if at least one credential was created successfully
        const successfulCreations = results.filter(r => r.success).length
        const allSuccessful = successfulCreations === selectedEventDates.length

        console.log(`📊 Resultado criação credencial "${normalizedName}":`, {
            total: selectedEventDates.length,
            sucessos: successfulCreations,
            falhas: selectedEventDates.length - successfulCreations,
            todosSucessos: allSuccessful
        })

        if (allSuccessful) {
            toast.success(`✅ Credencial "${normalizedName}" criada para todos os ${selectedEventDates.length} turnos`)
        } else if (successfulCreations > 0) {
            toast.warning(`⚠️ Credencial "${normalizedName}" criada para ${successfulCreations} de ${selectedEventDates.length} turnos`)
        } else {
            toast.error(`❌ Falha ao criar credencial "${normalizedName}" para todos os turnos`)
        }

        return { 
            success: successfulCreations > 0, 
            id: results.find(r => r.success)?.id || null 
        }
    }

    const createCompanyFunction = async (name: string): Promise<{ success: boolean; id: string | null }> => {
        const normalizedName = normalizeCompanyName(name)
        
        if (selectedEventDates.length === 0) {
            console.warn('⚠️ Nenhum turno selecionado para criar empresa')
            return { success: false, id: null }
        }

        console.log(`🏢 Criando empresa "${normalizedName}" para ${selectedEventDates.length} turnos:`, selectedEventDates)

        // Create company for EACH selected shift
        const results: { success: boolean; id: string | null }[] = []
        
        for (let i = 0; i < selectedEventDates.length; i++) {
            const shiftId = selectedEventDates[i]
            const { dateISO, stage, period } = parseShiftId(shiftId)
            
            const shiftData = {
                shiftId: shiftId,
                workDate: dateISO,
                workStage: stage as 'montagem' | 'evento' | 'desmontagem',
                workPeriod: period
            }

            console.log(`📝 Criando empresa ${i + 1}/${selectedEventDates.length}:`, {
                nome: normalizedName,
                turno: shiftId,
                data: dateISO,
                estagio: stage,
                periodo: period
            })

            const companyData: CreateEmpresaRequest = {
                nome: normalizedName,
                id_evento: eventId,
                days: [shiftId], // One shift per company
                // ✅ Add shift-based fields for this specific shift
                shiftId: shiftData.shiftId,
                workDate: shiftData.workDate,
                workStage: shiftData.workStage,
                workPeriod: shiftData.workPeriod,
            }

            const result = await new Promise<{ success: boolean; id: string | null }>((resolve) => {
                createEmpresa(companyData, {
                    onSuccess: async (data) => {
                        console.log(`✅ Empresa criada para turno ${shiftId}:`, data)
                        
                        // If we get creation data, consider it success
                        if (data && data.id) {
                            resolve({ success: true, id: data.id })
                            
                            // Background refresh
                            setTimeout(async () => {
                                try {
                                    await refetchEmpresas()
                                } catch (error) {
                                    console.warn('⚠️ Erro ao atualizar cache de empresas:', error)
                                }
                            }, 1000)
                            
                            return
                        }

                        // Fallback verification
                        setTimeout(async () => {
                            try {
                                await refetchEmpresas()
                                await new Promise(r => setTimeout(r, 1500))

                                const verifyCreation = findCompanyByName(normalizedName)
                                resolve({
                                    success: !!verifyCreation,
                                    id: verifyCreation?.id || null
                                })
                            } catch (error) {
                                console.error('❌ Erro na verificação da empresa:', error)
                                resolve({ success: true, id: null })
                            }
                        }, 2500)
                    },
                    onError: (error) => {
                        console.error(`❌ Erro ao criar empresa para turno ${shiftId}:`, error)
                        resolve({ success: false, id: null })
                    },
                })
            })

            results.push(result)

            // Pause between creations to avoid API overload
            if (i < selectedEventDates.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000))
            }
        }

        // Return success if at least one company was created successfully
        const successfulCreations = results.filter(r => r.success).length
        const allSuccessful = successfulCreations === selectedEventDates.length

        console.log(`📊 Resultado criação empresa "${normalizedName}":`, {
            total: selectedEventDates.length,
            sucessos: successfulCreations,
            falhas: selectedEventDates.length - successfulCreations,
            todosSucessos: allSuccessful
        })

        if (allSuccessful) {
            toast.success(`✅ Empresa "${normalizedName}" criada para todos os ${selectedEventDates.length} turnos`)
        } else if (successfulCreations > 0) {
            toast.warning(`⚠️ Empresa "${normalizedName}" criada para ${successfulCreations} de ${selectedEventDates.length} turnos`)
        } else {
            toast.error(`❌ Falha ao criar empresa "${normalizedName}" para todos os turnos`)
        }

        return { 
            success: successfulCreations > 0, 
            id: results.find(r => r.success)?.id || null 
        }
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
            // Go to verification step after creation
            setCurrentStep("verification")
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

            const result = await createCredentialFunction(credential.name, color)

            setCreationProgress((prev) => ({
                ...prev,
                completed: result.success ? [...prev.completed, credential.name] : prev.completed,
                failed: !result.success ? [...prev.failed, credential.name] : prev.failed,
            }))

            if (!result.success) {
                toast.error(`Falha ao criar credencial: ${credential.name}`)
            } else {
                toast.success(`Credencial criada: ${credential.name}`)
            }

            // Pause between creations
            if (i < processedData.missingCredentials.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 2000))
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

            const result = await createCompanyFunction(company.name)

            setCreationProgress((prev) => ({
                ...prev,
                completed: result.success ? [...prev.completed, company.name] : prev.completed,
                failed: !result.success ? [...prev.failed, company.name] : prev.failed,
            }))

            if (!result.success) {
                toast.error(`❌ Falha ao criar empresa: ${company.name}`)
                console.error(`❌ Empresa não foi criada: ${company.name}`)
            } else {
                toast.success(`✅ Empresa criada: ${company.name}`)
                console.log(`✅ Empresa criada com sucesso: ${company.name}`)
            }

            // Pause between creations
            if (i < processedData.missingCompanies.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 3000))
            }
        }
    }

    const handleVerificationStep = async () => {
        if (!uploadedFile) return

        try {
            console.log('🔍 Iniciando verificação...')

            // Wait longer to ensure all creations are processed
            await new Promise((resolve) => setTimeout(resolve, 3000))

            // Refetch both credentials and companies
            await Promise.all([
                refetchCredentials(),
                refetchEmpresas()
            ])

            // Wait a bit more for the refetch to complete
            await new Promise((resolve) => setTimeout(resolve, 2000))

            // Reprocess the file to check if all items now exist
            const newProcessedData = await processExcelFile(uploadedFile)
            setProcessedData(newProcessedData)

            const successCount = creationProgress.completed.length
            const failedCount = creationProgress.failed.length

            // Verify that creation was actually successful
            const stillMissingCredentials = newProcessedData.missingCredentials.length
            const stillMissingCompanies = newProcessedData.missingCompanies.length

            console.log('🔍 Verificação final:', {
                successCount,
                failedCount,
                stillMissingCredentials,
                stillMissingCompanies,
                totalCredentials: credentials.length,
                totalEmpresas: empresas?.length
            })

            if (stillMissingCredentials === 0 && stillMissingCompanies === 0) {
                toast.success("✅ Todas as credenciais e empresas foram criadas com sucesso! Pronto para importar.")
            } else {
                if (stillMissingCredentials > 0) {
                    toast.error(`❌ Ainda faltam ${stillMissingCredentials} credenciais`)
                }
                if (stillMissingCompanies > 0) {
                    toast.error(`❌ Ainda faltam ${stillMissingCompanies} empresas`)
                }
            }

            if (failedCount > 0) {
                toast.error(`❌ ${failedCount} itens falharam ao serem criados`)
            }
        } catch (error) {
            console.error("Erro ao verificar dados:", error)
            toast.error("Erro ao verificar dados após criação")
        }
    }

    // Process Excel file
    const processExcelFile = useCallback(async (file: File): Promise<ProcessedData> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = async (e) => {
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
                        warnings: [],
                        missingCredentials: [],
                        missingCompanies: [],
                    }

                    // Initialize processing progress
                    setProcessingProgress({ current: 0, total: jsonData.length, percentage: 0 })

                    const existingCPFs = new Set(participants.map((p) => p.cpf.replace(/\D/g, "")))
                    const processedCPFs = new Set<string>()
                    const credentialCounts: { [key: string]: number } = {}
                    const companyCounts: { [key: string]: number } = {}

                    // Process data in chunks to prevent UI freezing (100 rows per chunk)
                    console.log(`🚀 Processing ${jsonData.length} rows in chunks of 100 for better performance`)

                    for (let i = 0; i < jsonData.length; i += 100) {
                        const chunk = jsonData.slice(i, Math.min(i + 100, jsonData.length))

                        // Update processing progress for better UX
                        const processed = Math.min(i + 100, jsonData.length)
                        const percentage = Math.round((processed / jsonData.length) * 100)
                        setProcessingProgress({ current: processed, total: jsonData.length, percentage })

                        // Process chunk
                        chunk.forEach((row, chunkIndex) => {
                            const index = i + chunkIndex
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

                            // Handle warnings for participants without CPF/RG
                            if (validation.warnings.length > 0) {
                                validation.warnings.forEach(warning => {
                                    result.warnings.push({
                                        item: row,
                                        warning: warning,
                                        row: rowNumber,
                                    })
                                })
                            }

                            const cleanedCPF = row.cpf ? row.cpf.toString().replace(/\D/g, "") : ""
                            const cleanedRG = row.rg ? row.rg.toString().replace(/\D/g, "") : ""

                            // Check for duplicates in existing participants
                            const isDuplicateExisting = existingCPFs.has(cleanedCPF) || (cleanedRG && existingCPFs.has(cleanedRG))

                            if (isDuplicateExisting) {
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
                                    return // Skip this duplicate
                                }
                            }

                            // Check for duplicates within the file (only upload first occurrence)
                            const hasDuplicateInFile =
                                (cleanedCPF && processedCPFs.has(cleanedCPF)) || (cleanedRG && processedCPFs.has(cleanedRG))

                            if (hasDuplicateInFile) {
                                result.duplicates.push({
                                    item: row,
                                    existing: {} as EventParticipant,
                                    row: rowNumber,
                                })
                                result.duplicateRows++
                                return // Skip this duplicate - first occurrence already processed
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

                            // Store simplified participant data for validation and processing
                            const participantData = {
                                eventId: eventId,
                                credentialId: credentialId,
                                name: row.nome.toString().trim(),
                                cpf: (() => {
                                    // Priorizar coluna CPF, depois RG
                                    if (row.cpf && row.cpf.toString().trim() !== "") {
                                        return formatDocumentForStorage(row.cpf.toString())
                                    }
                                    if (row.rg && row.rg.toString().trim() !== "") {
                                        return formatDocumentForStorage(row.rg.toString())
                                    }
                                    return "00000000000"
                                })(),
                                email: row.email?.toString().trim() || undefined,
                                phone: row.phone?.toString().trim() || undefined,
                                role: row.funcao.toString().trim(),
                                company: row.empresa.toString().trim(),
                                // Additional fields preserved for reference
                                staffId: row.staffId || undefined,
                                notes: row.notes?.toString().trim() || undefined,
                                validatedBy: row.validatedBy || undefined,
                            }

                            result.data.push({
                                cpf: participantData.cpf,
                                nome: participantData.name,
                                funcao: participantData.role || "",
                                empresa: participantData.company || "",
                                credencial: participantData.credentialId || "",
                            })
                            result.validRows++
                        })

                        // Yield to browser after each chunk to prevent UI freezing
                        if (i + 100 < jsonData.length) {
                            await new Promise((resolve) => setTimeout(resolve, 0))
                        }
                    }

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

                    // Reset processing progress
                    setProcessingProgress({ current: 0, total: 0, percentage: 0 })

                    resolve(result)
                } catch (error) {
                    reject(new Error("Erro ao processar arquivo Excel"))
                }
            }
            reader.onerror = () => reject(new Error("Erro ao ler arquivo"))
            reader.readAsArrayBuffer(file)
        })
    }, [participants, eventId, findCredentialByName, findCompanyByName, formatDocumentForStorage])

    // Import participants with optimized batch processing
    const importParticipants = async (participants: CreateEventParticipantRequest[]) => {
        const { batchSize, pauseBetweenBatches, pauseBetweenItems } = batchConfig
        const totalBatches = Math.ceil(participants.length / batchSize)
        let success = 0
        let errors = 0

        console.log(`🚀 Starting import of ${participants.length} participants in ${totalBatches} batches`)
        console.log(`📊 Batch config: ${batchSize} per batch, ${pauseBetweenBatches}ms between batches, ${pauseBetweenItems}ms per item`)

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

            // Give browser time to update UI before processing batch (prevents UI freezing)
            await new Promise((resolve) => setTimeout(resolve, 0))

            for (let i = 0; i < batch.length; i++) {
                const participant = batch[i]
                const globalIndex = startIndex + i

                setProgress((prev) => ({
                    ...prev,
                    processed: globalIndex + 1,
                    currentItem: `Lote ${batchIndex + 1}/${totalBatches} - ${participant.name} (${i + 1}/${batch.length})`,
                }))

                // Yield to browser every 5 participants to keep UI responsive
                if (i % 5 === 0 && i > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 0))
                }

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

        console.log(`✅ Import completed: ${success} successful, ${errors} errors out of ${participants.length} participants`)
        return { success, errors }
    }

    // Step handlers
    const handleFileUpload = useCallback(async (file: File) => {
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
    }, [processExcelFile])

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
            setCurrentStep("verification")
        } else if (currentStep === "verification") {
            setCurrentStep("import")
        }
    }

    const handlePrevStep = () => {
        if (currentStep === "verification") {
            setCurrentStep("creation")
        } else if (currentStep === "creation") {
            setCurrentStep("validation")
        } else if (currentStep === "validation") {
            setCurrentStep("preview")
        } else if (currentStep === "import") {
            if (processedData?.missingCredentials?.length || processedData?.missingCompanies?.length) {
                setCurrentStep("verification")
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
            // Create participant entries for each shift (new shift-based system)
            const participantsWithShifts: CreateEventParticipantRequest[] = []
            
            processedData.data.forEach((item) => {
                selectedEventDates.forEach((shiftId) => {
                    const { dateISO, stage, period } = parseShiftId(shiftId)
                    
                    participantsWithShifts.push({
                        eventId: eventId,
                        name: normalizeStaffName(item.nome), // Normalizar nome para maiúsculas
                        cpf: item.cpf,
                        role: normalizeFunctionName(item.funcao), // Normalizar função para maiúsculas
                        company: normalizeCompanyName(item.empresa), // Normalizar empresa para maiúsculas
                        credentialId: item.credencial,
                        // New shift-based fields
                        shiftId: shiftId,
                        workDate: dateISO,
                        workStage: stage as "montagem" | "evento" | "desmontagem",
                        workPeriod: period,
                        validatedBy: "Sistema - Importação em Massa"
                    })
                })
            })
            
            const result = await importParticipants(participantsWithShifts)
            setImportResult({
                success: participantsWithShifts,
                errors: processedData.errors,
                duplicates: processedData.duplicates,
            })
            setCurrentStep("complete")
            const totalParticipants = processedData.data.length
            const totalShifts = selectedEventDates.length
            const totalImported = result.success
            toast.success(`Importação concluída! ${totalImported} registros de participantes x turnos criados (${totalParticipants} participantes em ${totalShifts} turno(s)).`)
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
    }, [handleFileUpload])

    // Helper function to calculate work time
    const calculateWorkTime = (checkIn: string | null, checkOut: string | null): string => {
        if (!checkIn || !checkOut) return "";

        try {
            const checkInTime = new Date(checkIn);
            const checkOutTime = new Date(checkOut);

            if (checkInTime >= checkOutTime) return "";

            const diffMs = checkOutTime.getTime() - checkInTime.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            return `${diffHours}h ${diffMinutes}min`;
        } catch (error) {
            return "";
        }
    }

    // Export function with complete data
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
                
                // Shift-based system fields
                Turno_ID: p.shiftId || "",
                Data_Trabalho: p.workDate || "",
                Estagio: p.workStage ? p.workStage.toUpperCase() : "",
                Periodo: p.workPeriod ? (p.workPeriod === 'diurno' ? 'DIURNO' : 'NOTURNO') : "",
                
                // Legacy field for compatibility (using workDate if available)
                Dias_Trabalho: p.daysWork?.join(", ") || (p.workDate ? formatEventDate(p.workDate + 'T00:00:00') : ""),
                
                Check_in: p.checkIn ? formatEventDate(p.checkIn) : "",
                Horario_Check_in: p.checkIn ? new Date(p.checkIn).toLocaleTimeString('pt-BR') : "",
                Check_out: p.checkOut ? formatEventDate(p.checkOut) : "",
                Horario_Check_out: p.checkOut ? new Date(p.checkOut).toLocaleTimeString('pt-BR') : "",
                Tempo_Trabalho: calculateWorkTime(p.checkIn ?? null, p.checkOut ?? null),
                Status_Presenca: p.checkIn ? (p.checkOut ? "COMPLETO" : "PRESENTE") : "AUSENTE",
                Validado_Por: p.validatedBy || "",
                Observações: p.notes || "",
                Data_Criação: (p as any).created_at ? formatEventDate((p as any).created_at) : "",
                Ultima_Atualizacao: (p as any).updated_at ? formatEventDate((p as any).updated_at) : "",
            }))

            const ws = XLSX.utils.json_to_sheet(exportData)

            // Definir largura das colunas para melhor visualização
            const wscols = [
                { wch: 25 }, // Nome
                { wch: 15 }, // CPF
                { wch: 20 }, // Empresa
                { wch: 15 }, // Função
                { wch: 25 }, // Email
                { wch: 15 }, // Telefone
                { wch: 30 }, // Dias Trabalho
                { wch: 12 }, // Check-in
                { wch: 12 }, // Horário Check-in
                { wch: 12 }, // Check-out
                { wch: 12 }, // Horário Check-out
                { wch: 15 }, // Tempo Trabalho
                { wch: 12 }, // Status Presença
                { wch: 15 }, // Validado Por
                { wch: 30 }, // Observações
                { wch: 12 }, // Data Criação
                { wch: 12 }, // Última Atualização
            ];
            ws['!cols'] = wscols;

            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Participantes")
            XLSX.writeFile(wb, `participantes-completo-${eventId}-${new Date().toISOString().split("T")[0]}.xlsx`)
            toast.success("Exportação completa concluída com sucesso!")
        } catch (error) {
            console.error("Erro na exportação:", error);
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

    // Date functions - Processa diretamente dos objetos SimpleEventDay do evento
    const getEventDates = () => {
        if (!evento) return [];
        
        const shiftIds: string[] = [];
        
        // Processar nova estrutura SimpleEventDay diretamente
        const processEventPhase = (phaseData: any, phaseName: 'montagem' | 'evento' | 'desmontagem') => {
            if (!phaseData) return;
            
            let eventDays: any[] = [];
            
            try {
                // Se for string JSON, fazer parse
                if (typeof phaseData === 'string') {
                    eventDays = JSON.parse(phaseData);
                }
                // Se já for array, usar diretamente  
                else if (Array.isArray(phaseData)) {
                    eventDays = phaseData;
                }
                // Se não for nem string nem array, sair
                else {
                    return;
                }
                
                // Processar cada SimpleEventDay
                eventDays.forEach(eventDay => {
                    if (eventDay && eventDay.date && eventDay.period) {
                        // Usar diretamente os dados do SimpleEventDay
                        const dateISO = eventDay.date; // já no formato YYYY-MM-DD
                        const period = eventDay.period; // 'diurno' ou 'noturno'
                        
                        const shiftId = `${dateISO}-${phaseName}-${period}`;
                        
                        // Evitar duplicatas
                        if (!shiftIds.includes(shiftId)) {
                            shiftIds.push(shiftId);
                        }
                    }
                });
            } catch (error) {
                console.warn(`Erro ao processar ${phaseName}:`, error);
            }
        };
        
        // Processar cada fase do evento usando a nova estrutura
        processEventPhase(evento.montagem, 'montagem');
        processEventPhase(evento.evento, 'evento'); 
        processEventPhase(evento.desmontagem, 'desmontagem');
        
        // Fallback para estrutura legacy (apenas se não tiver a nova estrutura)
        if (shiftIds.length === 0) {
            console.warn('🔄 Usando fallback para estrutura legacy de eventos');
            
            // Legacy: setupStartDate/setupEndDate = montagem
            if (evento.setupStartDate && evento.setupEndDate) {
                const startDate = new Date(evento.setupStartDate);
                const endDate = new Date(evento.setupEndDate);
                const currentDate = new Date(startDate);
                
                while (currentDate <= endDate) {
                    const dateISO = currentDate.toISOString().split("T")[0];
                    shiftIds.push(`${dateISO}-montagem-diurno`);
                    shiftIds.push(`${dateISO}-montagem-noturno`);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            
            // Legacy: preparationStartDate/preparationEndDate = evento
            if (evento.preparationStartDate && evento.preparationEndDate) {
                const startDate = new Date(evento.preparationStartDate);
                const endDate = new Date(evento.preparationEndDate);
                const currentDate = new Date(startDate);
                
                while (currentDate <= endDate) {
                    const dateISO = currentDate.toISOString().split("T")[0];
                    shiftIds.push(`${dateISO}-evento-diurno`);
                    shiftIds.push(`${dateISO}-evento-noturno`);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            
            // Legacy: finalizationStartDate/finalizationEndDate = desmontagem
            if (evento.finalizationStartDate && evento.finalizationEndDate) {
                const startDate = new Date(evento.finalizationStartDate);
                const endDate = new Date(evento.finalizationEndDate);
                const currentDate = new Date(startDate);
                
                while (currentDate <= endDate) {
                    const dateISO = currentDate.toISOString().split("T")[0];
                    shiftIds.push(`${dateISO}-desmontagem-diurno`);
                    shiftIds.push(`${dateISO}-desmontagem-noturno`);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        }
        
        // Ordenar cronologicamente e por hierarquia
        shiftIds.sort((a, b) => {
            const { dateISO: dateA, stage: stageA, period: periodA } = parseShiftId(a);
            const { dateISO: dateB, stage: stageB, period: periodB } = parseShiftId(b);
            
            // Primeiro por data
            if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
            }
            
            // Depois por estágio (montagem -> evento -> desmontagem)
            const stageOrder = { 'montagem': 1, 'evento': 2, 'desmontagem': 3 };
            const orderA = stageOrder[stageA as keyof typeof stageOrder] || 2;
            const orderB = stageOrder[stageB as keyof typeof stageOrder] || 2;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            
            // Por último por período (diurno antes de noturno)
            return periodA === 'diurno' ? -1 : 1;
        });
        
        console.log('📅 Turnos processados:', {
            total: shiftIds.length,
            montagem: shiftIds.filter(id => id.includes('-montagem-')).length,
            evento: shiftIds.filter(id => id.includes('-evento-')).length,
            desmontagem: shiftIds.filter(id => id.includes('-desmontagem-')).length
        });
        
        return shiftIds;
    }

    // Função para extrair informações do ID do turno
    const parseShiftId = (shiftId: string) => {
        const parts = shiftId.split('-');
        if (parts.length >= 5) {
            // Formato: YYYY-MM-DD-stage-period
            const dateISO = `${parts[0]}-${parts[1]}-${parts[2]}`;
            const stage = parts[3];
            const period = parts[4] as 'diurno' | 'noturno';
            return { dateISO, stage, period };
        }
        // Fallback para IDs mal formados
        console.warn('⚠️ ShiftId mal formatado:', shiftId);
        return { dateISO: new Date().toISOString().split('T')[0], stage: 'evento', period: 'diurno' as 'diurno' | 'noturno' };
    };

    // Função para obter informações de exibição de um turno
    const getShiftDisplayInfo = (shiftId: string) => {
        const { dateISO, stage, period } = parseShiftId(shiftId);
        const formattedDate = formatEventDate(dateISO + 'T00:00:00');
        const stageUpper = stage.toUpperCase();
        const periodLabel = period === 'diurno' ? 'DIURNO' : 'NOTURNO';
        
        return {
            dateISO,
            stage,
            period,
            formattedDate,
            displayLabel: `${formattedDate} (${stageUpper} - ${periodLabel})`
        };
    };

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

    // Helper function to extract date from shiftId and format it
    const formatShiftDate = (shiftId: string) => {
        const { dateISO } = parseShiftId(shiftId);
        const fullDate = formatEventDate(dateISO + 'T00:00:00');
        
        const date = new Date(dateISO + 'T12:00:00');
        const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" });
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString("pt-BR", { month: "short" });

        return `${weekday}, ${day} ${month}`;
    }

    // Helper function to get day number from shiftId
    const getShiftDayNumber = (shiftId: string) => {
        const { dateISO } = parseShiftId(shiftId);
        return new Date(dateISO + 'T12:00:00').getDate();
    }

    // Group shifts by month - groups shiftIds by their month
    const groupShiftsByMonth = (shiftIds: string[]) => {
        const groups: { [key: string]: string[] } = {}
        shiftIds.forEach((shiftId) => {
            const { dateISO } = parseShiftId(shiftId);
            const date_obj = new Date(dateISO + 'T12:00:00');
            const monthKey = date_obj.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            if (!groups[monthKey]) {
                groups[monthKey] = []
            }
            groups[monthKey].push(shiftId)
        })
        return groups
    }

    // Group shifts by date to show all shifts for same date together
    const groupShiftsByDate = (shiftIds: string[]) => {
        const groups: { [key: string]: string[] } = {}
        shiftIds.forEach((shiftId) => {
            const { dateISO } = parseShiftId(shiftId);
            if (!groups[dateISO]) {
                groups[dateISO] = []
            }
            groups[dateISO].push(shiftId)
        })
        return groups
    }

    // A função getDateInfo não é mais necessária pois as informações estão nos IDs dos turnos

    // Função para obter ícone do período
    const getPeriodIcon = (period: 'diurno' | 'noturno') => {
        return period === 'diurno' ?
            <Sun className="h-3 w-3 text-yellow-500" /> :
            <Moon className="h-3 w-3 text-blue-500" />;
    }

    // Função para obter cor do estágio
    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'MONTAGEM':
                return 'text-orange-600';
            case 'EVENTO':
                return 'text-blue-600';
            case 'DESMONTAGEM':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    }

    // Step indicator component
    const StepIndicator = () => {
        const steps = [
            { key: "date", label: "Data", icon: Clock },
            { key: "upload", label: "Upload", icon: Upload },
            { key: "preview", label: "Prévia", icon: FileText },
            { key: "validation", label: "Validação", icon: AlertTriangle },
            { key: "creation", label: "Criação", icon: Settings },
            { key: "verification", label: "Verificação", icon: CheckCircle },
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
                        (step.key === "creation" || step.key === "verification") &&
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

    // Check if can proceed with import - must verify all creations were successful
    const canProceedWithImport = () => {
        if (!processedData) return false

        const hasMissingCredentials = processedData.missingCredentials && processedData.missingCredentials.length > 0
        const hasMissingCompanies = processedData.missingCompanies && processedData.missingCompanies.length > 0
        const hasValidRows = processedData.validRows > 0

        // Most important: check if there are still missing items after processing
        const stillHasMissing = hasMissingCredentials || hasMissingCompanies

        console.log('🔍 CanProceed check:', {
            hasValidRows,
            hasMissingCredentials,
            hasMissingCompanies,
            stillHasMissing,
            credentialsCount: credentials.length,
            empresasCount: empresas?.length
        })

        // Only proceed if we have valid rows AND no missing items
        return hasValidRows && !stillHasMissing
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

                                        {/* Calendar - Nova interface organizada por data */}
                                        <div className="space-y-6">
                                            {Object.entries(groupShiftsByMonth(getEventDates())).map(([month, shiftIds]) => (
                                                <div key={month} className="border border-gray-200 rounded-lg p-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{month}</h3>
                                                    
                                                    {/* Agrupar turnos por data */}
                                                    <div className="space-y-4">
                                                        {Object.entries(groupShiftsByDate(shiftIds))
                                                            .sort(([a], [b]) => a.localeCompare(b))
                                                            .map(([dateISO, dateShifts]) => {
                                                                const isToday = dateISO === new Date().toISOString().split("T")[0];
                                                                const dateObj = new Date(dateISO + 'T12:00:00');
                                                                const formattedDate = dateObj.toLocaleDateString("pt-BR", { 
                                                                    weekday: "long", 
                                                                    day: "2-digit", 
                                                                    month: "long" 
                                                                });

                                                                return (
                                                                    <div key={dateISO} className={`border rounded-lg p-4 ${
                                                                        isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
                                                                    }`}>
                                                                        {/* Cabeçalho da data */}
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <h4 className={`text-base font-semibold ${
                                                                                isToday ? 'text-blue-800' : 'text-gray-800'
                                                                            }`}>
                                                                                {formattedDate}
                                                                                {isToday && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">HOJE</span>}
                                                                            </h4>
                                                                            <div className="text-sm text-gray-500">
                                                                                {dateShifts.filter(shiftId => selectedEventDates.includes(shiftId)).length} de {dateShifts.length} turnos selecionados
                                                                            </div>
                                                                        </div>

                                                                        {/* Turnos do dia organizados por estágio */}
                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                            {['montagem', 'evento', 'desmontagem'].map(stage => {
                                                                                const stageShifts = dateShifts.filter(shiftId => {
                                                                                    const { stage: shiftStage } = parseShiftId(shiftId);
                                                                                    return shiftStage === stage;
                                                                                });
                                                                                
                                                                                if (stageShifts.length === 0) return null;

                                                                                return (
                                                                                    <div key={stage} className="space-y-2">
                                                                                        <div className={`text-xs font-semibold uppercase ${getStageColor(stage.toUpperCase())}`}>
                                                                                            {stage}
                                                                                        </div>
                                                                                        <div className="flex gap-2">
                                                                                            {stageShifts.sort((a, b) => {
                                                                                                const { period: periodA } = parseShiftId(a);
                                                                                                const { period: periodB } = parseShiftId(b);
                                                                                                return periodA === 'diurno' ? -1 : 1;
                                                                                            }).map((shiftId) => {
                                                                                                const isSelected = selectedEventDates.includes(shiftId);
                                                                                                const { period } = parseShiftId(shiftId);
                                                                                                const shiftInfo = getShiftDisplayInfo(shiftId);

                                                                                                return (
                                                                                                    <button
                                                                                                        key={shiftId}
                                                                                                        onClick={() => handleDateSelect(shiftId)}
                                                                                                        className={`
                                                                                                            relative flex-1 p-3 rounded-lg text-center transition-all duration-200
                                                                                                            ${isSelected
                                                                                                                ? "bg-blue-600 text-white shadow-md"
                                                                                                                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                                                                                                            }
                                                                                                        `}
                                                                                                        title={shiftInfo.displayLabel}
                                                                                                    >
                                                                                                        <div className="flex flex-col items-center gap-1">
                                                                                                            <div className="flex items-center gap-1">
                                                                                                                {isSelected ? (
                                                                                                                    period === 'diurno' ?
                                                                                                                        <Sun className="h-4 w-4 text-yellow-200" /> :
                                                                                                                        <Moon className="h-4 w-4 text-blue-200" />
                                                                                                                ) : (
                                                                                                                    getPeriodIcon(period)
                                                                                                                )}
                                                                                                                <span className={`text-sm font-medium ${
                                                                                                                    isSelected ? 'text-white' : 'text-gray-700'
                                                                                                                }`}>
                                                                                                                    {period === 'diurno' ? 'DIURNO' : 'NOTURNO'}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        {isSelected && <Check className="w-3 h-3 absolute top-1 right-1" />}
                                                                                                    </button>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Selected dates */}
                                        {selectedEventDates.length > 0 && (
                                            <div className="mt-6">
                                                <h4 className="text-sm font-medium text-gray-700 mb-3">Turnos Selecionados:</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedEventDates.map((shiftId) => {
                                                        const shiftInfo = getShiftDisplayInfo(shiftId);
                                                        const { stage, period } = parseShiftId(shiftId);
                                                        return (
                                                            <Badge key={shiftId} variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                                                                <span>{formatShiftDate(shiftId)}</span>
                                                                <span className="text-xs">({stage.toUpperCase()} - {period.toUpperCase()})</span>
                                                                {getPeriodIcon(period)}
                                                                <button onClick={() => handleDateSelect(shiftId)} className="ml-1 hover:text-blue-600">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </Badge>
                                                        );
                                                    })}
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
                                                {processingProgress.percentage > 0 ?
                                                    `Processando... ${processingProgress.percentage}%` :
                                                    'Processando...'
                                                }
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

                                {/* Processing Progress Bar */}
                                {isProcessing && processingProgress.total > 0 && (
                                    <div className="w-full space-y-2">
                                        <Progress value={processingProgress.percentage} className="w-full" />
                                        <p className="text-sm text-center text-gray-600">
                                            Processando {processingProgress.current} de {processingProgress.total} linhas
                                        </p>
                                    </div>
                                )}

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
                                                <strong>Identificação:</strong> cpf OU rg (opcional, mas recomendado)
                                            </p>
                                            <p>
                                                <strong>Coluna opcional:</strong> credencial
                                            </p>
                                            <p>
                                                <strong>Formato documento:</strong> aceita qualquer formato - se tiver 11 dígitos será tratado como CPF, outros tamanhos são aceitos normalmente
                                            </p>
                                            <p>
                                                <strong>Formato credencial:</strong> será convertida para maiúsculo automaticamente
                                            </p>
                                            <p>
                                                <strong>Data do evento:</strong> será selecionada antes da importação
                                            </p>
                                            <p>
                                                <strong>Limite:</strong> até 50000 participantes por importação
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

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                                                Avisos
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-orange-600">{processedData.warnings.length}</div>
                                            <p className="text-sm text-gray-600">participantes sem documento</p>
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
                                        <div className="space-y-4">
                                            {/* Performance Status */}
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700">Status da API</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            apiMetrics.consecutiveErrors === 0 ? 'bg-green-500' :
                                                            apiMetrics.consecutiveErrors < 2 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`} />
                                                        <span className="text-xs text-gray-600">
                                                            {apiMetrics.consecutiveErrors === 0 ? 'Saudável' :
                                                             apiMetrics.consecutiveErrors < 2 ? 'Instável' : 'Sobrecarregada'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {apiMetrics.totalRequests > 0 && (
                                                    <div className="text-xs text-gray-600">
                                                        Requests: {apiMetrics.totalRequests} | 
                                                        Avg: {Math.round(apiMetrics.avgResponseTime)}ms |
                                                        Erros: {apiMetrics.consecutiveErrors}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Tamanho do Lote
                                                        <span className="text-xs text-gray-500 ml-1">(Supabase otimizado)</span>
                                                    </label>
                                                    <select
                                                        value={batchConfig.batchSize}
                                                        onChange={(e) =>
                                                            setBatchConfig((prev) => ({
                                                                ...prev,
                                                                batchSize: Number(e.target.value),
                                                            }))
                                                        }
                                                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                    >
                                                        <option value={5}>5 participantes (Mais seguro)</option>
                                                        <option value={10}>10 participantes (Recomendado)</option>
                                                        <option value={15}>15 participantes</option>
                                                        <option value={20}>20 participantes (Arriscado)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Pausa entre Lotes
                                                        <span className="text-xs text-gray-500 ml-1">(Rate limiting)</span>
                                                    </label>
                                                    <select
                                                        value={batchConfig.pauseBetweenBatches / 1000}
                                                        onChange={(e) =>
                                                            setBatchConfig((prev) => ({
                                                                ...prev,
                                                                pauseBetweenBatches: Number(e.target.value) * 1000,
                                                            }))
                                                        }
                                                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                    >
                                                        <option value={10}>10 segundos (Rápido)</option>
                                                        <option value={15}>15 segundos (Recomendado)</option>
                                                        <option value={20}>20 segundos (Conservador)</option>
                                                        <option value={30}>30 segundos (Muito seguro)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Pausa entre Itens
                                                        <span className="text-xs text-gray-500 ml-1">(ms)</span>
                                                    </label>
                                                    <select
                                                        value={batchConfig.pauseBetweenItems}
                                                        onChange={(e) =>
                                                            setBatchConfig((prev) => ({
                                                                ...prev,
                                                                pauseBetweenItems: Number(e.target.value),
                                                            }))
                                                        }
                                                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                    >
                                                        <option value={500}>500ms (Rápido)</option>
                                                        <option value={1000}>1000ms (Recomendado)</option>
                                                        <option value={1500}>1500ms (Conservador)</option>
                                                        <option value={2000}>2000ms (Muito seguro)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Tentativas de Retry
                                                        <span className="text-xs text-gray-500 ml-1">(Recuperação)</span>
                                                    </label>
                                                    <select
                                                        value={batchConfig.maxRetries}
                                                        onChange={(e) =>
                                                            setBatchConfig((prev) => ({
                                                                ...prev,
                                                                maxRetries: Number(e.target.value),
                                                            }))
                                                        }
                                                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                    >
                                                        <option value={1}>1 tentativa (Sem retry)</option>
                                                        <option value={2}>2 tentativas</option>
                                                        <option value={3}>3 tentativas (Recomendado)</option>
                                                        <option value={5}>5 tentativas (Máximo)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-blue-800 font-medium">Tempo estimado:</span>
                                                    <span className="text-blue-700 font-bold">
                                                        {Math.ceil(
                                                            (processedData.validRows / batchConfig.batchSize) * (batchConfig.pauseBetweenBatches / 1000) +
                                                            (processedData.validRows * batchConfig.pauseBetweenItems) / 1000,
                                                        )} segundos
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-blue-700">Participantes:</span>
                                                    <span className="text-blue-600">{processedData.validRows}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-blue-700">Lotes:</span>
                                                    <span className="text-blue-600">{Math.ceil(processedData.validRows / batchConfig.batchSize)}</span>
                                                </div>
                                                <div className="pt-2 border-t border-blue-200">
                                                    <div className="text-xs text-blue-600">
                                                        ✅ Rate limiting ativo | 🔄 Retry automático | 📊 Monitoramento de performance
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Resumo da Validação</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-4 gap-4 mb-6">
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
                                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                                                <AlertTriangle className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                                                <div className="text-2xl font-bold text-orange-600">{processedData.warnings.length}</div>
                                                <div className="text-sm text-gray-600">Avisos</div>
                                            </div>
                                        </div>

                                        {/* Warnings summary */}
                                        {processedData.warnings.length > 0 && (
                                            <Alert className="mb-4 border-orange-200 bg-orange-50">
                                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                                <AlertDescription className="text-orange-800">
                                                    <strong>Avisos encontrados:</strong> {processedData.warnings.length} participante(s) sem CPF ou RG.
                                                    Estes participantes serão processados mesmo assim, mas é recomendado revisar os dados.
                                                </AlertDescription>
                                            </Alert>
                                        )}

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
                                                        {selectedEventDates.map((shiftId) => {
                                                            const { dateISO } = parseShiftId(shiftId);
                                                            return formatEventDate(dateISO + 'T00:00:00');
                                                        }).join(", ")}
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
                                                        {selectedEventDates.map((shiftId) => {
                                                            const { dateISO } = parseShiftId(shiftId);
                                                            return dateISO;
                                                        }).join(", ")}
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

                        {/* Step 6: Verification */}
                        {currentStep === "verification" && processedData && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Verificação Pós-Criação</h3>
                                    <Badge variant="secondary">
                                        Validando criações
                                    </Badge>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-blue-600" />
                                            Status da Verificação
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {/* Verification summary */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                    <FileText className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {credentials.length}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Credenciais Disponíveis</div>
                                                </div>
                                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                                    <Building className="w-8 h-8 mx-auto text-green-600 mb-2" />
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {empresas?.length || 0}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Empresas Disponíveis</div>
                                                </div>
                                            </div>

                                            {/* Missing items after creation */}
                                            {(processedData.missingCredentials.length > 0 || processedData.missingCompanies.length > 0) && (
                                                <Alert>
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <AlertDescription>
                                                        <div className="space-y-2">
                                                            {processedData.missingCredentials.length > 0 && (
                                                                <div className="text-red-600">
                                                                    ⚠️ Ainda faltam {processedData.missingCredentials.length} credenciais:
                                                                    <ul className="list-disc list-inside mt-1 ml-4">
                                                                        {processedData.missingCredentials.map(cred => (
                                                                            <li key={cred.name} className="text-sm">{cred.name}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {processedData.missingCompanies.length > 0 && (
                                                                <div className="text-red-600">
                                                                    ⚠️ Ainda faltam {processedData.missingCompanies.length} empresas:
                                                                    <ul className="list-disc list-inside mt-1 ml-4">
                                                                        {processedData.missingCompanies.map(comp => (
                                                                            <li key={comp.name} className="text-sm">{comp.name}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {/* Success message */}
                                            {processedData.missingCredentials.length === 0 && processedData.missingCompanies.length === 0 && (
                                                <Alert className="border-green-200 bg-green-50">
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                    <AlertDescription className="text-green-800">
                                                        ✅ Todas as credenciais e empresas foram criadas com sucesso!
                                                        O sistema está pronto para importar os participantes.
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {/* Creation results */}
                                            <div className="space-y-3">
                                                <h4 className="font-medium text-gray-700">Resultados da Criação:</h4>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div className="p-3 bg-green-50 rounded">
                                                        <div className="text-green-600 font-semibold">✅ Criados com Sucesso</div>
                                                        <div className="text-gray-600">{creationProgress.completed.length} itens</div>
                                                        {creationProgress.completed.length > 0 && (
                                                            <ul className="list-disc list-inside mt-1 text-xs text-green-700">
                                                                {creationProgress.completed.slice(0, 5).map(item => (
                                                                    <li key={item}>{item}</li>
                                                                ))}
                                                                {creationProgress.completed.length > 5 && (
                                                                    <li>... e mais {creationProgress.completed.length - 5}</li>
                                                                )}
                                                            </ul>
                                                        )}
                                                    </div>
                                                    <div className="p-3 bg-red-50 rounded">
                                                        <div className="text-red-600 font-semibold">❌ Falharam</div>
                                                        <div className="text-gray-600">{creationProgress.failed.length} itens</div>
                                                        {creationProgress.failed.length > 0 && (
                                                            <ul className="list-disc list-inside mt-1 text-xs text-red-700">
                                                                {creationProgress.failed.slice(0, 5).map(item => (
                                                                    <li key={item}>{item}</li>
                                                                ))}
                                                                {creationProgress.failed.length > 5 && (
                                                                    <li>... e mais {creationProgress.failed.length - 5}</li>
                                                                )}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Verification action */}
                                            <div className="mt-6">
                                                <Button
                                                    onClick={handleVerificationStep}
                                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Atualizar e Verificar Dados
                                                </Button>
                                                <p className="text-xs text-gray-500 text-center mt-2">
                                                    Refaz o fetch das empresas e credenciais e reprocessa o arquivo
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-between">
                                    <Button onClick={handlePrevStep} variant="outline">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Voltar para Criação
                                    </Button>
                                    <Button
                                        onClick={handleNextStep}
                                        disabled={!canProceedWithImport()}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {!canProceedWithImport() ? (
                                            "Resolva os itens faltantes primeiro"
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

                        {/* Step 7: Import Progress */}
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
                                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <div className="text-sm space-y-1">
                                                    <div className="text-blue-800 font-medium mb-2">Configurações Otimizadas para Supabase:</div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700">Lote:</span>
                                                            <span className="text-blue-600 font-medium">{batchConfig.batchSize} participantes</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700">Pausa lotes:</span>
                                                            <span className="text-blue-600 font-medium">{batchConfig.pauseBetweenBatches / 1000}s</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700">Pausa itens:</span>
                                                            <span className="text-blue-600 font-medium">{batchConfig.pauseBetweenItems}ms</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-blue-700">Max retry:</span>
                                                            <span className="text-blue-600 font-medium">{batchConfig.maxRetries}x</span>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-blue-200">
                                                        <div className="flex items-center gap-1 text-xs text-blue-600">
                                                            <span className={`w-2 h-2 rounded-full ${
                                                                apiMetrics.consecutiveErrors === 0 ? 'bg-green-500' :
                                                                apiMetrics.consecutiveErrors < 2 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`} />
                                                            Status API: {apiMetrics.consecutiveErrors === 0 ? 'Saudável' : 
                                                                        apiMetrics.consecutiveErrors < 2 ? 'Instável' : 'Sobrecarregada'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {!isImporting && (
                                    <div className="text-center space-y-4">
                                        <Button
                                            onClick={handleStartImport}
                                            className="bg-green-600 hover:bg-green-700"
                                            disabled={!canProceedWithImport()}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            {canProceedWithImport()
                                                ? `Iniciar Importação (${processedData?.validRows || 0} participantes)`
                                                : "Conclua a criação de credenciais/empresas primeiro"
                                            }
                                        </Button>
                                        {!canProceedWithImport() && (
                                            <div className="text-sm text-red-600">
                                                Todas as credenciais e empresas devem ser criadas com sucesso antes de prosseguir
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 8: Complete */}
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
                        <div className="grid grid-cols-4 gap-4">
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
                                    <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                                    <div className="text-2xl font-bold">{participants.filter((p) => p.checkIn).length}</div>
                                    <div className="text-sm text-gray-600">Com Check-in</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <CheckCircle className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                                    <div className="text-2xl font-bold">{participants.filter((p) => p.checkIn && p.checkOut).length}</div>
                                    <div className="text-sm text-gray-600">Check-in/out Completo</div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <Button
                                onClick={exportParticipants}
                                disabled={isExporting || participants.length === 0}
                                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                        Exportando dados completos...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5 mr-3" />
                                        Exportar Relatório Completo ({participants.length} participantes)
                                    </>
                                )}
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                                    Relatório de Exportação Completo
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm text-gray-700">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-800 mb-2">📊 Dados Básicos:</h4>
                                            <ul className="space-y-1">
                                                <li>• Nome, CPF, Empresa</li>
                                                <li>• Função, Credencial</li>
                                                <li>• Email, Telefone</li>
                                                <li>• Dias de Trabalho</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800 mb-2">⏰ Controle de Presença:</h4>
                                            <ul className="space-y-1">
                                                <li>• Código da Pulseira</li>
                                                <li>• Data e Horário de Check-in</li>
                                                <li>• Data e Horário de Check-out</li>
                                                <li>• Tempo Total de Trabalho</li>
                                                <li>• Status de Presença</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t">
                                        <h4 className="font-semibold text-gray-800 mb-2">📋 Informações Adicionais:</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <ul className="space-y-1">
                                                <li>• Validado Por</li>
                                                <li>• Observações</li>
                                            </ul>
                                            <ul className="space-y-1">
                                                <li>• Data de Criação</li>
                                                <li>• Última Atualização</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t bg-blue-50 p-3 rounded">
                                        <p className="text-blue-800 font-medium">
                                            📁 Nome do arquivo: participantes-completo-{eventId}-{new Date().toISOString().split("T")[0]}.xlsx
                                        </p>
                                        <p className="text-blue-700 text-xs mt-1">
                                            Formato: Excel (.xlsx) com colunas otimizadas e dados completos de presença
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}


                {/* Creation Progress Dialog */}
                <Dialog open={isCreationDialogOpen}>
                    <DialogContent className="max-w-md bg-white text-gray-800">
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
