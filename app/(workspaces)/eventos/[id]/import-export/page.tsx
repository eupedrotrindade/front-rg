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
import { Input } from "@/components/ui/input"
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
    Calendar,
    X,
    Plus,
} from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCreateEventParticipant } from "@/features/eventos/api/mutation/use-create-event-participant"
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event"
import { useCreateCredential } from "@/features/eventos/api/mutation/use-credential-mutations"
import { useEmpresas } from "@/features/eventos/api/query/use-empresas"
import { useCreateEmpresa } from "@/features/eventos/api/mutation"
import type { EventParticipant, CreateCredentialRequest, Credential, CreateEmpresaRequest, Empresa } from "@/features/eventos/types"
import type { EventParticipantSchema } from "@/features/eventos/schemas"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import CreateCredentialDialog from "@/features/eventos/components/create-credential-dialog"
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

type ImportStep = "date" | "upload" | "preview" | "validation" | "import" | "complete"

export default function ImportExportPage() {
    const params = useParams()
    const eventId = params.id as string
    const [activeTab, setActiveTab] = useState<"import" | "export">("import")

    // Import States
    const [currentStep, setCurrentStep] = useState<ImportStep>("date")
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null)
    const [excelData, setExcelData] = useState<any[]>([])
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

    // Estados para atribuição de credenciais em massa
    const [showCredentialAssignment, setShowCredentialAssignment] = useState(false)
    const [selectedParticipants, setSelectedParticipants] = useState<EventParticipantSchema[]>([])
    const [selectedCredentialId, setSelectedCredentialId] = useState<string>("")
    const [isAssigningCredentials, setIsAssigningCredentials] = useState(false)

    // Estado para seleção de data do evento
    const [selectedEventDates, setSelectedEventDates] = useState<string[]>([])

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
    const { data: credentials = [], refetch: refetchCredentials } = useCredentialsByEvent(eventId)
    const { mutate: createCredential } = useCreateCredential()
    const { data: empresas = [] } = useEmpresas()
    const { mutate: createEmpresa } = useCreateEmpresa()

    // Estado para credenciais faltantes
    const [missingCredentials, setMissingCredentials] = useState<Array<{ name: string; count: number }>>([])
    const [showCreateCredentials, setShowCreateCredentials] = useState(false)
    const [isCreatingCredentials, setIsCreatingCredentials] = useState(false)
    const [isUpdatingAfterCredentialCreation, setIsUpdatingAfterCredentialCreation] = useState(false)
    const [missingCompanies, setMissingCompanies] = useState<Array<{ name: string; count: number }>>([])
    const [showCreateCompanies, setShowCreateCompanies] = useState(false)
    const [isCreatingCompanies, setIsCreatingCompanies] = useState(false)

    const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false)

    const [credentialColor, setCredentialColor] = useState<string>("#3B82F6")

    const [isCredentialDialogOpen, setIsCredentialDialogOpen] = useState(false)

    // Funções para atribuição de credenciais em massa
    const handleSelectParticipant = (participant: EventParticipantSchema) => {
        setSelectedParticipants(prev => {
            const isSelected = prev.some(p => p.cpf === participant.cpf)
            if (isSelected) {
                return prev.filter(p => p.cpf !== participant.cpf)
            } else {
                return [...prev, participant]
            }
        })
    }

    const handleSelectAllParticipants = () => {
        if (processedData) {
            const participantsWithoutCredentials = processedData.data.filter(p => !p.credentialId)
            setSelectedParticipants(participantsWithoutCredentials)
        }
    }

    const handleClearSelection = () => {
        setSelectedParticipants([])
    }

    const handleAssignCredentials = async () => {
        if (!selectedCredentialId || selectedParticipants.length === 0) return

        setIsAssigningCredentials(true)
        try {

            // Atualizar os dados processados
            setProcessedData(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    data: prev.data.map(p => {
                        const isSelected = selectedParticipants.some(sp => sp.cpf === p.cpf)
                        if (isSelected) {
                            return { ...p, credentialId: selectedCredentialId }
                        }
                        return p
                    })
                }
            })

            setSelectedParticipants([])
            setSelectedCredentialId("")
            toast.success(`${selectedParticipants.length} credenciais atribuídas com sucesso!`)
        } catch (error) {
            toast.error("Erro ao atribuir credenciais")
        } finally {
            setIsAssigningCredentials(false)
        }
    }

    // Validation functions
    const isValidCPF = (cpf: string): boolean => {
        // Permitir CPF vazio ou apenas espaços
        if (!cpf || cpf.trim() === "") return true

        // Limpar apenas números
        const cleaned = cpf.replace(/\D/g, "")

        // Aceitar CPF com 11 dígitos (padrão) ou 14 dígitos (com pontos e traço)
        if (cleaned.length === 11) {
            // Validação básica de CPF
            if (cleaned === "00000000000" ||
                cleaned === "11111111111" ||
                cleaned === "22222222222" ||
                cleaned === "33333333333" ||
                cleaned === "44444444444" ||
                cleaned === "55555555555" ||
                cleaned === "66666666666" ||
                cleaned === "77777777777" ||
                cleaned === "88888888888" ||
                cleaned === "99999999999") {
                return false
            }

            // Cálculo dos dígitos verificadores
            let sum = 0
            for (let i = 0; i < 9; i++) {
                sum += parseInt(cleaned.charAt(i)) * (10 - i)
            }
            let remainder = (sum * 10) % 11
            if (remainder === 10 || remainder === 11) remainder = 0
            if (remainder !== parseInt(cleaned.charAt(9))) return false

            sum = 0
            for (let i = 0; i < 10; i++) {
                sum += parseInt(cleaned.charAt(i)) * (11 - i)
            }
            remainder = (sum * 10) % 11
            if (remainder === 10 || remainder === 11) remainder = 0
            if (remainder !== parseInt(cleaned.charAt(10))) return false

            return true
        }

        // Aceitar formatos com pontos e traço (14 caracteres)
        if (cleaned.length === 14) {
            const cpfOnly = cleaned.replace(/[.-]/g, "")
            return isValidCPF(cpfOnly)
        }

        // Aceitar CPF com menos de 11 dígitos (pode ser um RG ou documento alternativo)
        if (cleaned.length >= 8 && cleaned.length <= 11) {
            return true
        }

        return false
    }

    const isValidRG = (rg: string): boolean => {
        // Permitir RG vazio ou apenas espaços
        if (!rg || rg.trim() === "") return true

        // Limpar apenas números
        const cleaned = rg.replace(/\D/g, "")

        // Aceitar RG com 8 a 12 dígitos (formatos variados)
        if (cleaned.length >= 8 && cleaned.length <= 12) {
            return true
        }

        // Aceitar formatos com pontos e traço
        if (rg.includes(".") || rg.includes("-")) {
            const cleanedWithFormat = rg.replace(/[.-]/g, "")
            if (cleanedWithFormat.length >= 8 && cleanedWithFormat.length <= 12) {
                return true
            }
        }

        return false
    }

    const isValidEmail = (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const validateParticipant = (data: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []

        // Validar nome (obrigatório)
        if (!data.nome || data.nome.toString().trim().length < 2) {
            errors.push("Nome é obrigatório e deve ter pelo menos 2 caracteres")
        }

        // Validar empresa (obrigatório)
        if (!data.empresa || data.empresa.toString().trim().length < 2) {
            errors.push("Empresa é obrigatória e deve ter pelo menos 2 caracteres")
        }

        // Validar função (obrigatório)
        if (!data.funcao || data.funcao.toString().trim().length < 2) {
            errors.push("Função é obrigatória e deve ter pelo menos 2 caracteres")
        }

        // Validar CPF ou RG (pelo menos um é obrigatório, mas mais flexível)
        const hasCPF = data.cpf && data.cpf.toString().trim() !== ""
        const hasRG = data.rg && data.rg.toString().trim() !== ""

        if (!hasCPF && !hasRG) {
            errors.push("CPF ou RG é obrigatório (pelo menos um)")
        } else {
            // Validar CPF se fornecido (mais flexível)
            if (hasCPF && !isValidCPF(data.cpf.toString())) {
                errors.push("CPF inválido ou formato incorreto")
            }

            // Validar RG se fornecido (mais flexível)
            if (hasRG && !isValidRG(data.rg.toString())) {
                errors.push("RG inválido ou formato incorreto")
            }
        }

        // Validar email (opcional, mas se fornecido deve ser válido)
        if (data.email && data.email.toString().trim() !== "" && !isValidEmail(data.email.toString())) {
            errors.push("Email inválido")
        }

        // Validar telefone (opcional, mas se fornecido deve ter pelo menos 10 dígitos)
        if (data.phone && data.phone.toString().trim() !== "") {
            const phoneDigits = data.phone.toString().replace(/\D/g, "")
            if (phoneDigits.length < 10) {
                errors.push("Telefone deve ter pelo menos 10 dígitos")
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    // Função para normalizar nome de credencial
    const normalizeCredentialName = (name: string): string => {
        return name.toString().trim().toUpperCase()
    }

    // Função para buscar credencial por nome
    const findCredentialByName = (name: string) => {
        const normalizedName = normalizeCredentialName(name)
        return credentials.find(credential =>
            normalizeCredentialName(credential.nome) === normalizedName
        )
    }

    // Função para criar credencial
    const createCredentialFunction = async (name: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const normalizedName = normalizeCredentialName(name)

            // Garantir que sempre tenha pelo menos uma data
            const daysWorks = selectedEventDates.length > 0
                ? selectedEventDates.map(date => new Date(date).toLocaleDateString('pt-BR'))
                : [new Date().toLocaleDateString('pt-BR')] // Data atual como fallback

            console.log(`📝 Criando credencial: ${normalizedName}`)
            console.log(`📅 Evento ID: ${eventId}`)
            console.log(`📆 Dias selecionados:`, daysWorks)

            const credentialData: CreateCredentialRequest = {
                nome: normalizedName,
                id_events: eventId, // Evento da URL
                days_works: daysWorks, // Dias escolhidos pelo usuário
                cor: credentialColor // Cor escolhida pelo usuário
            }

            createCredential(credentialData, {
                onSuccess: (data) => {
                    console.log(`✅ Credencial criada: ${normalizedName} - Evento: ${eventId} - Dias: ${daysWorks.join(', ')} - Cor: ${credentialColor}`)
                    resolve(data.id)
                },
                onError: (error) => {
                    console.error(`❌ Erro ao criar credencial ${normalizedName}:`, error)
                    resolve(null)
                }
            })
        })
    }

    // Função para criar todas as credenciais faltantes
    const createMissingCredentials = async () => {
        console.log("🔍 createMissingCredentials chamada")
        console.log("📊 processedData:", processedData)
        console.log("📋 missingCredentials:", processedData?.missingCredentials)
        console.log("🔒 Estado atual isCredentialDialogOpen:", isCredentialDialogOpen)

        if (!processedData?.missingCredentials) {
            console.log("❌ Nenhuma credencial faltante encontrada")
            return
        }

        console.log("✅ Abrindo modal de credenciais...")
        setIsCreatingCredentials(true)
        setIsCredentialDialogOpen(true)
        console.log("🔒 Novo estado isCredentialDialogOpen:", true)

        let successCount = 0
        let errorCount = 0

        console.log(`🔄 Criando ${processedData.missingCredentials.length} credenciais...`)
        for (const credential of processedData.missingCredentials) {
            console.log(`📝 Criando credencial: ${credential.name}`)
            const credentialId = await createCredentialFunction(credential.name)
            if (credentialId) {
                successCount++
                console.log(`✅ Credencial criada: ${credential.name}`)
            } else {
                errorCount++
                console.log(`❌ Falha ao criar credencial: ${credential.name}`)
            }
        }

        console.log("🔚 Fechando modal de credenciais...")
        setIsCreatingCredentials(false)
        setIsCredentialDialogOpen(false)
        console.log("🔒 Estado final isCredentialDialogOpen:", false)

        if (successCount > 0) {
            toast.success(`${successCount} credenciais criadas com sucesso!`)
            console.log("🔄 Reprocessando dados...")
            // Reprocessar dados após criar credenciais
            if (processedData && uploadedFile) {
                try {
                    // Aguardar um pouco para o backend processar
                    await new Promise(resolve => setTimeout(resolve, 1000))

                    // Refetch das credenciais para garantir que estão atualizadas
                    await refetchCredentials()

                    const newProcessedData = await processExcelFile(uploadedFile)
                    console.log("📊 Novo processedData:", newProcessedData)
                    console.log("📋 Novas missingCredentials:", newProcessedData.missingCredentials)
                    setProcessedData(newProcessedData)

                    // Verificar se o botão de importação deve ser ativado
                    const canProceed = !newProcessedData.missingCredentials?.length && !newProcessedData.missingCompanies?.length && newProcessedData.validRows > 0
                    console.log("✅ Botão de importação ativado:", canProceed)
                } catch (error) {
                    console.error("❌ Erro ao reprocessar dados:", error)
                    toast.error("Erro ao atualizar dados após criar credenciais")
                }
            }
        }
        if (errorCount > 0) {
            toast.error(`${errorCount} credenciais falharam ao serem criadas`)
        }
    }

    // Função para lidar com sucesso na criação de credencial
    const handleCredentialCreated = (credentialId: string, credentialName: string) => {
        // Atualizar a lista de credenciais
        refetchCredentials()

        // Reprocessar os dados da planilha para atualizar as referências das credenciais
        if (processedData && uploadedFile) {
            setIsUpdatingAfterCredentialCreation(true)

            // Reprocessar o arquivo com as novas credenciais
            processExcelFile(uploadedFile).then((newProcessedData) => {
                setProcessedData(newProcessedData)
                toast.success(`Credencial "${credentialName}" criada e dados atualizados!`)
            }).catch((error) => {
                toast.error("Erro ao atualizar dados após criação da credencial")
                console.error(error)
            }).finally(() => {
                setIsUpdatingAfterCredentialCreation(false)
            })
        } else {
            toast.success(`Credencial "${credentialName}" criada com sucesso!`)
        }
    }

    // Funções para empresas (similar às credenciais)
    const normalizeCompanyName = (name: string): string => {
        return name.toString().trim().toUpperCase()
    }

    const findCompanyByName = (name: string) => {
        const normalizedName = normalizeCompanyName(name)
        return (empresas || []).find(empresa =>
            normalizeCompanyName(empresa.nome) === normalizedName
        )
    }

    const createCompanyFunction = async (name: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const normalizedName = normalizeCompanyName(name)

            // Converter selectedEventDates para o formato correto (YYYY-MM-DD)
            const days = selectedEventDates.length > 0
                ? selectedEventDates.map(date => new Date(date).toISOString().slice(0, 10))
                : []

            console.log(`🏢 Criando empresa: ${normalizedName}`)
            console.log(`📅 Evento ID: ${eventId}`)
            console.log(`📆 Dias selecionados:`, days)

            const companyData: CreateEmpresaRequest = {
                nome: normalizedName,
                id_evento: eventId, // Evento da URL
                days: days // Dias escolhidos pelo usuário
            }

            createEmpresa(companyData, {
                onSuccess: (data) => {
                    console.log(`✅ Empresa criada: ${normalizedName} - Evento: ${eventId} - Dias: ${days.join(', ')}`)
                    resolve(data.id)
                },
                onError: (error) => {
                    console.error(`❌ Erro ao criar empresa ${normalizedName}:`, error)
                    resolve(null)
                }
            })
        })
    }

    const createMissingCompanies = async () => {
        console.log("🔍 createMissingCompanies chamada")
        console.log("📊 processedData:", processedData)
        console.log("🏢 missingCompanies:", processedData?.missingCompanies)

        if (!processedData?.missingCompanies) {
            console.log("❌ Nenhuma empresa faltante encontrada")
            return
        }

        console.log("✅ Abrindo modal de empresas...")
        setIsCreatingCompanies(true)
        setIsCompanyDialogOpen(true)
        let successCount = 0
        let errorCount = 0

        console.log(`🔄 Criando ${processedData.missingCompanies.length} empresas...`)
        for (const company of processedData.missingCompanies) {
            console.log(`🏢 Criando empresa: ${company.name}`)
            const companyId = await createCompanyFunction(company.name)
            if (companyId) {
                successCount++
                console.log(`✅ Empresa criada: ${company.name}`)
            } else {
                errorCount++
                console.log(`❌ Falha ao criar empresa: ${company.name}`)
            }
        }

        console.log("🔚 Fechando modal de empresas...")
        setIsCreatingCompanies(false)
        setIsCompanyDialogOpen(false)

        if (successCount > 0) {
            toast.success(`${successCount} empresas criadas com sucesso!`)
            console.log("🔄 Reprocessando dados...")
            // Reprocessar dados após criar empresas
            if (processedData && uploadedFile) {
                try {
                    // Aguardar um pouco para o backend processar
                    await new Promise(resolve => setTimeout(resolve, 1000))

                    const newProcessedData = await processExcelFile(uploadedFile)
                    console.log("📊 Novo processedData:", newProcessedData)
                    console.log("🏢 Novas missingCompanies:", newProcessedData.missingCompanies)
                    setProcessedData(newProcessedData)

                    // Verificar se o botão de importação deve ser ativado
                    const canProceed = !newProcessedData.missingCredentials?.length && !newProcessedData.missingCompanies?.length && newProcessedData.validRows > 0
                    console.log("✅ Botão de importação ativado:", canProceed)
                } catch (error) {
                    console.error("❌ Erro ao reprocessar dados:", error)
                    toast.error("Erro ao atualizar dados após criar empresas")
                }
            }
        }
        if (errorCount > 0) {
            toast.error(`${errorCount} empresas falharam ao serem criadas`)
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
                        const rowNumber = index + 2 // Excel row number (header is row 1)

                        // Usar dados corrigidos da etapa prévia se disponível
                        const rowData = previewFixData[index] || row

                        const validation = validateParticipant(rowData)

                        if (!validation.isValid) {
                            result.errors.push({
                                item: rowData,
                                error: validation.errors.join(", "),
                                row: rowNumber,
                            })
                            result.invalidRows++
                            return
                        }

                        const cleanedCPF = rowData.cpf ? rowData.cpf.toString().replace(/\D/g, "") : ""
                        const cleanedRG = rowData.rg ? rowData.rg.toString().replace(/\D/g, "") : ""

                        // Check for duplicates in existing data (usando CPF ou RG)
                        const isDuplicate = existingCPFs.has(cleanedCPF) ||
                            (cleanedRG && existingCPFs.has(cleanedRG))

                        if (isDuplicate) {
                            const existing = participants.find((p) =>
                                p.cpf.replace(/\D/g, "") === cleanedCPF ||
                                (cleanedRG && p.cpf.replace(/\D/g, "") === cleanedRG)
                            )
                            if (existing) {
                                result.duplicates.push({
                                    item: rowData,
                                    existing,
                                    row: rowNumber,
                                })
                                result.duplicateRows++
                                return
                            }
                        }

                        // Check for duplicates within the file
                        const hasDuplicateInFile = (cleanedCPF && processedCPFs.has(cleanedCPF)) ||
                            (cleanedRG && processedCPFs.has(cleanedRG))

                        if (hasDuplicateInFile) {
                            result.duplicates.push({
                                item: rowData,
                                existing: {} as EventParticipant, // Placeholder for file duplicate
                                row: rowNumber,
                            })
                            result.duplicateRows++
                            return
                        }

                        // Adicionar CPF ou RG ao conjunto de processados
                        if (cleanedCPF) processedCPFs.add(cleanedCPF)
                        if (cleanedRG) processedCPFs.add(cleanedRG)

                        // Processar credencial se existir
                        let credentialId: string | undefined = undefined
                        if (rowData.credencial) {
                            const credentialName = normalizeCredentialName(rowData.credencial)
                            const existingCredential = findCredentialByName(credentialName)

                            if (existingCredential) {
                                credentialId = existingCredential.id
                            } else {
                                // Contar credenciais faltantes
                                credentialCounts[credentialName] = (credentialCounts[credentialName] || 0) + 1
                            }
                        }

                        // Processar empresa se existir
                        if (rowData.empresa) {
                            const companyName = normalizeCompanyName(rowData.empresa)
                            const existingCompany = findCompanyByName(companyName)

                            if (!existingCompany) {
                                // Contar empresas faltantes
                                companyCounts[companyName] = (companyCounts[companyName] || 0) + 1
                            }
                        }

                        const participantData: EventParticipantSchema = {
                            eventId: eventId,
                            credentialId: credentialId,
                            wristbandId: undefined, // Não usar mais wristbandId
                            staffId: rowData.staffId || undefined,
                            name: rowData.nome.toString().trim(),
                            cpf: (() => {
                                // Garantir que CPF tenha pelo menos 11 caracteres para o backend
                                if (rowData.cpf) {
                                    const cpfStr = rowData.cpf.toString().replace(/\D/g, "")
                                    if (cpfStr.length >= 11) {
                                        return cpfStr
                                    } else if (cpfStr.length > 0) {
                                        // Preencher com zeros à esquerda até 11 dígitos
                                        return cpfStr.padStart(11, '0')
                                    }
                                }
                                if (rowData.rg) {
                                    const rgStr = rowData.rg.toString().replace(/\D/g, "")
                                    if (rgStr.length >= 11) {
                                        return rgStr
                                    } else if (rgStr.length > 0) {
                                        // Preencher com zeros à esquerda até 11 dígitos
                                        return rgStr.padStart(11, '0')
                                    }
                                }
                                return "00000000000" // CPF padrão se nenhum documento fornecido
                            })(),
                            email: rowData.email?.toString().trim() || undefined,
                            phone: rowData.phone?.toString().trim() || undefined,
                            role: rowData.funcao.toString().trim(),
                            company: rowData.empresa.toString().trim(),
                            checkIn: rowData.checkIn || undefined,
                            checkOut: rowData.checkOut || undefined,
                            presenceConfirmed: rowData.presenceConfirmed || undefined,
                            certificateIssued: rowData.certificateIssued || undefined,
                            notes: rowData.notes?.toString().trim() || undefined,
                            photo: rowData.photo || undefined,
                            documentPhoto: rowData.documentPhoto || undefined,
                            validatedBy: rowData.validatedBy || undefined,
                            daysWork: selectedEventDates ? selectedEventDates.map(date => new Date(date).toLocaleDateString('pt-BR')) : undefined,
                        }

                        result.data.push(participantData)
                        result.validRows++
                    })

                    // Processar credenciais faltantes
                    result.missingCredentials = Object.entries(credentialCounts).map(([name, count]) => ({
                        name,
                        count
                    }))

                    // Processar empresas faltantes
                    result.missingCompanies = Object.entries(companyCounts).map(([name, count]) => ({
                        name,
                        count
                    }))

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
            // Incluir dados inválidos selecionados antes da importação
            const dataToImport = [...processedData.data]

            if (selectedInvalidData.size > 0) {
                const selectedErrors = Array.from(selectedInvalidData).map(index => processedData.errors[index])

                selectedErrors.forEach(error => {
                    // Tentar criar um participante válido a partir do erro
                    const participantData: EventParticipantSchema = {
                        eventId: eventId,
                        credentialId: undefined,
                        wristbandId: undefined,
                        staffId: error.item.staffId || undefined,
                        name: error.item.nome?.toString().trim() || "Nome não informado",
                        cpf: (() => {
                            // Garantir que CPF tenha pelo menos 11 caracteres para o backend
                            if (error.item.cpf) {
                                const cpfStr = error.item.cpf.toString().replace(/\D/g, "")
                                if (cpfStr.length >= 11) {
                                    return cpfStr
                                } else if (cpfStr.length > 0) {
                                    // Preencher com zeros à esquerda até 11 dígitos
                                    return cpfStr.padStart(11, '0')
                                }
                            }
                            if (error.item.rg) {
                                const rgStr = error.item.rg.toString().replace(/\D/g, "")
                                if (rgStr.length >= 11) {
                                    return rgStr
                                } else if (rgStr.length > 0) {
                                    // Preencher com zeros à esquerda até 11 dígitos
                                    return rgStr.padStart(11, '0')
                                }
                            }
                            return "00000000000" // CPF padrão se nenhum documento fornecido
                        })(),
                        email: error.item.email?.toString().trim() || undefined,
                        phone: error.item.phone?.toString().trim() || undefined,
                        role: error.item.funcao?.toString().trim() || "Função não informada",
                        company: error.item.empresa?.toString().trim() || "Empresa não informada",
                        checkIn: error.item.checkIn || undefined,
                        checkOut: error.item.checkOut || undefined,
                        presenceConfirmed: error.item.presenceConfirmed || undefined,
                        certificateIssued: error.item.certificateIssued || undefined,
                        notes: error.item.notes?.toString().trim() || undefined,
                        photo: error.item.photo || undefined,
                        documentPhoto: error.item.documentPhoto || undefined,
                        validatedBy: error.item.validatedBy || undefined,
                        daysWork: selectedEventDates ? selectedEventDates.map(date => new Date(date).toLocaleDateString('pt-BR')) : undefined,
                    }

                    dataToImport.push(participantData)
                })
            }

            const result = await importParticipants(dataToImport)

            setImportResult({
                success: dataToImport,
                errors: processedData.errors.filter((_, index) => !selectedInvalidData.has(index)),
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
                rg: "12345678", // Adicionar RG como alternativa
                empresa: "Empresa ABC",
                funcao: "Desenvolvedor",
                email: "joao@email.com",
                phone: "(11) 99999-9999",
                notes: "Observações aqui",
                credencial: "CREDENCIAL-001",
            },
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Modelo")
        XLSX.writeFile(wb, `modelo-participantes-${eventId}-${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    const downloadBigTestTemplate = () => {
        const generateValidCPF = (index: number): string => {
            // Gerar CPF válido baseado no índice
            const base = 12345678900 + index
            return base.toString()
        }

        const generateValidRG = (index: number): string => {
            // Gerar RG válido baseado no índice
            const base = 12345678 + index
            return base.toString()
        }

        const generateValidEmail = (index: number): string => {
            return `participante${index + 1}@teste.com`
        }

        const generateValidPhone = (index: number): string => {
            return `1199${String(index).padStart(6, "0")}`
        }

        const generateCredentialName = (index: number): string => {
            return `CREDENCIAL-${String(index + 1).padStart(3, "0")}`
        }

        const testData = Array.from({ length: 100 }, (_, i) => ({
            nome: `Participante ${i + 1}`,
            cpf: generateValidCPF(i),
            rg: generateValidRG(i), // Adicionar RG
            empresa: `Empresa ${i + 1}`,
            funcao: `Função ${i + 1}`,
            email: generateValidEmail(i),
            phone: generateValidPhone(i),
            notes: `Observação ${i + 1}`,
            credencial: generateCredentialName(i),
        }))

        const ws = XLSX.utils.json_to_sheet(testData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Teste Grande")
        XLSX.writeFile(wb, `teste-grande-participantes-${eventId}-${new Date().toISOString().split("T")[0]}.xlsx`)
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
                participant.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                participant.cpf.includes(searchTerm)

            const matchesCompany = filterCompany === "all" ||
                participant.company === filterCompany

            return matchesSearch && matchesCompany
        })

        // Ordenação
        filtered.sort((a, b) => {
            const aValue = a[sortBy]?.toLowerCase() || ""
            const bValue = b[sortBy]?.toLowerCase() || ""

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

    // Função para gerar datas do evento
    const getEventDates = () => {
        if (!evento) return []

        const dates: string[] = []

        // Usar apenas os dias do evento (preparation), não montagem e desmontagem
        if (evento.preparationStartDate && evento.preparationEndDate) {
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)

            const currentDate = new Date(startDate)
            while (currentDate <= endDate) {
                dates.push(currentDate.toISOString().split('T')[0])
                currentDate.setDate(currentDate.getDate() + 1)
            }
        }

        return dates
    }

    // Funções para o calendário
    const handleDateSelect = (date: string) => {
        setSelectedEventDates(prev => {
            const isSelected = prev.includes(date)
            if (isSelected) {
                return prev.filter(d => d !== date)
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
        return new Date(dateString).toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short'
        })
    }

    const getDayOfWeek = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'short' })
    }

    const getDayNumber = (dateString: string) => {
        return new Date(dateString).getDate()
    }

    const getMonthName = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', { month: 'short' })
    }

    const groupDatesByMonth = (dates: string[]) => {
        const groups: { [key: string]: string[] } = {}
        dates.forEach(date => {
            const monthKey = new Date(date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            if (!groups[monthKey]) {
                groups[monthKey] = []
            }
            groups[monthKey].push(date)
        })
        return groups
    }
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null
    // Step indicator component
    const StepIndicator = () => {
        const steps = [
            { key: "date", label: "Data", icon: Clock },
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

    // Estados para dados inválidos selecionáveis
    const [selectedInvalidData, setSelectedInvalidData] = useState<Set<number>>(new Set())
    const [showInvalidDataDetails, setShowInvalidDataDetails] = useState(false)

    // Função para selecionar/desselecionar dados inválidos
    const handleInvalidDataSelection = (index: number) => {
        setSelectedInvalidData(prev => {
            const newSet = new Set(prev)
            if (newSet.has(index)) {
                newSet.delete(index)
            } else {
                newSet.add(index)
            }
            return newSet
        })
    }

    // Função para selecionar todos os dados inválidos
    const handleSelectAllInvalidData = () => {
        if (processedData) {
            setSelectedInvalidData(new Set(processedData.errors.map((_, index) => index)))
        }
    }

    // Função para limpar seleção de dados inválidos
    const handleClearInvalidDataSelection = () => {
        setSelectedInvalidData(new Set())
    }

    // Função para incluir dados inválidos selecionados na importação
    const handleIncludeSelectedInvalidData = () => {
        if (!processedData) return

        const selectedErrors = Array.from(selectedInvalidData).map(index => processedData.errors[index])

        // Criar novos dados incluindo os selecionados
        const updatedData = [...processedData.data]
        let newValidCount = processedData.validRows
        let newInvalidCount = processedData.invalidRows

        selectedErrors.forEach(error => {
            // Tentar criar um participante válido a partir do erro
            const participantData: EventParticipantSchema = {
                eventId: eventId,
                credentialId: undefined,
                wristbandId: undefined,
                staffId: error.item.staffId || undefined,
                name: error.item.nome?.toString().trim() || "Nome não informado",
                cpf: error.item.cpf ? error.item.cpf.toString() : (error.item.rg ? error.item.rg.toString() : ""), // Usar CPF ou RG
                email: error.item.email?.toString().trim() || undefined,
                phone: error.item.phone?.toString().trim() || undefined,
                role: error.item.funcao?.toString().trim() || "Função não informada",
                company: error.item.empresa?.toString().trim() || "Empresa não informada",
                checkIn: error.item.checkIn || undefined,
                checkOut: error.item.checkOut || undefined,
                presenceConfirmed: error.item.presenceConfirmed || undefined,
                certificateIssued: error.item.certificateIssued || undefined,
                notes: error.item.notes?.toString().trim() || undefined,
                photo: error.item.photo || undefined,
                documentPhoto: error.item.documentPhoto || undefined,
                validatedBy: error.item.validatedBy || undefined,
                daysWork: selectedEventDates ? selectedEventDates.map(date => new Date(date).toLocaleDateString('pt-BR')) : undefined,
            }

            updatedData.push(participantData)
            newValidCount++
            newInvalidCount--
        })

        // Atualizar dados processados
        setProcessedData(prev => {
            if (!prev) return prev
            return {
                ...prev,
                data: updatedData,
                validRows: newValidCount,
                invalidRows: newInvalidCount,
                errors: prev.errors.filter((_, index) => !selectedInvalidData.has(index))
            }
        })

        // Limpar seleção
        setSelectedInvalidData(new Set())
        toast.success(`${selectedErrors.length} dados incluídos na importação`)
    }

    // Estados para correção rápida de dados inválidos
    const [editingInvalidData, setEditingInvalidData] = useState<number | null>(null)
    const [quickFixData, setQuickFixData] = useState<{ [key: number]: any }>({})

    // Função para iniciar edição de dados inválidos
    const handleStartEditing = (index: number, originalData: any) => {
        setEditingInvalidData(index)
        setQuickFixData(prev => ({
            ...prev,
            [index]: { ...originalData }
        }))
    }

    // Função para salvar correção rápida
    const handleSaveQuickFix = (index: number) => {
        if (!processedData) return

        const fixedData = quickFixData[index]
        const validation = validateParticipant(fixedData)

        if (validation.isValid) {
            // Criar novo participante válido
            const participantData: EventParticipantSchema = {
                eventId: eventId,
                credentialId: undefined,
                wristbandId: undefined,
                staffId: fixedData.staffId || undefined,
                name: fixedData.nome?.toString().trim() || "Nome não informado",
                cpf: (() => {
                    // Garantir que CPF tenha pelo menos 11 caracteres para o backend
                    if (fixedData.cpf) {
                        const cpfStr = fixedData.cpf.toString().replace(/\D/g, "")
                        if (cpfStr.length >= 11) {
                            return cpfStr
                        } else if (cpfStr.length > 0) {
                            // Preencher com zeros à esquerda até 11 dígitos
                            return cpfStr.padStart(11, '0')
                        }
                    }
                    if (fixedData.rg) {
                        const rgStr = fixedData.rg.toString().replace(/\D/g, "")
                        if (rgStr.length >= 11) {
                            return rgStr
                        } else if (rgStr.length > 0) {
                            // Preencher com zeros à esquerda até 11 dígitos
                            return rgStr.padStart(11, '0')
                        }
                    }
                    return "00000000000" // CPF padrão se nenhum documento fornecido
                })(),
                email: fixedData.email?.toString().trim() || undefined,
                phone: fixedData.phone?.toString().trim() || undefined,
                role: fixedData.funcao?.toString().trim() || "Função não informada",
                company: fixedData.empresa?.toString().trim() || "Empresa não informada",
                checkIn: fixedData.checkIn || undefined,
                checkOut: fixedData.checkOut || undefined,
                presenceConfirmed: fixedData.presenceConfirmed || undefined,
                certificateIssued: fixedData.certificateIssued || undefined,
                notes: fixedData.notes?.toString().trim() || undefined,
                photo: fixedData.photo || undefined,
                documentPhoto: fixedData.documentPhoto || undefined,
                validatedBy: fixedData.validatedBy || undefined,
                daysWork: selectedEventDates ? selectedEventDates.map(date => new Date(date).toLocaleDateString('pt-BR')) : undefined,
            }

            // Atualizar dados processados
            setProcessedData(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    data: [...prev.data, participantData],
                    validRows: prev.validRows + 1,
                    invalidRows: prev.invalidRows - 1,
                    errors: prev.errors.filter((_, i) => i !== index)
                }
            })

            // Limpar estados
            setEditingInvalidData(null)
            setQuickFixData(prev => {
                const newData = { ...prev }
                delete newData[index]
                return newData
            })

            toast.success("Dados corrigidos e incluídos na importação!")
        } else {
            toast.error(`Ainda há erros: ${validation.errors.join(", ")}`)
        }
    }

    // Função para cancelar edição
    const handleCancelEditing = (index: number) => {
        setEditingInvalidData(null)
        setQuickFixData(prev => {
            const newData = { ...prev }
            delete newData[index]
            return newData
        })
    }

    // Função para aplicar correção automática
    const handleAutoFix = (index: number, originalData: any) => {
        const fixedData = { ...originalData }

        // Correções automáticas
        if (!fixedData.nome || fixedData.nome.toString().trim().length < 2) {
            fixedData.nome = "Nome não informado"
        }

        if (!fixedData.empresa || fixedData.empresa.toString().trim().length < 2) {
            fixedData.empresa = "Empresa não informada"
        }

        if (!fixedData.funcao || fixedData.funcao.toString().trim().length < 2) {
            fixedData.funcao = "Função não informada"
        }

        if (!fixedData.cpf && !fixedData.rg) {
            fixedData.cpf = "00000000000" // CPF padrão
        }

        // Limpar email inválido
        if (fixedData.email && !isValidEmail(fixedData.email.toString())) {
            fixedData.email = ""
        }

        // Limpar telefone inválido
        if (fixedData.phone && fixedData.phone.toString().replace(/\D/g, "").length < 10) {
            fixedData.phone = ""
        }

        setQuickFixData(prev => ({
            ...prev,
            [index]: fixedData
        }))

        toast.success("Correção automática aplicada! Revise os dados.")
    }

    // Estados para correção rápida na etapa prévia
    const [previewEditingData, setPreviewEditingData] = useState<number | null>(null)
    const [previewFixData, setPreviewFixData] = useState<{ [key: number]: any }>({})
    const [showPreviewDetails, setShowPreviewDetails] = useState(false)

    // Função para iniciar edição na etapa prévia
    const handleStartPreviewEditing = (index: number, originalData: any) => {
        setPreviewEditingData(index)
        setPreviewFixData(prev => ({
            ...prev,
            [index]: { ...originalData }
        }))
    }

    // Função para salvar correção na etapa prévia
    const handleSavePreviewFix = (index: number) => {
        if (!excelData) return

        const fixedData = previewFixData[index]
        const validation = validateParticipant(fixedData)

        if (validation.isValid) {
            // Atualizar dados do Excel
            setExcelData(prev => {
                if (!prev) return prev
                const newData = [...prev]
                newData[index] = fixedData
                return newData
            })

            // Limpar estados
            setPreviewEditingData(null)
            setPreviewFixData(prev => {
                const newData = { ...prev }
                delete newData[index]
                return newData
            })

            toast.success("Dados corrigidos na prévia!")
        } else {
            toast.error(`Ainda há erros: ${validation.errors.join(", ")}`)
        }
    }

    // Função para cancelar edição na etapa prévia
    const handleCancelPreviewEditing = (index: number) => {
        setPreviewEditingData(null)
        setPreviewFixData(prev => {
            const newData = { ...prev }
            delete newData[index]
            return newData
        })
    }

    // Função para aplicar correção automática na etapa prévia
    const handlePreviewAutoFix = (index: number, originalData: any) => {
        const fixedData = { ...originalData }

        // Correções automáticas
        if (!fixedData.nome || fixedData.nome.toString().trim().length < 2) {
            fixedData.nome = "Nome não informado"
        }

        if (!fixedData.empresa || fixedData.empresa.toString().trim().length < 2) {
            fixedData.empresa = "Empresa não informada"
        }

        if (!fixedData.funcao || fixedData.funcao.toString().trim().length < 2) {
            fixedData.funcao = "Função não informada"
        }

        if (!fixedData.cpf && !fixedData.rg) {
            fixedData.cpf = "00000000000"
        }

        if (fixedData.email && !isValidEmail(fixedData.email.toString())) {
            fixedData.email = ""
        }

        if (fixedData.phone && fixedData.phone.toString().replace(/\D/g, "").length < 10) {
            fixedData.phone = ""
        }

        setPreviewFixData(prev => ({
            ...prev,
            [index]: fixedData
        }))

        toast.success("Correção automática aplicada na prévia!")
    }

    // Função para processar dados com correções da etapa prévia
    const processExcelFileWithFixes = (data: any[]) => {
        const processedData: EventParticipantSchema[] = []
        const errors: { row: number; item: any; error: string }[] = []
        const existingCPFs = new Set<string>()
        const processedCPFs = new Set<string>()

        data.forEach((row, index) => {
            // Usar dados corrigidos se disponível
            const rowData = previewFixData[index] || row

            const cleanedCPF = rowData.cpf?.toString().replace(/\D/g, "") || ""
            const cleanedRG = rowData.rg?.toString().replace(/\D/g, "") || ""

            // Verificar duplicatas
            if ((cleanedCPF && existingCPFs.has(cleanedCPF)) ||
                (cleanedRG && existingCPFs.has(cleanedRG)) ||
                (cleanedCPF && processedCPFs.has(cleanedCPF)) ||
                (cleanedRG && processedCPFs.has(cleanedRG))) {
                errors.push({
                    row: index + 2,
                    item: rowData,
                    error: "CPF ou RG duplicado"
                })
                return
            }

            const validation = validateParticipant(rowData)

            if (validation.isValid) {
                const participantData: EventParticipantSchema = {
                    eventId: eventId,
                    credentialId: undefined,
                    wristbandId: undefined,
                    staffId: rowData.staffId || undefined,
                    name: rowData.nome?.toString().trim() || "Nome não informado",
                    cpf: (() => {
                        // Garantir que CPF tenha pelo menos 11 caracteres para o backend
                        if (rowData.cpf) {
                            const cpfStr = rowData.cpf.toString().replace(/\D/g, "")
                            if (cpfStr.length >= 11) {
                                return cpfStr
                            } else if (cpfStr.length > 0) {
                                // Preencher com zeros à esquerda até 11 dígitos
                                return cpfStr.padStart(11, '0')
                            }
                        }
                        if (rowData.rg) {
                            const rgStr = rowData.rg.toString().replace(/\D/g, "")
                            if (rgStr.length >= 11) {
                                return rgStr
                            } else if (rgStr.length > 0) {
                                // Preencher com zeros à esquerda até 11 dígitos
                                return rgStr.padStart(11, '0')
                            }
                        }
                        return "00000000000" // CPF padrão se nenhum documento fornecido
                    })(),
                    email: rowData.email?.toString().trim() || undefined,
                    phone: rowData.phone?.toString().trim() || undefined,
                    role: rowData.funcao?.toString().trim() || "Função não informada",
                    company: rowData.empresa?.toString().trim() || "Empresa não informada",
                    checkIn: rowData.checkIn || undefined,
                    checkOut: rowData.checkOut || undefined,
                    presenceConfirmed: rowData.presenceConfirmed || undefined,
                    certificateIssued: rowData.certificateIssued || undefined,
                    notes: rowData.notes?.toString().trim() || undefined,
                    photo: rowData.photo || undefined,
                    documentPhoto: rowData.documentPhoto || undefined,
                    validatedBy: rowData.validatedBy || undefined,
                    daysWork: selectedEventDates ? selectedEventDates.map(date => new Date(date).toLocaleDateString('pt-BR')) : undefined,
                }

                processedData.push(participantData)

                if (cleanedCPF) processedCPFs.add(cleanedCPF)
                if (cleanedRG) processedCPFs.add(cleanedRG)
            } else {
                errors.push({
                    row: index + 2,
                    item: rowData,
                    error: validation.errors.join(", ")
                })
            }
        })

        return {
            data: processedData,
            errors,
            validRows: processedData.length,
            invalidRows: errors.length
        }
    }

    // Função para verificar se pode prosseguir com a importação
    const canProceedWithImport = () => {
        console.log("🔍 canProceedWithImport chamada")
        console.log("📊 processedData:", processedData)

        if (!processedData) {
            console.log("❌ processedData é null")
            return false
        }

        const hasMissingCredentials = processedData.missingCredentials && processedData.missingCredentials.length > 0
        const hasMissingCompanies = processedData.missingCompanies && processedData.missingCompanies.length > 0
        const hasValidRows = processedData.validRows > 0

        console.log("📋 hasMissingCredentials:", hasMissingCredentials, "length:", processedData.missingCredentials?.length)
        console.log("🏢 hasMissingCompanies:", hasMissingCompanies, "length:", processedData.missingCompanies?.length)
        console.log("✅ hasValidRows:", hasValidRows, "validRows:", processedData.validRows)

        const canProceed = !hasMissingCredentials && !hasMissingCompanies && hasValidRows
        console.log("🚀 canProceed:", canProceed)

        return canProceed
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

                                        {/* Controles do calendário */}
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
                                                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                                                >
                                                    Selecionar Todas
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleClearDates}
                                                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                                >
                                                    Limpar Seleção
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Calendário */}
                                        <div className="space-y-6">
                                            {Object.entries(groupDatesByMonth(getEventDates())).map(([month, dates]) => (
                                                <div key={month} className="border border-gray-200 rounded-lg p-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{month}</h3>
                                                    <div className="grid grid-cols-7 gap-2">
                                                        {/* Cabeçalho dos dias da semana */}
                                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                                            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                                                {day}
                                                            </div>
                                                        ))}

                                                        {/* Dias do mês */}
                                                        {dates.map(date => {
                                                            const isSelected = selectedEventDates.includes(date)
                                                            const isToday = date === new Date().toISOString().split('T')[0]

                                                            return (
                                                                <button
                                                                    key={date}
                                                                    onClick={() => handleDateSelect(date)}
                                                                    className={`
                                                                        relative p-3 rounded-lg text-center transition-all duration-200
                                                                        ${isSelected
                                                                            ? 'bg-blue-600 text-white shadow-md'
                                                                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                                                        }
                                                                        ${isToday ? 'ring-2 ring-blue-300' : ''}
                                                                    `}
                                                                >
                                                                    <div className="text-sm font-medium">
                                                                        {getDayNumber(date)}
                                                                    </div>
                                                                    {isSelected && (
                                                                        <Check className="w-4 h-4 absolute top-1 right-1" />
                                                                    )}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Datas selecionadas */}
                                        {selectedEventDates.length > 0 && (
                                            <div className="mt-6">
                                                <h4 className="text-sm font-medium text-gray-700 mb-3">Datas Selecionadas:</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedEventDates.map(date => (
                                                        <Badge
                                                            key={date}
                                                            variant="secondary"
                                                            className="bg-blue-100 text-blue-800 border-blue-200"
                                                        >
                                                            {formatDate(date)}
                                                            <button
                                                                onClick={() => handleDateSelect(date)}
                                                                className="ml-2 hover:text-blue-600"
                                                            >
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
                                                <strong>Colunas opcionais:</strong> email, phone, notes, credencial
                                            </p>
                                            <p>
                                                <strong>Formato CPF:</strong> 123.456.789-00, 12345678900 ou formatos alternativos (mais flexível)
                                            </p>
                                            <p>
                                                <strong>Formato RG:</strong> 12345678, 12.345.678-9 ou formatos alternativos (mais flexível)
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
                                            <p>
                                                <strong>credencial:</strong> se não fornecida, o participante ficará sem credencial
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

                        {/* Etapa 2: Prévia dos dados */}
                        {currentStep === "preview" && processedData && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Prévia dos Dados</h3>
                                    <div className="flex items-center gap-2">
                                        {isUpdatingAfterCredentialCreation && (
                                            <div className="flex items-center gap-2 text-blue-600 text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Atualizando dados...
                                            </div>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowPreviewDetails(!showPreviewDetails)}
                                        >
                                            {showPreviewDetails ? "Ocultar Detalhes" : "Mostrar Detalhes"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                processedData.errors.forEach((error, index) => {
                                                    handlePreviewAutoFix(index, error.item)
                                                })
                                            }}
                                            className="text-green-700 border-green-300 hover:bg-green-50"
                                        >
                                            Correção Automática para Todos
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                Dados Válidos
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-green-600">
                                                {processedData.validRows}
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                participantes prontos para importação
                                            </p>
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
                                            <div className="text-2xl font-bold text-red-600">
                                                {processedData.invalidRows}
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                participantes com problemas
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Lista de dados inválidos com correção rápida */}
                                {processedData.invalidRows > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                                                Dados que Precisam de Correção
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {processedData.errors.map((error, index) => (
                                                    <div
                                                        key={index}
                                                        className="text-sm p-3 rounded border-l-4 border-red-400 bg-red-50 hover:bg-red-100 transition-all duration-200"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="font-medium mb-1">
                                                                    Linha {error.row}: {error.item.nome || "Nome não informado"}
                                                                </div>

                                                                {showPreviewDetails && (
                                                                    <div className="ml-6 space-y-1">
                                                                        <div className="text-red-600 font-medium">
                                                                            Erros específicos:
                                                                        </div>
                                                                        <ul className="list-disc list-inside space-y-1 text-red-600">
                                                                            {error.error.split(", ").map((err, errIndex) => (
                                                                                <li key={errIndex} className="text-sm">
                                                                                    {err}
                                                                                </li>
                                                                            ))}
                                                                        </ul>

                                                                        {/* Interface de Correção Rápida na Prévia */}
                                                                        {previewEditingData === index ? (
                                                                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                                                <div className="text-sm font-medium text-blue-800 mb-2">
                                                                                    Correção Rápida - Linha {error.row}
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                                                                                        <Input
                                                                                            value={previewFixData[index]?.nome || ""}
                                                                                            onChange={(e) => setPreviewFixData(prev => ({
                                                                                                ...prev,
                                                                                                [index]: { ...prev[index], nome: e.target.value }
                                                                                            }))}
                                                                                            className="text-xs h-8"
                                                                                            placeholder="Nome"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">CPF</label>
                                                                                        <Input
                                                                                            value={previewFixData[index]?.cpf || ""}
                                                                                            onChange={(e) => setPreviewFixData(prev => ({
                                                                                                ...prev,
                                                                                                [index]: { ...prev[index], cpf: e.target.value }
                                                                                            }))}
                                                                                            className="text-xs h-8"
                                                                                            placeholder="CPF"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">RG</label>
                                                                                        <Input
                                                                                            value={previewFixData[index]?.rg || ""}
                                                                                            onChange={(e) => setPreviewFixData(prev => ({
                                                                                                ...prev,
                                                                                                [index]: { ...prev[index], rg: e.target.value }
                                                                                            }))}
                                                                                            className="text-xs h-8"
                                                                                            placeholder="RG"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
                                                                                        <Input
                                                                                            value={previewFixData[index]?.empresa || ""}
                                                                                            onChange={(e) => setPreviewFixData(prev => ({
                                                                                                ...prev,
                                                                                                [index]: { ...prev[index], empresa: e.target.value }
                                                                                            }))}
                                                                                            className="text-xs h-8"
                                                                                            placeholder="Empresa"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Função</label>
                                                                                        <Input
                                                                                            value={previewFixData[index]?.funcao || ""}
                                                                                            onChange={(e) => setPreviewFixData(prev => ({
                                                                                                ...prev,
                                                                                                [index]: { ...prev[index], funcao: e.target.value }
                                                                                            }))}
                                                                                            className="text-xs h-8"
                                                                                            placeholder="Função"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                                                                        <Input
                                                                                            value={previewFixData[index]?.email || ""}
                                                                                            onChange={(e) => setPreviewFixData(prev => ({
                                                                                                ...prev,
                                                                                                [index]: { ...prev[index], email: e.target.value }
                                                                                            }))}
                                                                                            className="text-xs h-8"
                                                                                            placeholder="Email"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-2 mt-3">
                                                                                    <Button
                                                                                        size="sm"
                                                                                        onClick={() => handleSavePreviewFix(index)}
                                                                                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                                                                    >
                                                                                        Salvar Correção
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        onClick={() => handleCancelPreviewEditing(index)}
                                                                                        className="text-xs"
                                                                                    >
                                                                                        Cancelar
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                                                                <div className="font-medium text-gray-700 mb-1">Dados da linha:</div>
                                                                                <div className="grid grid-cols-2 gap-1 text-gray-600">
                                                                                    <div><strong>Nome:</strong> {error.item.nome || "Não informado"}</div>
                                                                                    <div><strong>CPF:</strong> {error.item.cpf || "Não informado"}</div>
                                                                                    <div><strong>RG:</strong> {error.item.rg || "Não informado"}</div>
                                                                                    <div><strong>Empresa:</strong> {error.item.empresa || "Não informada"}</div>
                                                                                    <div><strong>Função:</strong> {error.item.funcao || "Não informada"}</div>
                                                                                    <div><strong>Email:</strong> {error.item.email || "Não informado"}</div>
                                                                                    <div><strong>Telefone:</strong> {error.item.phone || "Não informado"}</div>
                                                                                </div>
                                                                                <div className="flex gap-2 mt-2">
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        onClick={() => handleStartPreviewEditing(index, error.item)}
                                                                                        className="text-blue-700 border-blue-300 hover:bg-blue-50 text-xs"
                                                                                    >
                                                                                        Editar
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        onClick={() => handlePreviewAutoFix(index, error.item)}
                                                                                        className="text-green-700 border-green-300 hover:bg-green-50 text-xs"
                                                                                    >
                                                                                        Correção Automática
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <div className="flex justify-between">
                                    <Button variant="outline" onClick={handlePrevStep}>
                                        Voltar
                                    </Button>
                                    <Button onClick={handleNextStep} disabled={processedData.invalidRows > 0}>
                                        Continuar
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
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-semibold text-red-600 flex items-center">
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Erros Encontrados ({processedData.errors.length})
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setShowInvalidDataDetails(!showInvalidDataDetails)}
                                                            className="text-red-700 border-red-300 hover:bg-red-50"
                                                        >
                                                            {showInvalidDataDetails ? "Ocultar Detalhes" : "Mostrar Detalhes"}
                                                        </Button>
                                                        {selectedInvalidData.size > 0 && (
                                                            <Button
                                                                onClick={handleIncludeSelectedInvalidData}
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                            >
                                                                Incluir {selectedInvalidData.size} Selecionado(s)
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Controles de seleção */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleSelectAllInvalidData}
                                                        className="text-red-700 border-red-300 hover:bg-red-50"
                                                    >
                                                        Selecionar Todos
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleClearInvalidDataSelection}
                                                        className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                                    >
                                                        Limpar Seleção
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            processedData.errors.forEach((error, index) => {
                                                                handleAutoFix(index, error.item)
                                                            })
                                                        }}
                                                        className="text-green-700 border-green-300 hover:bg-green-50"
                                                    >
                                                        Correção Automática para Todos
                                                    </Button>
                                                    <Badge variant="outline" className="text-red-700">
                                                        {selectedInvalidData.size} selecionado(s)
                                                    </Badge>
                                                </div>

                                                <div className="max-h-60 overflow-y-auto space-y-2">
                                                    {processedData.errors.map((error, index) => (
                                                        <div
                                                            key={index}
                                                            className={`text-sm p-3 rounded border-l-4 transition-all duration-200 ${selectedInvalidData.has(index)
                                                                ? 'bg-green-50 border-green-400 border-l-4'
                                                                : 'bg-red-50 border-red-400 hover:bg-red-100'
                                                                }`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedInvalidData.has(index)}
                                                                            onChange={() => handleInvalidDataSelection(index)}
                                                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                                        />
                                                                        <span className="font-medium">
                                                                            Linha {error.row}: {error.item.nome || "Nome não informado"}
                                                                        </span>
                                                                        {selectedInvalidData.has(index) && (
                                                                            <Badge variant="outline" className="text-green-700 bg-green-100">
                                                                                Será incluído
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    {showInvalidDataDetails && (
                                                                        <div className="ml-6 space-y-1">
                                                                            <div className="text-red-600 font-medium">
                                                                                Erros específicos:
                                                                            </div>
                                                                            <ul className="list-disc list-inside space-y-1 text-red-600">
                                                                                {error.error.split(", ").map((err, errIndex) => (
                                                                                    <li key={errIndex} className="text-sm">
                                                                                        {err}
                                                                                    </li>
                                                                                ))}
                                                                            </ul>

                                                                            {/* Interface de Correção Rápida */}
                                                                            {editingInvalidData === index ? (
                                                                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                                                    <div className="text-sm font-medium text-blue-800 mb-2">
                                                                                        Correção Rápida - Linha {error.row}
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        <div>
                                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                                                                                            <Input
                                                                                                value={quickFixData[index]?.nome || ""}
                                                                                                onChange={(e) => setQuickFixData(prev => ({
                                                                                                    ...prev,
                                                                                                    [index]: { ...prev[index], nome: e.target.value }
                                                                                                }))}
                                                                                                className="text-xs h-8"
                                                                                                placeholder="Nome"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">CPF</label>
                                                                                            <Input
                                                                                                value={quickFixData[index]?.cpf || ""}
                                                                                                onChange={(e) => setQuickFixData(prev => ({
                                                                                                    ...prev,
                                                                                                    [index]: { ...prev[index], cpf: e.target.value }
                                                                                                }))}
                                                                                                className="text-xs h-8"
                                                                                                placeholder="CPF"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">RG</label>
                                                                                            <Input
                                                                                                value={quickFixData[index]?.rg || ""}
                                                                                                onChange={(e) => setQuickFixData(prev => ({
                                                                                                    ...prev,
                                                                                                    [index]: { ...prev[index], rg: e.target.value }
                                                                                                }))}
                                                                                                className="text-xs h-8"
                                                                                                placeholder="RG"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
                                                                                            <Input
                                                                                                value={quickFixData[index]?.empresa || ""}
                                                                                                onChange={(e) => setQuickFixData(prev => ({
                                                                                                    ...prev,
                                                                                                    [index]: { ...prev[index], empresa: e.target.value }
                                                                                                }))}
                                                                                                className="text-xs h-8"
                                                                                                placeholder="Empresa"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Função</label>
                                                                                            <Input
                                                                                                value={quickFixData[index]?.funcao || ""}
                                                                                                onChange={(e) => setQuickFixData(prev => ({
                                                                                                    ...prev,
                                                                                                    [index]: { ...prev[index], funcao: e.target.value }
                                                                                                }))}
                                                                                                className="text-xs h-8"
                                                                                                placeholder="Função"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                                                                            <Input
                                                                                                value={quickFixData[index]?.email || ""}
                                                                                                onChange={(e) => setQuickFixData(prev => ({
                                                                                                    ...prev,
                                                                                                    [index]: { ...prev[index], email: e.target.value }
                                                                                                }))}
                                                                                                className="text-xs h-8"
                                                                                                placeholder="Email"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex gap-2 mt-3">
                                                                                        <Button
                                                                                            size="sm"
                                                                                            onClick={() => handleSaveQuickFix(index)}
                                                                                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                                                                        >
                                                                                            Salvar Correção
                                                                                        </Button>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            onClick={() => handleCancelEditing(index)}
                                                                                            className="text-xs"
                                                                                        >
                                                                                            Cancelar
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                                                                    <div className="font-medium text-gray-700 mb-1">Dados da linha:</div>
                                                                                    <div className="grid grid-cols-2 gap-1 text-gray-600">
                                                                                        <div><strong>Nome:</strong> {error.item.nome || "Não informado"}</div>
                                                                                        <div><strong>CPF:</strong> {error.item.cpf || "Não informado"}</div>
                                                                                        <div><strong>RG:</strong> {error.item.rg || "Não informado"}</div>
                                                                                        <div><strong>Empresa:</strong> {error.item.empresa || "Não informada"}</div>
                                                                                        <div><strong>Função:</strong> {error.item.funcao || "Não informada"}</div>
                                                                                        <div><strong>Email:</strong> {error.item.email || "Não informado"}</div>
                                                                                        <div><strong>Telefone:</strong> {error.item.phone || "Não informado"}</div>
                                                                                    </div>
                                                                                    <div className="flex gap-2 mt-2">
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            onClick={() => handleStartEditing(index, error.item)}
                                                                                            className="text-blue-700 border-blue-300 hover:bg-blue-50 text-xs"
                                                                                        >
                                                                                            Editar
                                                                                        </Button>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            onClick={() => handleAutoFix(index, error.item)}
                                                                                            className="text-green-700 border-green-300 hover:bg-green-50 text-xs"
                                                                                        >
                                                                                            Correção Automática
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {processedData.errors.length > 10 && (
                                                    <p className="text-sm text-gray-500 text-center mt-2">
                                                        ... e mais {processedData.errors.length - 10} erros
                                                    </p>
                                                )}

                                                {selectedInvalidData.size > 0 && (
                                                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                                            <span className="font-medium text-green-800">
                                                                {selectedInvalidData.size} item(s) selecionado(s) para inclusão
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-green-700">
                                                            Os dados selecionados serão incluídos na importação com valores padrão para campos inválidos.
                                                        </p>
                                                    </div>
                                                )}
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
                                        {processedData.missingCredentials && processedData.missingCredentials.length > 0 && (
                                            <Card className="mb-6">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <FileText className="h-5 w-5 text-blue-600" />
                                                        Credenciais Faltantes
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {processedData.missingCredentials.map((cred) => (
                                                            <Badge key={cred.name} variant="outline" className="text-xs">
                                                                {cred.name} <span className="ml-1 text-gray-500">({cred.count})</span>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-gray-600">Cor:</span>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="color"
                                                                    value={credentialColor}
                                                                    onChange={(e) => setCredentialColor(e.target.value)}
                                                                    className="w-8 h-8 rounded border"
                                                                />
                                                                <Input
                                                                    type="text"
                                                                    value={credentialColor}
                                                                    onChange={(e) => setCredentialColor(e.target.value)}
                                                                    placeholder="#000000"
                                                                    className="w-24 text-sm font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        className="text-blue-700 border-blue-300 hover:bg-blue-50"
                                                        disabled={isCreatingCredentials}
                                                        onClick={createMissingCredentials}
                                                    >
                                                        {isCreatingCredentials ? "Criando credenciais..." : `Criar todas as credenciais (${processedData.missingCredentials.length})`}
                                                    </Button>

                                                    <Dialog open={isCredentialDialogOpen}>
                                                        <DialogContent className="max-w-md">
                                                            <DialogHeader>
                                                                <DialogTitle>Criando credenciais...</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="flex flex-col items-center justify-center py-8">
                                                                <div className="h-8 w-8 mb-4 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                                                                <span className="text-blue-700">Aguarde, criando credenciais...</span>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </CardContent>
                                            </Card>
                                        )}
                                        {processedData.missingCompanies && processedData.missingCompanies.length > 0 && (
                                            <Card className="mb-6">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Building className="h-5 w-5 text-green-600" />
                                                        Empresas Faltantes
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {processedData.missingCompanies.map((company) => (
                                                            <Badge key={company.name} variant="outline" className="text-xs">
                                                                {company.name} <span className="ml-1 text-gray-500">({company.count})</span>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        className="text-green-700 border-green-300 hover:bg-green-50"
                                                        disabled={isCreatingCompanies}
                                                        onClick={createMissingCompanies}
                                                    >
                                                        {isCreatingCompanies ? "Criando empresas..." : `Criar todas as empresas (${processedData.missingCompanies.length})`}
                                                    </Button>
                                                    <Dialog open={isCompanyDialogOpen}>
                                                        <DialogContent className="max-w-md">
                                                            <DialogHeader>
                                                                <DialogTitle>Criando empresas...</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="flex flex-col items-center justify-center py-8">
                                                                <div className="h-8 w-8 mb-4 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
                                                                <span className="text-green-700">Aguarde, criando empresas...</span>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </CardContent>
                                            </Card>
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
                                        disabled={!canProceedWithImport()}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {!canProceedWithImport() ? (
                                            <>
                                                {processedData?.missingCredentials?.length > 0 || processedData?.missingCompanies?.length > 0 ? (
                                                    "Crie todas as credenciais e empresas faltantes primeiro"
                                                ) : (
                                                    "Nenhum participante válido para importar"
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                Iniciar Importação ({processedData.validRows + selectedInvalidData.size} participantes)
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
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
                                    <p>• Dados incluídos: nome, CPF, empresa, função, email, telefone, dias de trabalho, etc.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Modais de progresso - movidos para fora dos Cards */}
            <Dialog open={isCredentialDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Criando credenciais...</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="h-8 w-8 mb-4 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                        <span className="text-blue-700">Aguarde, criando credenciais...</span>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCompanyDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Criando empresas...</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="h-8 w-8 mb-4 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
                        <span className="text-green-700">Aguarde, criando empresas...</span>
                    </div>
                </DialogContent>
            </Dialog>

        </EventLayout>
    )
}


