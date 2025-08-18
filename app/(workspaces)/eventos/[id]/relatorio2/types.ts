// === RELATORIO 2 - TYPES ===
// Clean architecture with attendance-focused data

export interface ParticipantRecord {
    id: string
    nome: string
    cpf: string
    empresa: string
    funcao: string
    credentialId?: string
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
    tempoTotal: string
    status: 'present' | 'checked_out' | 'no_checkin'
    // Shift information for filtering
    shift_id?: string
    work_date?: string
    work_stage?: string
    work_period?: string
}

export interface CompanyStats {
    empresa: string
    totalParticipantes: number
    comCheckIn: number
    comCheckOut: number
    percentualPresenca: number
}

export interface ReportFilters {
    empresa: string
    status: string
    tempoMinimo: number
}

export interface ExportConfig {
    empresa: string
    incluirTempo: boolean
    agruparPorEmpresa: boolean
}

export interface ReportSummary {
    totalParticipantes: number
    totalComCheckIn: number
    totalComCheckOut: number
    totalAtivos: number
    empresas: CompanyStats[]
}