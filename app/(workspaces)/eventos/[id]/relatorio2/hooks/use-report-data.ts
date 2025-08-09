import { useMemo, useCallback } from "react"
import type { EventParticipant } from "@/features/eventos/types"
import type { ParticipantRecord, ReportSummary, CompanyStats } from "../types"

interface UseReportDataProps {
    participantes: EventParticipant[]
    attendanceRecords: any[]
    movementCredentials: any[]
    credenciais: any[]
}

export function useReportData({
    participantes,
    attendanceRecords,
    movementCredentials,
    credenciais
}: UseReportDataProps) {
    
    // === SYNC ATTENDANCE DATA ===
    const syncedParticipants = useMemo(() => {
        if (!participantes.length) return []
        
        return participantes.map(participant => {
            // Find attendance records
            const attendance = attendanceRecords.filter(r => r.participantId === participant.id)
            
            // Get latest check-in/out
            const latestCheckIn = attendance
                .filter(r => r.checkIn)
                .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime())[0]
            
            const latestCheckOut = attendance
                .filter(r => r.checkOut)
                .sort((a, b) => new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime())[0]
            
            // Get credential info
            const movement = movementCredentials.find(m => m.participant_id === participant.id)
            const credential = credenciais.find(c => c.id === participant.credentialId)
            
            // Format dates
            const formatDate = (isoString: string | null) => {
                if (!isoString) return "-"
                try {
                    const date = new Date(isoString)
                    return date.toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                } catch {
                    return "-"
                }
            }
            
            const checkIn = formatDate(latestCheckIn?.checkIn || null)
            const checkOut = formatDate(latestCheckOut?.checkOut || null)
            
            // Calculate work time
            const calculateWorkTime = () => {
                if (!latestCheckIn?.checkIn || !latestCheckOut?.checkOut) return "00:00"
                try {
                    const start = new Date(latestCheckIn.checkIn)
                    const end = new Date(latestCheckOut.checkOut)
                    const diff = end.getTime() - start.getTime()
                    
                    if (diff <= 0) return "00:00"
                    
                    const hours = Math.floor(diff / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                } catch {
                    return "00:00"
                }
            }
            
            // Determine status
            const getStatus = (): ParticipantRecord['status'] => {
                if (!latestCheckIn) return 'no_checkin'
                if (latestCheckOut) return 'checked_out'
                return 'present'
            }
            
            return {
                id: participant.id,
                nome: participant.name || "",
                cpf: participant.cpf || "",
                empresa: participant.company || "",
                funcao: participant.role || "",
                credentialId: participant.credentialId,
                pulseira: movement?.code || "-",
                tipoPulseira: credential?.nome || "-",
                checkIn,
                checkOut,
                tempoTotal: calculateWorkTime(),
                status: getStatus()
            } as ParticipantRecord
        }).sort((a, b) => a.nome.localeCompare(b.nome))
    }, [participantes, attendanceRecords, movementCredentials, credenciais])
    
    // === COMPANY STATISTICS ===
    const companyStats = useMemo(() => {
        const companies = new Map<string, CompanyStats>()
        
        syncedParticipants.forEach(participant => {
            if (!participant.empresa) return
            
            if (!companies.has(participant.empresa)) {
                companies.set(participant.empresa, {
                    empresa: participant.empresa,
                    totalParticipantes: 0,
                    comCheckIn: 0,
                    comCheckOut: 0,
                    percentualPresenca: 0
                })
            }
            
            const stats = companies.get(participant.empresa)!
            stats.totalParticipantes++
            
            if (participant.checkIn !== "-") stats.comCheckIn++
            if (participant.checkOut !== "-") stats.comCheckOut++
        })
        
        // Calculate percentages
        Array.from(companies.values()).forEach(stats => {
            stats.percentualPresenca = stats.totalParticipantes > 0 
                ? Math.round((stats.comCheckIn / stats.totalParticipantes) * 100)
                : 0
        })
        
        return Array.from(companies.values()).sort((a, b) => a.empresa.localeCompare(b.empresa))
    }, [syncedParticipants])
    
    // === SUMMARY STATS ===
    const summary: ReportSummary = useMemo(() => ({
        totalParticipantes: syncedParticipants.length,
        totalComCheckIn: syncedParticipants.filter(p => p.checkIn !== "-").length,
        totalComCheckOut: syncedParticipants.filter(p => p.checkOut !== "-").length,
        totalAtivos: syncedParticipants.filter(p => p.status === 'present').length,
        empresas: companyStats
    }), [syncedParticipants, companyStats])
    
    // === FILTER DATA ===
    const filterData = useCallback((filters: { empresa?: string; status?: string }) => {
        let filtered = syncedParticipants
        
        if (filters.empresa && filters.empresa !== 'all') {
            filtered = filtered.filter(p => p.empresa === filters.empresa)
        }
        
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(p => p.status === filters.status)
        }
        
        return filtered
    }, [syncedParticipants])
    
    return {
        participants: syncedParticipants,
        summary,
        companyStats,
        filterData
    }
}