import { useCallback } from "react"
import type { EventParticipant } from "@/features/eventos/types"
import type { 
    RelatorioConfig, 
    RelatorioDataItem, 
    RelatorioParticipanteCompleto,
    RelatorioParticipanteCheckin,
    RelatorioParticipanteCheckout,
    RelatorioParticipanteTempo,
    RelatorioParticipanteCredencial,
    RelatorioParticipanteCadastro,
    RelatorioHeaderEmpresa,
    RelatorioParticipanteBase
} from "../types"

export function useReportData(
    configRelatorio: RelatorioConfig,
    participantesDoDia: EventParticipant[],
    calcularTempoTotal: (checkIn: string, checkOut: string) => string,
    obterCodigoPulseira: (participantId?: string) => string,
    obterTipoPulseira: (credentialId?: string) => string
) {
    const gerarDadosRelatorio = useCallback((): RelatorioDataItem[] => {
        let participantesProcessados: Omit<RelatorioDataItem, 'isHeader'>[] = []

        switch (configRelatorio.tipo) {
            case "geral":
                participantesProcessados = participantesDoDia
                    .map(p => ({
                        nome: p.name?.toUpperCase() || "",
                        cpf: p.cpf || "",
                        empresa: p.company?.toUpperCase() || "",
                        funcao: p.role?.toUpperCase() || "",
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn || "-",
                        checkOut: p.checkOut || "-"
                    } as RelatorioParticipanteCompleto))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "filtroEmpresa":
                participantesProcessados = participantesDoDia
                    .map(p => ({
                        nome: p.name?.toUpperCase() || "",
                        cpf: p.cpf || "",
                        empresa: p.company?.toUpperCase() || "",
                        funcao: p.role?.toUpperCase() || "",
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn || "-",
                        checkOut: p.checkOut || "-"
                    } as RelatorioParticipanteCompleto))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "checkin":
                participantesProcessados = participantesDoDia
                    .filter(p => p.checkIn)
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn!
                    } as RelatorioParticipanteCheckin))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "checkout":
                participantesProcessados = participantesDoDia
                    .filter(p => p.checkIn && p.checkOut)
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn!,
                        checkOut: p.checkOut!
                    } as RelatorioParticipanteCheckout))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "tempo":
                participantesProcessados = participantesDoDia
                    .filter(p => p.checkIn && p.checkOut)
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        pulseira: obterCodigoPulseira(p.id),
                        tipoPulseira: obterTipoPulseira(p.credentialId),
                        checkIn: p.checkIn!,
                        checkOut: p.checkOut!,
                        tempoTotal: calcularTempoTotal(p.checkIn!, p.checkOut!)
                    } as RelatorioParticipanteTempo))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "tipoCredencial":
                participantesProcessados = participantesDoDia
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        tipoCredencial: p.credentialId || "Não informado"
                    } as RelatorioParticipanteCredencial))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "cadastradoPor":
                participantesProcessados = participantesDoDia
                    .map(p => ({
                        nome: p.name,
                        cpf: p.cpf,
                        empresa: p.company,
                        funcao: p.role,
                        cadastradoPor: p.validatedBy || "Não informado"
                    } as RelatorioParticipanteCadastro))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break
        }

        // Aplicar filtros
        if (configRelatorio.filtroEmpresa && configRelatorio.filtroEmpresa !== "all_companies") {
            participantesProcessados = participantesProcessados.filter(d =>
                'empresa' in d && d.empresa === configRelatorio.filtroEmpresa
            )
        }

        if (configRelatorio.filtroFuncao && configRelatorio.filtroFuncao !== "all_functions") {
            participantesProcessados = participantesProcessados.filter(d =>
                'funcao' in d && d.funcao === configRelatorio.filtroFuncao
            )
        }

        if (configRelatorio.filtroTipoCredencial && configRelatorio.filtroTipoCredencial !== "all_credentials") {
            participantesProcessados = participantesProcessados.filter(d =>
                'tipoCredencial' in d && d.tipoCredencial === configRelatorio.filtroTipoCredencial
            )
        }

        // Agrupar por empresa com cabeçalhos
        const empresas = Array.from(new Set(
            participantesProcessados
                .filter((p): p is RelatorioParticipanteBase => 'empresa' in p)
                .map(p => p.empresa)
        )).sort()
        
        const dadosFinais: RelatorioDataItem[] = []

        empresas.forEach(nomeEmpresa => {
            const participantesDaEmpresa = participantesProcessados.filter(p =>
                'empresa' in p && p.empresa === nomeEmpresa
            )
            const totalParticipantes = participantesDaEmpresa.length
            const participantesComCheckIn = participantesDaEmpresa.filter(p =>
                'checkIn' in p && p.checkIn
            ).length

            // Adicionar cabeçalho da empresa
            dadosFinais.push({
                isHeader: true,
                nomeEmpresa,
                totalParticipantes,
                participantesComCheckIn,
                headerText: `${nomeEmpresa} (${participantesComCheckIn}/${totalParticipantes})`
            } as RelatorioHeaderEmpresa)

            // Adicionar participantes da empresa
            participantesDaEmpresa.forEach(participante => {
                dadosFinais.push(participante as RelatorioDataItem)
            })
        })

        return dadosFinais
    }, [configRelatorio, participantesDoDia, calcularTempoTotal, obterCodigoPulseira, obterTipoPulseira])

    return { gerarDadosRelatorio }
}