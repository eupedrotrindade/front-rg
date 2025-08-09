import { useCallback, useMemo } from "react"
import type { EventParticipant } from "@/features/eventos/types"

export function useParticipantData(
    participantes: EventParticipant[],
    attendanceRecords: any[],
    movementCredentials: any[],
    credenciais: any[]
) {
    // Função para formatar data de ISO para YYYY/MM/DD HH:MM
    const formatarDataHora = useCallback((isoString: string): string => {
        try {
            if (!isoString) return "-"
            const data = new Date(isoString)
            
            if (isNaN(data.getTime())) return "-"
            
            const year = data.getFullYear()
            const month = String(data.getMonth() + 1).padStart(2, '0')
            const day = String(data.getDate()).padStart(2, '0')
            const hours = String(data.getHours()).padStart(2, '0')
            const minutes = String(data.getMinutes()).padStart(2, '0')
            
            return `${year}/${month}/${day} ${hours}:${minutes}`
        } catch (error) {
            console.error("Erro ao formatar data:", error)
            return "-"
        }
    }, [])

    // Função para calcular tempo total de trabalho
    const calcularTempoTotal = useCallback((checkIn: string, checkOut: string): string => {
        try {
            const entrada = new Date(checkIn)
            const saida = new Date(checkOut)
            const diff = saida.getTime() - entrada.getTime()

            if (diff <= 0) return "00:00"

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        } catch {
            return "00:00"
        }
    }, [])

    // Função para obter código da credencial/pulseira
    const obterCodigoPulseira = useCallback((participantId?: string): string => {
        if (!participantId) return ""
        const credencial = movementCredentials.find(c => c.participant_id === participantId)
        return credencial?.code || ""
    }, [movementCredentials])

    // Função para obter tipo da pulseira (nome da credencial)
    const obterTipoPulseira = useCallback((credentialId?: string): string => {
        if (!credentialId) return ""
        const credencial = credenciais.find(c => c.id === credentialId)
        return credencial?.nome || ""
    }, [credenciais])

    // Sistema de sincronização de attendance simplificado
    const sincronizarAttendance = useCallback((participante: EventParticipant) => {
        if (!participante || !participante.id) {
            return {
                ...participante,
                checkIn: participante?.checkIn || "",
                checkOut: participante?.checkOut || ""
            }
        }

        // Buscar registros de attendance para este participante
        const participantAttendance = attendanceRecords.filter(
            record => record && record.participantId === participante.id
        )

        if (participantAttendance.length === 0) {
            // Usar dados originais se não há attendance
            const originalCheckIn = participante.checkIn ?
                (participante.checkIn.includes('T') ? formatarDataHora(participante.checkIn) : participante.checkIn) : ""
            const originalCheckOut = participante.checkOut ?
                (participante.checkOut.includes('T') ? formatarDataHora(participante.checkOut) : participante.checkOut) : ""

            return {
                ...participante,
                checkIn: originalCheckIn,
                checkOut: originalCheckOut
            }
        }

        // Processar registros válidos
        const validAttendanceRecords = participantAttendance.filter(record =>
            record && (record.checkIn || record.checkOut)
        )

        // Buscar melhor check-in (mais recente e válido)
        const validCheckIns = validAttendanceRecords
            .filter(record => record.checkIn && record.checkIn !== null && record.checkIn !== "")
            .sort((a, b) => {
                try {
                    return new Date(b.checkIn!).getTime() - new Date(a.checkIn!).getTime()
                } catch {
                    return 0
                }
            })

        // Buscar melhor check-out (mais recente e válido)
        const validCheckOuts = validAttendanceRecords
            .filter(record => record.checkOut && record.checkOut !== null && record.checkOut !== "")
            .sort((a, b) => {
                try {
                    return new Date(b.checkOut!).getTime() - new Date(a.checkOut!).getTime()
                } catch {
                    return 0
                }
            })

        const latestCheckin = validCheckIns[0]
        const latestCheckout = validCheckOuts[0]

        // Processar dados finais
        let finalCheckIn = ""
        let finalCheckOut = ""

        if (latestCheckin?.checkIn) {
            try {
                finalCheckIn = formatarDataHora(latestCheckin.checkIn)
            } catch (error) {
                console.error(`Erro ao formatar checkIn para ${participante.name}:`, error)
                finalCheckIn = latestCheckin.checkIn
            }
        } else if (participante.checkIn && participante.checkIn !== "") {
            try {
                finalCheckIn = participante.checkIn.includes('T') ?
                    formatarDataHora(participante.checkIn) : participante.checkIn
            } catch (error) {
                finalCheckIn = participante.checkIn
            }
        }

        if (latestCheckout?.checkOut) {
            try {
                finalCheckOut = formatarDataHora(latestCheckout.checkOut)
            } catch (error) {
                console.error(`Erro ao formatar checkOut para ${participante.name}:`, error)
                finalCheckOut = latestCheckout.checkOut
            }
        } else if (participante.checkOut && participante.checkOut !== "") {
            try {
                finalCheckOut = participante.checkOut.includes('T') ?
                    formatarDataHora(participante.checkOut) : participante.checkOut
            } catch (error) {
                finalCheckOut = participante.checkOut
            }
        }

        return {
            ...participante,
            checkIn: finalCheckIn,
            checkOut: finalCheckOut
        }
    }, [attendanceRecords, formatarDataHora])

    // Sistema de filtragem por dia
    const getParticipantesPorDia = useCallback((dia: string): EventParticipant[] => {
        try {
            // Sincronizar todos os participantes primeiro
            const todosSincronizados = participantes.map(p => {
                try {
                    return sincronizarAttendance(p)
                } catch (error) {
                    console.error(`Erro na sincronização de ${p?.name || 'unknown'}:`, error)
                    return p
                }
            })

            // Aplicar filtro por dia
            if (dia === 'all') {
                return todosSincronizados
            }

            return todosSincronizados.filter((participant: EventParticipant) => {
                if (!participant || !participant.daysWork || participant.daysWork.length === 0) {
                    return false
                }
                return participant.daysWork.includes(dia)
            })

        } catch (error) {
            console.error(`Erro na filtragem por dia:`, error)
            return participantes.filter((participant: EventParticipant) => {
                if (dia === 'all') return true
                if (!participant.daysWork || participant.daysWork.length === 0) return false
                return participant.daysWork.includes(dia)
            })
        }
    }, [participantes, sincronizarAttendance])

    return {
        formatarDataHora,
        calcularTempoTotal,
        obterCodigoPulseira,
        obterTipoPulseira,
        sincronizarAttendance,
        getParticipantesPorDia
    }
}