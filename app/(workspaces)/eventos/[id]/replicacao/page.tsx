/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import React, { useEffect } from 'react'
import {
    ArrowLeft,
    Copy,
    Check,
    ChevronDown,
    Clock,
    Sun,
    Moon,
    Users,
    Building2,
    CreditCard,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    Play,
    Pause,
    RotateCcw,
    Filter,
    X,
    ArrowRight,
    Database,
    UserCheck,
} from 'lucide-react'

import EventLayout from '@/components/dashboard/dashboard-layout'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useEventParticipantsGrouped } from '@/features/eventos/api/query/use-event-participants-grouped'
import { useEmpresasByEvent } from '@/features/eventos/api/query/use-empresas'
import { useCredentials } from '@/features/eventos/api/query'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { EventParticipant } from '@/features/eventos/types'
import { useEventDays } from '@/features/eventos/hooks/use-event-days'
import { EventDaySelector } from '@/features/eventos/components/event-day-selector'
import { useCreateEmpresa } from '@/features/eventos/api/mutation/use-create-empresa'
import { useCreateCredential } from '@/features/eventos/api/mutation/use-credential-mutations'
import { useCreateEventParticipant } from '@/features/eventos/api/mutation/use-create-event-participant'


export default function ParticipantReplicationPage() {
    const params = useParams()
    const router = useRouter()
    // Dados do evento
    const { data: eventos, isLoading: eventosLoading } = useEventos()
    const evento = useMemo(() => {
        return Array.isArray(eventos)
            ? eventos.find(e => String(e.id) === String(params.id))
            : undefined
    }, [eventos, params.id])

    // Dados dos participantes
    const { data: participantsData = [] } = useEventParticipantsByEvent({
        eventId: String(params.id)
    })
    const { data: groupedParticipantsData = [] } = useEventParticipantsGrouped({
        eventId: String(params.id)
    })
    const { data: empresas = [] } = useEmpresasByEvent(String(params.id))
    const { data: credentials } = useCredentials({ eventId: String(params.id) })

    // Estados da interface
    const [selectedSourceDay, setSelectedSourceDay] = useState<string>('')
    const [selectedTargetDay, setSelectedTargetDay] = useState<string>('')
    const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [showProgressDialog, setShowProgressDialog] = useState(false)

    // Estados da replicação completa
    const [replicationData, setReplicationData] = useState<any | null>(null)
    const [isReplicating, setIsReplicating] = useState(false)
    const [replicationReport, setReplicationReport] = useState<{ startedAt?: string; finishedAt?: string; steps: Array<{ step: 'empresas' | 'credenciais' | 'participantes'; ok: string[]; skipped: string[]; errors: string[] }>; summary?: string } | null>(null)
    const [replicationProgress, setReplicationProgress] = useState({
        currentStep: 'empresas' as 'empresas' | 'credenciais' | 'participantes',
        currentStepProgress: 0,
        totalProgress: 0,
        currentItem: '',
        empresasCount: { completed: 0, total: 0, errors: 0 },
        credenciaisCount: { completed: 0, total: 0, errors: 0 },
        participantesCount: { completed: 0, total: 0, errors: 0 },
        startTime: null as Date | null
    })

    // Rate limiting
    const [rateLimitQueue, setRateLimitQueue] = useState<Array<() => Promise<void>>>([])
    const [isProcessingQueue, setIsProcessingQueue] = useState(false)

    // Hook para gerenciar dias do evento
    const { eventDays, parseShiftId } = useEventDays(evento)

    // Definir título da página
    useEffect(() => {
        document.title = "Replicação - Painel Administrativo"
    }, [])

    // Mutations para replicação
    const createEmpresaMutation = useCreateEmpresa()
    const createCredentialMutation = useCreateCredential()
    const createParticipantMutation = useCreateEventParticipant()

    // Função para obter participantes de um turno específico (preferindo lista plana por evento)
    const getParticipantsByShift = useCallback((shiftId: string): EventParticipant[] => {
        if (!shiftId) return []

        const { dateFormatted } = parseShiftId(shiftId)
        const normalizeCpf = (v: any) => (typeof v === 'string' ? v.replace(/\D/g, '') : '')
        const normalizeRg = (v: any) => String(v ?? '').replace(/\s+/g, '').toLowerCase()
        const normalizeName = (v: any) => String(v ?? '').trim().toLowerCase()

        const fromFlat = (Array.isArray(participantsData) ? participantsData : []).filter((p: any) => {
            const inShift = p.shiftId === shiftId
            const inDays = Array.isArray(p.daysWork) && (p.daysWork.includes(shiftId) || p.daysWork.includes(dateFormatted))
            return inShift || inDays
        })

        // Fallback complementar a partir do agrupado (para casos não presentes na lista plana)
        const fromGrouped: EventParticipant[] = []
        groupedParticipantsData.forEach(group => {
            const currentShiftParticipant = group.shifts.find(shift => (shift as any).shiftId === shiftId)
            if (currentShiftParticipant) {
                fromGrouped.push(currentShiftParticipant)
                return
            }
            const participant = group.participant
            if (participant?.daysWork && participant.daysWork.length > 0) {
                const hasDay = participant.daysWork.some((workDay: string) => workDay === shiftId || workDay === dateFormatted)
                if (hasDay) fromGrouped.push(participant)
            }
        })

        // Deduplicar (prioriza CPF, senão nome)
        const seen = new Set<string>()
        const result: EventParticipant[] = []
        const pushUnique = (p: any) => {
            const cpf = normalizeCpf(p.cpf)
            const rg = normalizeRg(p.rg)
            const name = normalizeName(p.name)
            const key = cpf ? `cpf:${cpf}` : (rg ? `rg:${rg}` : `name:${name}`)
            if (!key || seen.has(key)) return
            seen.add(key)
            result.push(p)
        }

        fromFlat.forEach(pushUnique)
        fromGrouped.forEach(pushUnique)

        return result
    }, [participantsData, groupedParticipantsData, parseShiftId])

    // Rate limiting - processar exatamente até 100 operações por minuto em lotes
    const processRateLimitedQueue = useCallback(async () => {
        if (isProcessingQueue || rateLimitQueue.length === 0) return

        setIsProcessingQueue(true)
        const operations = rateLimitQueue.slice(0, 100)
        const remainingAfterThisBatch = Math.max(0, rateLimitQueue.length - 100)

        // Remover do estado imediatamente o lote que será processado
        setRateLimitQueue(prev => prev.slice(100))

        try {
            await Promise.allSettled(operations.map(op => op()))
        } catch (error) {
            console.error('Erro no processamento da fila:', error)
        } finally {
            if (remainingAfterThisBatch > 0) {
                setTimeout(() => {
                    setIsProcessingQueue(false)
                }, 60000)
            } else {
                setIsProcessingQueue(false)
            }
        }
    }, [isProcessingQueue, rateLimitQueue])

    // Adicionar operação à fila e retornar uma Promise para aguardar conclusão
    const addToQueue = useCallback((operation: () => Promise<void>) => {
        return new Promise<void>((resolve, reject) => {
            const wrapped = async () => {
                try {
                    await operation()
                    resolve()
                } catch (e) {
                    reject(e)
                }
            }
            setRateLimitQueue(prev => [...prev, wrapped])
        })
    }, [])

    // Checagem simples de duplicidade por chave única dentro do turno de destino já filtrado
    const isDuplicateItem = useCallback((sourceItem: any, targetItems: any[], type: 'empresa' | 'credential' | 'participant') => {
        return targetItems.some(targetItem => {
            if (type === 'empresa') {
                return targetItem.nome === sourceItem.nome
            }
            if (type === 'credential') {
                const sourceKey = sourceItem.nome ?? sourceItem.type
                const targetKey = targetItem.nome ?? targetItem.type
                return targetKey === sourceKey
            }
            if (type === 'participant') {
                const normalizeCpf = (v: any) => (typeof v === 'string' ? v.replace(/\D/g, '') : '')
                const normalizeRg = (v: any) => String(v ?? '').replace(/\s+/g, '').toLowerCase()
                const normalizeName = (v: any) => String(v ?? '').trim().toLowerCase()

                const sourceCpf = normalizeCpf(sourceItem.cpf)
                const targetCpf = normalizeCpf(targetItem.cpf)
                const sourceRg = normalizeRg(sourceItem.rg)
                const targetRg = normalizeRg(targetItem.rg)

                let idMatch = false
                if (sourceCpf && targetCpf) {
                    idMatch = sourceCpf === targetCpf
                } else if (sourceRg && targetRg) {
                    idMatch = sourceRg === targetRg
                } else {
                    const sourceName = normalizeName(sourceItem.name)
                    const targetName = normalizeName(targetItem.name)
                    if (!sourceName || !targetName) return false
                    idMatch = sourceName === targetName
                }
                if (!idMatch) return false

                const sameShift = (targetItem.shiftId && targetItem.shiftId === selectedTargetDay)
                    || (Array.isArray(targetItem.daysWork) && targetItem.daysWork.includes(selectedTargetDay))
                return sameShift
            }
            return false
        })
    }, [selectedTargetDay])

    // Função para analisar dados para replicação com validação rigorosa
    const analyzeReplicationData = useCallback(() => {
        if (!selectedSourceDay || !selectedTargetDay) return null

        const sourceEmpresas = (empresas || []).filter(e => e.shiftId === selectedSourceDay)
        const sourceCredentials = (credentials || []).filter((c: any) => c.shiftId === selectedSourceDay)
        const sourceParticipants = getParticipantsByShift(selectedSourceDay)

        const targetEmpresas = (empresas || []).filter(e => e.shiftId === selectedTargetDay)
        const targetCredentials = (credentials || []).filter((c: any) => c.shiftId === selectedTargetDay)
        const targetParticipants = getParticipantsByShift(selectedTargetDay)

        console.log('📊 Análise de replicação iniciada:', {
            source: {
                day: selectedSourceDay,
                empresas: sourceEmpresas?.length,
                credentials: sourceCredentials.length,
                participants: sourceParticipants.length
            },
            target: {
                day: selectedTargetDay,
                empresas: targetEmpresas?.length,
                credentials: targetCredentials.length,
                participants: targetParticipants.length
            }
        })

        // Verificar quais dados precisam ser replicados usando validação rigorosa
        const empresasToReplicate = sourceEmpresas?.filter(se =>
            !isDuplicateItem(se, targetEmpresas || [], 'empresa')
        )

        const credentialsToReplicate = sourceCredentials.filter((sc: any) =>
            !isDuplicateItem(sc, targetCredentials, 'credential')
        )

        const participantsToReplicate = sourceParticipants.filter(sp =>
            !isDuplicateItem(sp, targetParticipants, 'participant')
        )

        // Identificar itens que já existem (para feedback)
        const empresasExistentes = sourceEmpresas?.filter(se =>
            isDuplicateItem(se, targetEmpresas, 'empresa')
        )

        const credentialsExistentes = sourceCredentials.filter((sc: any) =>
            isDuplicateItem(sc, targetCredentials, 'credential')
        )

        const participantsExistentes = sourceParticipants.filter(sp =>
            isDuplicateItem(sp, targetParticipants, 'participant')
        )

        console.log('✅ Resultado da análise:', {
            toReplicate: {
                empresas: empresasToReplicate?.length,
                credentials: credentialsToReplicate.length,
                participants: participantsToReplicate.length
            },
            alreadyExists: {
                empresas: empresasExistentes?.length,
                credentials: credentialsExistentes.length,
                participants: participantsExistentes.length
            }
        })

        return {
            source: {
                shiftId: selectedSourceDay,
                empresas: sourceEmpresas,
                credentials: sourceCredentials,
                participants: sourceParticipants
            },
            target: {
                shiftId: selectedTargetDay,
                empresas: targetEmpresas,
                credentials: targetCredentials,
                participants: targetParticipants
            },
            toReplicate: {
                empresas: empresasToReplicate,
                credentials: credentialsToReplicate,
                participants: participantsToReplicate
            },
            alreadyExists: {
                empresas: empresasExistentes,
                credentials: credentialsExistentes,
                participants: participantsExistentes
            },
            estimatedTime: Math.ceil((empresasToReplicate.length + credentialsToReplicate.length + participantsToReplicate.length) / 100) * 60 // minutos
        }
    }, [selectedSourceDay, selectedTargetDay, empresas, credentials, getParticipantsByShift, isDuplicateItem])

    // Processar replicação completa sequencial
    const processFullReplication = useCallback(async (analysisData: any) => {
        if (!analysisData) return

        setIsReplicating(true)
        setShowProgressDialog(true)
        setReplicationProgress({
            currentStep: 'empresas',
            currentStepProgress: 0,
            totalProgress: 0,
            currentItem: '',
            empresasCount: { completed: 0, total: analysisData.toReplicate.empresas.length, errors: 0 },
            credenciaisCount: { completed: 0, total: analysisData.toReplicate.credentials.length, errors: 0 },
            participantesCount: { completed: 0, total: analysisData.toReplicate.participants.length, errors: 0 },
            startTime: new Date()
        })

        try {
            const targetShiftInfo = parseShiftId(selectedTargetDay)
            const normalizeStage = (s: any): 'montagem' | 'evento' | 'desmontagem' =>
                s === 'montagem' || s === 'evento' || s === 'desmontagem' ? s : 'evento'
            const normalizePeriod = (p: any): 'diurno' | 'noturno' | 'dia_inteiro' =>
                p === 'diurno' || p === 'noturno' || p === 'dia_inteiro' ? p : 'dia_inteiro'
            const stageForRequests = normalizeStage(targetShiftInfo.stage)

            // Mapa de credenciais (chave -> id no turno de destino)
            // Chave: nome/type da credencial
            const credentialKeyToTargetId = new Map<string, string>()

            // Preencher mapa com credenciais já existentes no turno de destino
            if (Array.isArray(analysisData.target.credentials)) {
                for (const c of analysisData.target.credentials) {
                    const key = c.nome ?? c.type
                    if (key && c.id) {
                        credentialKeyToTargetId.set(String(key), String(c.id))
                    }
                }
            }

            // FASE 1: Replicar Empresas
            if (analysisData.toReplicate.empresas.length > 0) {
                const reportStep = { step: 'empresas' as const, ok: [] as string[], skipped: [] as string[], errors: [] as string[] }
                const phasePromises: Promise<void>[] = []
                for (const empresa of analysisData.toReplicate.empresas) {
                    const operation = async () => {
                        try {
                            const empresaData = {
                                nome: empresa.nome,
                                id_evento: empresa.id_evento,
                                email: empresa.email,
                                telefone: empresa.telefone,
                                endereco: empresa.endereco,
                                cidade: empresa.cidade,
                                estado: empresa.estado,
                                cep: empresa.cep,
                                responsavel: empresa.responsavel,
                                observacoes: empresa.observacoes,
                                days: [selectedTargetDay],
                                shiftId: selectedTargetDay,
                                workDate: targetShiftInfo.dateISO,
                                workStage: stageForRequests,
                                workPeriod: normalizePeriod(targetShiftInfo.period)
                            }

                            await createEmpresaMutation.mutateAsync(empresaData)
                            reportStep.ok.push(`Empresa OK: ${empresa.nome}`)

                            setReplicationProgress(prev => {
                                const newCompletedEmpresas = prev.empresasCount.completed + 1
                                const totalItems = prev.empresasCount.total + prev.credenciaisCount.total + prev.participantesCount.total
                                const totalCompleted = newCompletedEmpresas + prev.credenciaisCount.completed + prev.participantesCount.completed

                                return {
                                    ...prev,
                                    empresasCount: {
                                        ...prev.empresasCount,
                                        completed: newCompletedEmpresas
                                    },
                                    currentItem: `Empresa: ${empresa.nome}`,
                                    currentStepProgress: Math.round((newCompletedEmpresas / prev.empresasCount.total) * 100),
                                    totalProgress: Math.round((totalCompleted / totalItems) * 100)
                                }
                            })
                        } catch (error) {
                            console.error('Erro ao replicar empresa:', error)
                            reportStep.errors.push(`Empresa ERRO: ${empresa.nome} | ${String((error as Error)?.message ?? error)}`)
                            setReplicationProgress(prev => ({
                                ...prev,
                                empresasCount: {
                                    ...prev.empresasCount,
                                    errors: prev.empresasCount.errors + 1
                                }
                            }))
                        }
                    }
                    phasePromises.push(addToQueue(operation))
                }

                // Aguardar conclusão do lote de empresas
                await Promise.allSettled(phasePromises)
                setReplicationReport(prev => {
                    const startedAt = prev?.startedAt ?? new Date().toISOString()
                    const steps = [...(prev?.steps ?? []), reportStep]
                    return { startedAt, steps }
                })
            }

            // FASE 2: Replicar Credenciais
            setReplicationProgress(prev => ({ ...prev, currentStep: 'credenciais', currentStepProgress: 0 }))

            if (analysisData.toReplicate.credentials.length > 0) {
                const reportStep = { step: 'credenciais' as const, ok: [] as string[], skipped: [] as string[], errors: [] as string[] }
                const phasePromises: Promise<void>[] = []
                for (const credential of analysisData.toReplicate.credentials) {
                    const operation = async () => {
                        try {
                            const credentialData = {
                                nome: credential.nome ?? credential.type ?? 'Credencial',
                                cor: credential.cor ?? '#000000',
                                id_events: String(params.id),
                                days_works: [selectedTargetDay],
                                shiftId: selectedTargetDay,
                                workDate: targetShiftInfo.dateISO,
                                workStage: stageForRequests,
                                workPeriod: normalizePeriod(targetShiftInfo.period),
                                isActive: true
                            }

                            const created = await createCredentialMutation.mutateAsync(credentialData)

                            // Salvar no mapa para uso na fase de participantes
                            const key = credential.nome ?? credential.type ?? created?.nome
                            if (key && created?.id) {
                                credentialKeyToTargetId.set(String(key), String(created.id))
                            }
                            reportStep.ok.push(`Credencial OK: ${key}`)

                            setReplicationProgress(prev => {
                                const newCompletedCredenciais = prev.credenciaisCount.completed + 1
                                const totalItems = prev.empresasCount.total + prev.credenciaisCount.total + prev.participantesCount.total
                                const totalCompleted = prev.empresasCount.completed + newCompletedCredenciais + prev.participantesCount.completed

                                return {
                                    ...prev,
                                    credenciaisCount: {
                                        ...prev.credenciaisCount,
                                        completed: newCompletedCredenciais
                                    },
                                    currentItem: `Credencial: ${credential.type}`,
                                    currentStepProgress: Math.round((newCompletedCredenciais / prev.credenciaisCount.total) * 100),
                                    totalProgress: Math.round((totalCompleted / totalItems) * 100)
                                }
                            })
                        } catch (error) {
                            console.error('Erro ao replicar credencial:', error)
                            const key = credential.nome ?? credential.type ?? 'Credencial'
                            reportStep.errors.push(`Credencial ERRO: ${key} | ${String((error as Error)?.message ?? error)}`)
                            setReplicationProgress(prev => ({
                                ...prev,
                                credenciaisCount: {
                                    ...prev.credenciaisCount,
                                    errors: prev.credenciaisCount.errors + 1
                                }
                            }))
                        }
                    }
                    phasePromises.push(addToQueue(operation))
                }

                // Aguardar conclusão do lote de credenciais
                await Promise.allSettled(phasePromises)
                setReplicationReport(prev => {
                    const startedAt = prev?.startedAt ?? new Date().toISOString()
                    const steps = [...(prev?.steps ?? []), reportStep]
                    return { startedAt, steps }
                })
            }

            // FASE 3: Replicar Participantes
            setReplicationProgress(prev => ({ ...prev, currentStep: 'participantes', currentStepProgress: 0 }))

            if (analysisData.toReplicate.participants.length > 0) {
                const reportStep = { step: 'participantes' as const, ok: [] as string[], skipped: [] as string[], errors: [] as string[] }
                const phasePromises: Promise<void>[] = []
                for (const participant of analysisData.toReplicate.participants) {
                    const operation = async () => {
                        try {
                            // Determinar a credencial do participante no turno de destino
                            let credentialKey: string | undefined
                            // 1) Se participante tem credentialId de origem, buscar nome na lista de credenciais de origem
                            if (participant.credentialId && Array.isArray(analysisData.source.credentials)) {
                                const sourceCred = analysisData.source.credentials.find((c: any) => c.id === participant.credentialId)
                                if (sourceCred) credentialKey = sourceCred.nome ?? sourceCred.type
                            }
                            // 2) Caso contrário, usar role como fallback (muito comum ser o nome da credencial)
                            if (!credentialKey && participant.role) {
                                credentialKey = participant.role
                            }

                            const mappedCredentialId = credentialKey ? credentialKeyToTargetId.get(String(credentialKey)) : undefined
                            const participantData = {
                                name: participant.name,
                                cpf: participant.cpf,
                                rg: participant.rg,
                                email: participant.email,
                                phone: participant.phone,
                                role: participant.role,
                                company: participant.company,
                                hasDocument: participant.hasDocument,
                                shirtSize: participant.shirtSize,
                                notes: "",
                                photo: participant.photo,
                                documentPhoto: participant.documentPhoto,
                                wristbandId: participant.wristbandId,
                                staffId: participant.staffId,
                                eventId: participant.eventId,
                                credentialId: mappedCredentialId,
                                daysWork: [selectedTargetDay],
                                shiftId: selectedTargetDay,
                                workDate: targetShiftInfo.dateISO,
                                workStage: stageForRequests,
                                workPeriod: normalizePeriod(targetShiftInfo.period)
                            }

                            await createParticipantMutation.mutateAsync(participantData)
                            reportStep.ok.push(`Participante OK: ${participant.name}${mappedCredentialId ? ` | credId=${mappedCredentialId}` : ''}`)

                            setReplicationProgress(prev => {
                                const newCompletedParticipantes = prev.participantesCount.completed + 1
                                const totalItems = prev.empresasCount.total + prev.credenciaisCount.total + prev.participantesCount.total
                                const totalCompleted = prev.empresasCount.completed + prev.credenciaisCount.completed + newCompletedParticipantes

                                return {
                                    ...prev,
                                    participantesCount: {
                                        ...prev.participantesCount,
                                        completed: newCompletedParticipantes
                                    },
                                    currentItem: `Participante: ${participant.name}`,
                                    currentStepProgress: Math.round((newCompletedParticipantes / prev.participantesCount.total) * 100),
                                    totalProgress: Math.round((totalCompleted / totalItems) * 100)
                                }
                            })
                        } catch (error) {
                            console.error('Erro ao replicar participante:', error)
                            reportStep.errors.push(`Participante ERRO: ${participant.name} | ${String((error as Error)?.message ?? error)}`)
                            setReplicationProgress(prev => ({
                                ...prev,
                                participantesCount: {
                                    ...prev.participantesCount,
                                    errors: prev.participantesCount.errors + 1
                                }
                            }))
                        }
                    }
                    phasePromises.push(addToQueue(operation))
                }

                // Aguardar conclusão do lote de participantes
                await Promise.allSettled(phasePromises)
                setReplicationReport(prev => {
                    const startedAt = prev?.startedAt ?? new Date().toISOString()
                    const steps = [...(prev?.steps ?? []), reportStep]
                    return { startedAt, steps }
                })
            }

            // Finalizar replicação
            const totalCompleted = replicationProgress.empresasCount.completed + replicationProgress.credenciaisCount.completed + replicationProgress.participantesCount.completed
            const totalErrors = replicationProgress.empresasCount.errors + replicationProgress.credenciaisCount.errors + replicationProgress.participantesCount.errors

            const finishedAt = new Date().toISOString()
            const summary = `Replicação concluída às ${finishedAt}. Total OK: ${totalCompleted}. Erros: ${totalErrors}.`
            setReplicationReport(prev => {
                const steps = prev?.steps ?? []
                return { startedAt: prev?.startedAt, finishedAt, steps, summary }
            })
            toast.success(summary)

            // Limpar estados
            setSelectedSourceDay('')
            setSelectedTargetDay('')
            setReplicationData(null)

        } catch (error) {
            console.error('Erro durante replicação:', error)
            toast.error('Erro durante a replicação')
        } finally {
            setIsReplicating(false)
            setShowProgressDialog(false)
        }
    }, [selectedTargetDay, parseShiftId, createEmpresaMutation, createCredentialMutation, createParticipantMutation, addToQueue, replicationProgress, params.id])

    // Função para analisar replicação
    const analyzeReplication = useCallback(() => {
        const analysis = analyzeReplicationData()

        if (analysis) {
            setReplicationData(analysis)
            setShowAnalysisDialog(true)
        } else {
            toast.error('Erro ao analisar dados para replicação')
        }
    }, [analyzeReplicationData])

    // Iniciar o processamento da fila quando há operações
    useEffect(() => {
        if (rateLimitQueue.length > 0 && !isProcessingQueue) {
            processRateLimitedQueue()
        }
    }, [rateLimitQueue, isProcessingQueue, processRateLimitedQueue])


    // Função para processar replicação
    const processReplication = useCallback(async () => {
        if (!replicationData) return

        setShowAnalysisDialog(false)
        setShowConfirmDialog(false)

        await processFullReplication(replicationData)
    }, [replicationData, processFullReplication])


    if (eventosLoading) {
        return (
            <EventLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </EventLayout>
        )
    }

    if (!evento) {
        return (
            <EventLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Evento não encontrado</h3>
                        <p className="text-muted-foreground">O evento solicitado não foi encontrado.</p>
                    </div>
                </div>
            </EventLayout>
        )
    }

    return (
        <EventLayout eventId={evento.id} eventName={evento.name}>
            <div className="space-y-6 p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Replicação de Participantes</h1>
                            <p className="text-muted-foreground">
                                {evento.name} - Replique participantes entre turnos
                            </p>
                        </div>
                    </div>
                    <Copy className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Seleção de Turnos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Configuração da Replicação
                        </CardTitle>
                        <CardDescription>
                            Selecione o turno de origem e o turno de destino para replicar os participantes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Turno de Origem */}
                            <EventDaySelector
                                eventDays={eventDays}
                                selectedDay={selectedSourceDay}
                                onSelectDay={setSelectedSourceDay}
                                label="Turno de Origem"
                                placeholder="Selecionar turno de origem"
                                participantCount={getParticipantsByShift(selectedSourceDay).length}
                                showParticipantCount={true}
                                disabled={isReplicating}
                            />

                            {/* Turno de Destino - Restrito a 1 seleção */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Turno de Destino *
                                </label>
                                <Select value={selectedTargetDay} onValueChange={setSelectedTargetDay} disabled={isReplicating}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecionar 1 turno de destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eventDays
                                            .filter(day => day.id !== selectedSourceDay)
                                            .map(day => {
                                                const participantCount = getParticipantsByShift(day.id).length
                                                const empresaCount = empresas?.filter(e => e.shiftId === day.id).length
                                                const credentialCount = (credentials || []).filter((c: any) => c.shiftId === day.id).length

                                                return (
                                                    <SelectItem key={day.id} value={day.id}>
                                                        <div className="flex items-center justify-between w-full">
                                                            <span>{day.label}</span>
                                                            <div className="flex gap-1 text-xs text-gray-500">
                                                                <span>{empresaCount}E</span>
                                                                <span>{credentialCount}C</span>
                                                                <span>{participantCount}P</span>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                    </SelectContent>
                                </Select>
                                {selectedTargetDay && (
                                    <div className="text-xs text-gray-500">
                                        E=Empresas, C=Credenciais, P=Participantes existentes
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preview dos dados a serem replicados */}
                        {selectedSourceDay && selectedTargetDay && (
                            <Card className="border-amber-200 bg-amber-50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-amber-800">
                                        <Database className="h-5 w-5" />
                                        Preview da Replicação Sequencial
                                    </CardTitle>
                                    <CardDescription className="text-amber-700">
                                        Ordem: Empresas → Credenciais → Participantes (100 operações/minuto)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {(() => {
                                        const analysis = analyzeReplicationData()
                                        if (!analysis) return null

                                        return (
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="text-center">
                                                    <div className="flex items-center justify-center gap-2 mb-2">
                                                        <Building2 className="h-5 w-5 text-blue-600" />
                                                        <span className="font-medium text-blue-800">Empresas</span>
                                                    </div>
                                                    <div className="text-2xl font-bold text-blue-900">
                                                        {analysis.toReplicate.empresas.length}
                                                    </div>
                                                    <div className="text-xs text-blue-700">
                                                        para replicar
                                                    </div>
                                                </div>

                                                <div className="text-center">
                                                    <div className="flex items-center justify-center gap-2 mb-2">
                                                        <CreditCard className="h-5 w-5 text-green-600" />
                                                        <span className="font-medium text-green-800">Credenciais</span>
                                                    </div>
                                                    <div className="text-2xl font-bold text-green-900">
                                                        {analysis.toReplicate.credentials.length}
                                                    </div>
                                                    <div className="text-xs text-green-700">
                                                        para replicar
                                                    </div>
                                                </div>

                                                <div className="text-center">
                                                    <div className="flex items-center justify-center gap-2 mb-2">
                                                        <UserCheck className="h-5 w-5 text-purple-600" />
                                                        <span className="font-medium text-purple-800">Participantes</span>
                                                    </div>
                                                    <div className="text-2xl font-bold text-purple-900">
                                                        {analysis.toReplicate.participants.length}
                                                    </div>
                                                    <div className="text-xs text-purple-700">
                                                        para replicar
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                                        <div className="flex items-center gap-2 text-amber-800">
                                            <Clock className="h-4 w-4" />
                                            <span className="text-sm font-medium">
                                                Tempo estimado: {(() => {
                                                    const analysis = analyzeReplicationData()
                                                    return analysis ? `${analysis.estimatedTime} minutos` : '0 minutos'
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Botão de Análise */}
                        <div className="flex justify-center">
                            <Button
                                onClick={analyzeReplication}
                                disabled={!selectedSourceDay || !selectedTargetDay || isReplicating}
                                className="flex items-center gap-2"
                                size="lg"
                            >
                                {isReplicating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                                Analisar Replicação Completa
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Informações dos Turnos Selecionados */}
                {(selectedSourceDay || selectedTargetDay) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedSourceDay && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                                        <ArrowRight className="h-4 w-4" />
                                        Turno de Origem
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="font-medium">
                                            {eventDays.find(d => d.id === selectedSourceDay)?.label}
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {empresas?.filter(e => e.shiftId === selectedSourceDay).length}
                                                </div>
                                                <div className="text-xs text-gray-500">Empresas</div>
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold text-green-600">
                                                    {(credentials || []).filter((c: any) => c.shiftId === selectedSourceDay).length}
                                                </div>
                                                <div className="text-xs text-gray-500">Credenciais</div>
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold text-purple-600">
                                                    {getParticipantsByShift(selectedSourceDay).length}
                                                </div>
                                                <div className="text-xs text-gray-500">Participantes</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {selectedTargetDay && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Check className="h-4 w-4" />
                                        Turno de Destino
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="font-medium">
                                            {eventDays.find(d => d.id === selectedTargetDay)?.label}
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {empresas?.filter(e => e.shiftId === selectedTargetDay).length}
                                                </div>
                                                <div className="text-xs text-gray-500">Empresas</div>
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold text-green-600">
                                                    {(credentials || []).filter((c: any) => c.shiftId === selectedTargetDay).length}
                                                </div>
                                                <div className="text-xs text-gray-500">Credenciais</div>
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold text-purple-600">
                                                    {getParticipantsByShift(selectedTargetDay).length}
                                                </div>
                                                <div className="text-xs text-gray-500">Participantes</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Dialog de Análise */}
                <Dialog open={showAnalysisDialog && replicationData !== null} onOpenChange={setShowAnalysisDialog}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Copy className="h-5 w-5" />
                                Análise da Replicação
                            </DialogTitle>
                            <DialogDescription>
                                Revise os detalhes da replicação antes de prosseguir
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Resumo da Replicação Sequencial */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                                    <Database className="h-5 w-5" />
                                    Replicação Sequencial Completa
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Fase 1: Empresas */}
                                    <div className="bg-white p-4 rounded-lg border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">FASE 1</span>
                                            <Building2 className="h-4 w-4 text-blue-600" />
                                            <span className="font-medium text-blue-800">Empresas</span>
                                        </div>
                                        <div className="text-2xl font-bold text-blue-900">
                                            {replicationData?.toReplicate?.empresas?.length || 0}
                                        </div>
                                        <div className="text-sm text-blue-700">para replicar primeiro</div>
                                    </div>

                                    {/* Fase 2: Credenciais */}
                                    <div className="bg-white p-4 rounded-lg border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">FASE 2</span>
                                            <CreditCard className="h-4 w-4 text-green-600" />
                                            <span className="font-medium text-green-800">Credenciais</span>
                                        </div>
                                        <div className="text-2xl font-bold text-green-900">
                                            {replicationData?.toReplicate?.credentials?.length || 0}
                                        </div>
                                        <div className="text-sm text-green-700">após empresas</div>
                                    </div>

                                    {/* Fase 3: Participantes */}
                                    <div className="bg-white p-4 rounded-lg border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">FASE 3</span>
                                            <UserCheck className="h-4 w-4 text-purple-600" />
                                            <span className="font-medium text-purple-800">Participantes</span>
                                        </div>
                                        <div className="text-2xl font-bold text-purple-900">
                                            {replicationData?.toReplicate?.participants?.length || 0}
                                        </div>
                                        <div className="text-sm text-purple-700">por último</div>
                                    </div>
                                </div>
                            </div>

                            {/* Rate Limiting Info */}
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                    <span className="font-medium text-amber-800">Controle de Taxa</span>
                                </div>
                                <div className="text-sm text-amber-700 space-y-1">
                                    <p>• Máximo 100 operações por minuto</p>
                                    <p>• Tempo estimado: {replicationData?.estimatedTime || 0} minutos</p>
                                    <p>• Processo automático com fila inteligente</p>
                                </div>
                            </div>

                            {/* Listas de itens - Para Replicar */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5" />
                                        Itens para Replicar
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Empresas */}
                                        {replicationData?.toReplicate?.empresas?.length > 0 && (
                                            <div>
                                                <h4 className="font-medium mb-2 text-blue-800">Empresas ({replicationData.toReplicate.empresas.length}):</h4>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {replicationData.toReplicate.empresas.slice(0, 5).map((empresa: any, index: number) => (
                                                        <Badge key={index} variant="secondary" className="text-xs block w-full bg-green-50 text-green-800 border-green-200">
                                                            ✅ {empresa.nome}
                                                        </Badge>
                                                    ))}
                                                    {replicationData.toReplicate.empresas.length > 5 && (
                                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-800 border-green-200">
                                                            +{replicationData.toReplicate.empresas.length - 5} mais
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Credenciais */}
                                        {replicationData?.toReplicate?.credentials?.length > 0 && (
                                            <div>
                                                <h4 className="font-medium mb-2 text-green-800">Credenciais ({replicationData.toReplicate.credentials.length}):</h4>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {replicationData.toReplicate.credentials.slice(0, 5).map((credential: any, index: number) => (
                                                        <Badge key={index} variant="secondary" className="text-xs block w-full bg-green-50 text-green-800 border-green-200">
                                                            ✅ {credential.nome || credential.type || 'Credencial'}
                                                        </Badge>
                                                    ))}
                                                    {replicationData.toReplicate.credentials.length > 5 && (
                                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-800 border-green-200">
                                                            +{replicationData.toReplicate.credentials.length - 5} mais
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Participantes */}
                                        {replicationData?.toReplicate?.participants?.length > 0 && (
                                            <div>
                                                <h4 className="font-medium mb-2 text-purple-800">Participantes ({replicationData.toReplicate.participants.length}):</h4>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {replicationData.toReplicate.participants.slice(0, 5).map((participant: any, index: number) => (
                                                        <Badge key={index} variant="secondary" className="text-xs block w-full bg-green-50 text-green-800 border-green-200">
                                                            ✅ {participant.name}
                                                        </Badge>
                                                    ))}
                                                    {replicationData.toReplicate.participants.length > 5 && (
                                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-800 border-green-200">
                                                            +{replicationData.toReplicate.participants.length - 5} mais
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Listas de itens - Já Existem */}
                                {((replicationData?.alreadyExists?.empresas?.length || 0) > 0 ||
                                    (replicationData?.alreadyExists?.credentials?.length || 0) > 0 ||
                                    (replicationData?.alreadyExists?.participants?.length || 0) > 0) && (
                                        <div>
                                            <h3 className="font-semibold text-orange-800 mb-4 flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5" />
                                                Itens que Já Existem (não serão replicados)
                                            </h3>
                                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                                <div className="text-sm text-orange-700 mb-3">
                                                    Os itens abaixo já possuem dados idênticos (mesmo período, estágio e data) no turno de destino:
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {/* Empresas Existentes */}
                                                    {replicationData?.alreadyExists?.empresas?.length > 0 && (
                                                        <div>
                                                            <h4 className="font-medium mb-2 text-orange-800">Empresas ({replicationData.alreadyExists.empresas.length}):</h4>
                                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                                {replicationData.alreadyExists.empresas.slice(0, 5).map((empresa: any, index: number) => (
                                                                    <Badge key={index} variant="secondary" className="text-xs block w-full bg-orange-50 text-orange-800 border-orange-200">
                                                                        ⚠️ {empresa.nome}
                                                                    </Badge>
                                                                ))}
                                                                {replicationData.alreadyExists.empresas.length > 5 && (
                                                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-800 border-orange-200">
                                                                        +{replicationData.alreadyExists.empresas.length - 5} mais
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Credenciais Existentes */}
                                                    {replicationData?.alreadyExists?.credentials?.length > 0 && (
                                                        <div>
                                                            <h4 className="font-medium mb-2 text-orange-800">Credenciais ({replicationData.alreadyExists.credentials.length}):</h4>
                                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                                {replicationData.alreadyExists.credentials.slice(0, 5).map((credential: any, index: number) => (
                                                                    <Badge key={index} variant="secondary" className="text-xs block w-full bg-orange-50 text-orange-800 border-orange-200">
                                                                        ⚠️ {credential.nome || credential.type || 'Credencial'}
                                                                    </Badge>
                                                                ))}
                                                                {replicationData.alreadyExists.credentials.length > 5 && (
                                                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-800 border-orange-200">
                                                                        +{replicationData.alreadyExists.credentials.length - 5} mais
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Participantes Existentes */}
                                                    {replicationData?.alreadyExists?.participants?.length > 0 && (
                                                        <div>
                                                            <h4 className="font-medium mb-2 text-orange-800">Participantes ({replicationData.alreadyExists.participants.length}):</h4>
                                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                                {replicationData.alreadyExists.participants.slice(0, 5).map((participant: any, index: number) => (
                                                                    <Badge key={index} variant="secondary" className="text-xs block w-full bg-orange-50 text-orange-800 border-orange-200">
                                                                        ⚠️ {participant.name}
                                                                    </Badge>
                                                                ))}
                                                                {replicationData.alreadyExists.participants.length > 5 && (
                                                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-800 border-orange-200">
                                                                        +{replicationData.alreadyExists.participants.length - 5} mais
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                            </div>

                            {/* Aviso de nenhum item */}
                            {(replicationData?.toReplicate?.empresas?.length || 0) === 0 &&
                                (replicationData?.toReplicate?.credentials?.length || 0) === 0 &&
                                (replicationData?.toReplicate?.participants?.length || 0) === 0 && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-medium text-yellow-800">Nenhum item para replicar</div>
                                                <div className="text-sm text-yellow-700">
                                                    Todos os dados do turno de origem já existem no turno de destino.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowAnalysisDialog(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowAnalysisDialog(false)
                                    setShowConfirmDialog(true)
                                }}
                                disabled={(
                                    (replicationData?.toReplicate?.empresas?.length || 0) === 0 &&
                                    (replicationData?.toReplicate?.credentials?.length || 0) === 0 &&
                                    (replicationData?.toReplicate?.participants?.length || 0) === 0
                                )}
                                className="flex items-center gap-2"
                            >
                                <Play className="h-4 w-4" />
                                Iniciar Replicação Sequencial
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog de Confirmação */}
                <AlertDialog open={showConfirmDialog && replicationData !== null} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent className='bg-white'>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Replicação Sequencial Completa</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação irá replicar TODOS os dados na seguinte ordem:
                                <br /><br />
                                <strong>1ª FASE - Empresas:</strong> {replicationData?.toReplicate?.empresas?.length || 0} empresa(s)
                                <br />
                                <strong>2ª FASE - Credenciais:</strong> {replicationData?.toReplicate?.credentials?.length || 0} credencial(is)
                                <br />
                                <strong>3ª FASE - Participantes:</strong> {replicationData?.toReplicate?.participants?.length || 0} participante(s)
                                <br /><br />
                                <strong>Rate Limiting:</strong> Máximo 100 operações por minuto
                                <br />
                                <strong>Tempo estimado:</strong> {replicationData?.estimatedTime || 0} minutos
                                <br /><br />
                                Esta ação não pode ser desfeita. Deseja continuar?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={processReplication}>
                                Confirmar Replicação Sequencial
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Dialog de Progresso Avançado */}
                <Dialog open={showProgressDialog} onOpenChange={() => { }}>
                    <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Replicação Sequencial em Andamento
                            </DialogTitle>
                            <DialogDescription>
                                Processando replicação completa com controle de rate limiting (100 ops/min)
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Progresso Geral */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Progresso Total</span>
                                    <span className="text-sm text-muted-foreground">
                                        {Math.round(replicationProgress.totalProgress)}%
                                    </span>
                                </div>
                                <Progress value={replicationProgress.totalProgress} className="h-2" />
                            </div>

                            {/* Fase Atual */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    {replicationProgress.currentStep === 'empresas' && <Building2 className="h-4 w-4 text-blue-600" />}
                                    {replicationProgress.currentStep === 'credenciais' && <CreditCard className="h-4 w-4 text-green-600" />}
                                    {replicationProgress.currentStep === 'participantes' && <UserCheck className="h-4 w-4 text-purple-600" />}
                                    <span className="font-medium capitalize">
                                        Fase {replicationProgress.currentStep === 'empresas' ? '1' : replicationProgress.currentStep === 'credenciais' ? '2' : '3'}: {replicationProgress.currentStep}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Progresso da Fase</span>
                                        <span>{replicationProgress.currentStepProgress}%</span>
                                    </div>
                                    <Progress value={replicationProgress.currentStepProgress} className="h-1" />
                                </div>
                                {replicationProgress.currentItem && (
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Processando: {replicationProgress.currentItem}
                                    </div>
                                )}
                            </div>

                            {/* Detalhes por Fase */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Empresas */}
                                <div className={`p-3 rounded-lg border ${replicationProgress.currentStep === 'empresas' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 className={`h-4 w-4 ${replicationProgress.currentStep === 'empresas' ? 'text-blue-600' : 'text-gray-400'
                                            }`} />
                                        <span className="text-sm font-medium">Empresas</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-xs">
                                            <span className="text-green-600">{replicationProgress.empresasCount.completed}</span>
                                            <span className="text-gray-500"> / {replicationProgress.empresasCount.total}</span>
                                            {replicationProgress.empresasCount.errors > 0 && (
                                                <span className="text-red-600"> ({replicationProgress.empresasCount.errors} erros)</span>
                                            )}
                                        </div>
                                        {replicationProgress.empresasCount.total > 0 && (
                                            <Progress
                                                value={(replicationProgress.empresasCount.completed / replicationProgress.empresasCount.total) * 100}
                                                className="h-1"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Credenciais */}
                                <div className={`p-3 rounded-lg border ${replicationProgress.currentStep === 'credenciais' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard className={`h-4 w-4 ${replicationProgress.currentStep === 'credenciais' ? 'text-green-600' : 'text-gray-400'
                                            }`} />
                                        <span className="text-sm font-medium">Credenciais</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-xs">
                                            <span className="text-green-600">{replicationProgress.credenciaisCount.completed}</span>
                                            <span className="text-gray-500"> / {replicationProgress.credenciaisCount.total}</span>
                                            {replicationProgress.credenciaisCount.errors > 0 && (
                                                <span className="text-red-600"> ({replicationProgress.credenciaisCount.errors} erros)</span>
                                            )}
                                        </div>
                                        {replicationProgress.credenciaisCount.total > 0 && (
                                            <Progress
                                                value={(replicationProgress.credenciaisCount.completed / replicationProgress.credenciaisCount.total) * 100}
                                                className="h-1"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Participantes */}
                                <div className={`p-3 rounded-lg border ${replicationProgress.currentStep === 'participantes' ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserCheck className={`h-4 w-4 ${replicationProgress.currentStep === 'participantes' ? 'text-purple-600' : 'text-gray-400'
                                            }`} />
                                        <span className="text-sm font-medium">Participantes</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-xs">
                                            <span className="text-green-600">{replicationProgress.participantesCount.completed}</span>
                                            <span className="text-gray-500"> / {replicationProgress.participantesCount.total}</span>
                                            {replicationProgress.participantesCount.errors > 0 && (
                                                <span className="text-red-600"> ({replicationProgress.participantesCount.errors} erros)</span>
                                            )}
                                        </div>
                                        {replicationProgress.participantesCount.total > 0 && (
                                            <Progress
                                                value={(replicationProgress.participantesCount.completed / replicationProgress.participantesCount.total) * 100}
                                                className="h-1"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Informações de Tempo e Rate Limiting */}
                            <div className="space-y-3">
                                {/* Tempo */}
                                {replicationProgress.startTime && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Tempo decorrido:</span>
                                        <span>
                                            {Math.floor((Date.now() - replicationProgress.startTime.getTime()) / 60000)} min
                                        </span>
                                    </div>
                                )}

                                {/* Rate Limiting */}
                                {isProcessingQueue && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-amber-600" />
                                            <span className="text-sm text-amber-800">
                                                Processando lote (máx. 100 ops/min)
                                            </span>
                                        </div>
                                        {rateLimitQueue.length > 0 && (
                                            <div className="text-xs text-amber-700 mt-1">
                                                {rateLimitQueue.length} operações na fila
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-muted-foreground text-center">
                                ⚠️ Não feche esta janela até que a operação seja concluída.
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Relatório final e download */}
                {replicationReport?.finishedAt && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Relatório da Replicação
                            </CardTitle>
                            <CardDescription>
                                {replicationReport.summary}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-3">
                            <Button
                                onClick={() => {
                                    const lines: string[] = []
                                    lines.push(`Replicação - Relatório`)
                                    lines.push(`Início: ${replicationReport.startedAt}`)
                                    lines.push(`Fim: ${replicationReport.finishedAt}`)
                                    lines.push(replicationReport.summary || '')
                                    lines.push('')
                                    for (const step of replicationReport.steps) {
                                        lines.push(`== ${step.step.toUpperCase()} ==`)
                                        if (step.ok.length) {
                                            lines.push(`OK (${step.ok.length}):`)
                                            lines.push(...step.ok)
                                        }
                                        if (step.errors.length) {
                                            lines.push(`ERROS (${step.errors.length}):`)
                                            lines.push(...step.errors)
                                        }
                                        if (step.skipped.length) {
                                            lines.push(`IGNORADOS (${step.skipped.length}):`)
                                            lines.push(...step.skipped)
                                        }
                                        lines.push('')
                                    }
                                    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `relatorio-replicacao-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
                                    document.body.appendChild(a)
                                    a.click()
                                    a.remove()
                                    URL.revokeObjectURL(url)
                                }}
                            >
                                Baixar relatório (.txt)
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </EventLayout>
    )
}