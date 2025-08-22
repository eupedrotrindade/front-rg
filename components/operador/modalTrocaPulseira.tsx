"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, RefreshCw, History, Check, Clock, AlertCircle } from "lucide-react"
import type { EventParticipant } from "@/features/eventos/types"
import type { MovementCredential } from "@/app/utils/interfaces/movement-credentials"
import { changeCredentialCode, getMovementCredentialByParticipant } from "@/features/eventos/actions/movement-credentials"
import { getEventAttendance } from "@/features/eventos/actions/event-attendance"

interface ModalTrocaPulseiraProps {
    isOpen: boolean
    onClose: () => void
    participant: EventParticipant | null
    eventId: string
    onSuccess?: () => void
}

export default function ModalTrocaPulseira({
    isOpen,
    onClose,
    participant,
    eventId,
    onSuccess
}: ModalTrocaPulseiraProps) {
    const [newCode, setNewCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [currentMovement, setCurrentMovement] = useState<MovementCredential | null>(null)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [checkInStatus, setCheckInStatus] = useState<{ hasCheckIn: boolean; checkInDate?: string }>({ hasCheckIn: false })
    const [loadingCheckIn, setLoadingCheckIn] = useState(false)

    // Verificar status de check-in do participante
    const checkParticipantCheckIn = useCallback(async () => {
        if (!participant) return

        setLoadingCheckIn(true)
        try {
            const today = new Date()
            const day = String(today.getDate()).padStart(2, '0')
            const month = String(today.getMonth() + 1).padStart(2, '0')
            const year = today.getFullYear()
            const todayFormatted = `${day}-${month}-${year}`

            const attendance = await getEventAttendance({
                eventId,
                date: todayFormatted
            })

            const participantAttendance = attendance.data?.find(
                (att) => att.participantId === participant.id
            )

            setCheckInStatus({
                hasCheckIn: !!participantAttendance?.checkIn,
                checkInDate: participantAttendance?.checkIn || undefined
            })
        } catch (error) {
            console.error("Erro ao verificar check-in:", error)
            setCheckInStatus({ hasCheckIn: false })
        } finally {
            setLoadingCheckIn(false)
        }
    }, [participant, eventId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!participant || !newCode.trim()) {
            toast.error("Dados insuficientes para trocar pulseira")
            return
        }

        if (!checkInStatus.hasCheckIn) {
            toast.error("Participante precisa ter check-in para trocar pulseira")
            return
        }

        setLoading(true)
        try {
            await changeCredentialCode(eventId, participant.id, newCode.trim())
            toast.success("Pulseira trocada com sucesso!")
            setNewCode("")
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error("Erro ao trocar pulseira:", error)
            toast.error("Erro ao trocar pulseira")
        } finally {
            setLoading(false)
        }
    }

    const loadCurrentMovement = useCallback(async () => {
        if (!participant) return

        setLoadingHistory(true)
        try {
            const response = await getMovementCredentialByParticipant(eventId, participant.id)
            setCurrentMovement(response?.data || null)
        } catch (error) {
            console.error("Erro ao carregar histórico:", error)
        } finally {
            setLoadingHistory(false)
        }
    }, [participant, eventId])

    // Carregar dados quando o modal abrir
    useEffect(() => {
        if (isOpen && participant) {
            loadCurrentMovement()
            checkParticipantCheckIn()
        }
    }, [isOpen, participant, checkParticipantCheckIn, loadCurrentMovement])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white text-gray-900 max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Trocar Pulseira</DialogTitle>
                    <DialogDescription>
                        Troque o código da pulseira para {participant?.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Informações do participante */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">Participante</h4>
                        <div className="text-sm text-gray-600">
                            <p><strong>Nome:</strong> {participant?.name}</p>
                            <p><strong>CPF:</strong> {participant?.cpf}</p>
                            <p><strong>Função:</strong> {participant?.role}</p>
                            <p><strong>Empresa:</strong> {participant?.company}</p>
                        </div>
                    </div>

                    {/* Status de Check-in */}
                    <div className={`p-3 rounded-lg border ${checkInStatus.hasCheckIn
                        ? "bg-white border-green-200"
                        : "bg-white border-red-200"
                        }`}>
                        <div className="flex items-center gap-2">
                            {loadingCheckIn ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : checkInStatus.hasCheckIn ? (
                                <Check className="w-4 h-4 text-green-600" />
                            ) : (
                                <Clock className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm font-medium ${checkInStatus.hasCheckIn ? "text-green-800" : "text-red-800"
                                }`}>
                                {checkInStatus.hasCheckIn ? "Check-in realizado" : "Sem check-in"}
                            </span>
                        </div>
                        {checkInStatus.checkInDate && (
                            <p className="text-xs text-green-600 mt-1">
                                Data: {new Date(checkInStatus.checkInDate).toLocaleString('pt-BR')}
                            </p>
                        )}
                    </div>

                    {/* Código atual */}
                    {currentMovement && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Código Atual</h4>
                            <p className="text-gray-800 font-mono">{currentMovement.code}</p>
                        </div>
                    )}

                    {/* Histórico de códigos */}
                    {currentMovement?.history_code && currentMovement.history_code.length > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Histórico de Códigos
                            </h4>
                            <div className="space-y-1">
                                {currentMovement.history_code.map((code, index) => (
                                    <p key={index} className="text-gray-600 font-mono text-sm">
                                        {code}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Formulário de troca */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="newCode">Novo Código da Pulseira</Label>
                            <Input
                                id="newCode"
                                type="text"
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value)}
                                placeholder="Digite o novo código"
                                required
                                className="mt-1"
                                disabled={!checkInStatus.hasCheckIn}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={loading || !newCode.trim() || !checkInStatus.hasCheckIn}
                                className="flex-1"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Trocando...
                                    </>
                                ) : (
                                    "Trocar Pulseira"
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={loadCurrentMovement}
                                disabled={loadingHistory}
                            >
                                {loadingHistory ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </form>

                    {/* Aviso se não tem check-in */}
                    {!checkInStatus.hasCheckIn && !loadingCheckIn && (
                        <div className="bg-white p-3 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span className="text-sm text-red-800">
                                    Este participante precisa ter check-in para trocar a pulseira.
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
} 