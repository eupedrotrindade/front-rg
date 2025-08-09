export interface RelatorioConfig {
    titulo: string
    tipo: "geral" | "filtroEmpresa" | "checkin" | "checkout" | "tempo" | "tipoCredencial" | "cadastradoPor"
    filtroDia: string
    filtroEmpresa: string
    filtroFuncao: string
    filtroStatus: string
    filtroTipoCredencial: string
}

export interface RelatorioParticipanteBase {
    nome: string
    cpf: string
    empresa: string
    funcao: string | undefined
}

export interface RelatorioParticipanteCompleto extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
}

export interface RelatorioParticipanteCheckin extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
}

export interface RelatorioParticipanteCheckout extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
}

export interface RelatorioParticipanteTempo extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
    tempoTotal: string
}

export interface RelatorioParticipanteCredencial extends RelatorioParticipanteBase {
    tipoCredencial: string
}

export interface RelatorioParticipanteCadastro extends RelatorioParticipanteBase {
    cadastradoPor: string
}

export interface RelatorioHeaderEmpresa {
    isHeader: true
    nomeEmpresa: string
    totalParticipantes: number
    participantesComCheckIn: number
    headerText: string
}

export type RelatorioDataItem =
    | RelatorioParticipanteCompleto
    | RelatorioParticipanteCheckin
    | RelatorioParticipanteCheckout
    | RelatorioParticipanteTempo
    | RelatorioParticipanteCredencial
    | RelatorioParticipanteCadastro
    | RelatorioHeaderEmpresa

export interface EventDay {
    id: string
    label: string
    date: string
    type: string
}

export interface Estatisticas {
    totalParticipantes: number
    participantesComCheckIn: number
    participantesComCheckOut: number
    participantesAtivos: number
    participantesComPulseira: number
    participantesComAttendanceMatch: number
    sincronizationRate: string
    totalCoordenadores: number
    totalVagas: number
    vagasRetiradas: number
    vagasPendentes: number
}