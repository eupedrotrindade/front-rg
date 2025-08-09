import { useMemo } from "react"
import type { EventParticipant } from "@/features/eventos/types"
import type { Estatisticas } from "../types"

export function useStatistics(
    participantesDoDia: EventParticipant[],
    coordenadores: any[],
    vagas: any[],
    attendanceRecords: any[]
): Estatisticas {
    return useMemo(() => {
        const totalParticipantes = participantesDoDia.length

        const participantesComCheckIn = participantesDoDia.filter(p =>
            p.checkIn && p.checkIn !== "" && p.checkIn !== "-"
        ).length

        const participantesComCheckOut = participantesDoDia.filter(p =>
            p.checkOut && p.checkOut !== "" && p.checkOut !== "-"
        ).length

        const participantesAtivos = participantesComCheckIn - participantesComCheckOut
        const participantesComPulseira = participantesDoDia.filter(p => p.credentialId).length

        const participantesComAttendanceMatch = participantesDoDia.filter(p =>
            attendanceRecords.some(r => r.participantId === p.id)
        ).length

        const sincronizationRate = totalParticipantes > 0 ?
            ((participantesComAttendanceMatch / totalParticipantes) * 100) : 0

        return {
            totalParticipantes,
            participantesComCheckIn,
            participantesComCheckOut,
            participantesAtivos,
            participantesComPulseira,
            participantesComAttendanceMatch,
            sincronizationRate: sincronizationRate.toFixed(1),
            totalCoordenadores: coordenadores.length,
            totalVagas: vagas.length,
            vagasRetiradas: vagas.filter(v => v.retirada === "retirada").length,
            vagasPendentes: vagas.filter(v => v.retirada === "pendente").length
        }
    }, [participantesDoDia, coordenadores, vagas, attendanceRecords])
}