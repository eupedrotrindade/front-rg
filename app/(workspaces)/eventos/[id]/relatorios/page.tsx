'use client'

import React, { useState, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCoordenadoresByEvent } from "@/features/eventos/api/query/use-coordenadores-by-event"
import { useEventVehiclesByEvent } from "@/features/eventos/api/query/use-event-vehicles-by-event"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, UserCog, Building, Download, FileText, Filter } from "lucide-react"
import { toast } from "sonner"
import EventLayout from "@/components/dashboard/dashboard-layout"
import type { EventParticipant } from "@/features/eventos/types"
import { useExportPDF } from "@/features/eventos/api/mutation/use-export-pdf"
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event"
import { useAllEventAttendance } from "@/features/eventos/api/mutation/use-check-operations"
import { useMovementCredential } from "@/features/eventos/api/mutation/use-movement-credential"

interface RelatorioConfig {
    titulo: string
    tipo: "geral" | "filtroEmpresa" | "checkin" | "checkout" | "tempo" | "tipoCredencial" | "cadastradoPor"
    filtroDia: string
    filtroEmpresa: string
    filtroFuncao: string
    filtroStatus: string
    filtroTipoCredencial: string
}

// Interfaces para tipos específicos de dados do relatório
interface RelatorioParticipanteBase {
    nome: string
    cpf: string
    empresa: string
    funcao: string | undefined
}

interface RelatorioParticipanteCompleto extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
}

interface RelatorioParticipanteCheckin extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
}

interface RelatorioParticipanteCheckout extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
}

interface RelatorioParticipanteTempo extends RelatorioParticipanteBase {
    pulseira: string
    tipoPulseira: string
    checkIn: string
    checkOut: string
    tempoTotal: string
}

interface RelatorioParticipanteCredencial extends RelatorioParticipanteBase {
    tipoCredencial: string
}

interface RelatorioParticipanteCadastro extends RelatorioParticipanteBase {
    cadastradoPor: string
}

interface RelatorioHeaderEmpresa {
    isHeader: true
    nomeEmpresa: string
    totalParticipantes: number
    participantesComCheckIn: number
    headerText: string
}

type RelatorioDataItem =
    | RelatorioParticipanteCompleto
    | RelatorioParticipanteCheckin
    | RelatorioParticipanteCheckout
    | RelatorioParticipanteTempo
    | RelatorioParticipanteCredencial
    | RelatorioParticipanteCadastro
    | RelatorioHeaderEmpresa

export default function RelatoriosPage() {
    const params = useParams()
    const eventId = String(params.id)
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null


    // Hooks para buscar dados
    const { data: participantes = [], isLoading: participantesLoading } = useEventParticipantsByEvent({ eventId })
    const { data: coordenadores = [], isLoading: coordenadoresLoading } = useCoordenadoresByEvent({ eventId })
    const { data: vagas = [], isLoading: vagasLoading } = useEventVehiclesByEvent({ eventId })
    const { data: credenciais = [], isLoading: credenciaisLoading } = useCredentialsByEvent(eventId);
    const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAllEventAttendance(eventId);
    const { data: movementCredentials = [], isLoading: movementLoading } = useMovementCredential(eventId);

    // Sistema de Análise Avançada de Dados
    const analiseDados = useMemo(() => {
        if (!participantes.length || !attendanceRecords.length) return null;

        // Análise de IDs únicos
        const participantIds = new Set(participantes.map(p => p.id));
        const attendanceParticipantIds = new Set(attendanceRecords.map(r => r.participantId));

        // IDs que estão em participantes mas não em attendance
        const missingInAttendance = [...participantIds].filter(id => !attendanceParticipantIds.has(id));

        // IDs que estão em attendance mas não em participantes  
        const orphanAttendance = [...attendanceParticipantIds].filter(id => !participantIds.has(id));

        // Participantes com múltiplos registros de attendance
        const attendanceByParticipant: any = {};
        attendanceRecords.forEach(record => {
            if (!attendanceByParticipant[record.participantId]) {
                attendanceByParticipant[record.participantId] = [];
            }
            attendanceByParticipant[record.participantId].push(record);
        });

        const participantesComMultiplosRegistros = Object.entries(attendanceByParticipant)
            .filter(([_, records]: [string, any]) => records.length > 1)
            .map(([participantId, records]: [string, any]) => ({
                participantId,
                count: records.length,
                records: records
            }));

        // Análise de dados de check-in válidos
        const attendanceComCheckIn = attendanceRecords.filter(r => r.checkIn && r.checkIn !== null);
        const attendanceComCheckOut = attendanceRecords.filter(r => r.checkOut && r.checkOut !== null);

        // Participantes originais com check-in
        const participantesOriginaisComCheckIn = participantes.filter(p => p.checkIn && p.checkIn !== "");

        const analise = {
            totalParticipantes: participantes.length,
            totalAttendanceRecords: attendanceRecords.length,
            participantesComMatch: participantIds.size - missingInAttendance.length,
            participantesSemMatch: missingInAttendance.length,
            attendanceOrfaos: orphanAttendance.length,
            participantesComMultiplosRegistros: participantesComMultiplosRegistros.length,
            attendanceComCheckInValido: attendanceComCheckIn.length,
            attendanceComCheckOutValido: attendanceComCheckOut.length,
            participantesOriginaisComCheckIn: participantesOriginaisComCheckIn.length,
            coverageRate: ((participantIds.size - missingInAttendance.length) / participantIds.size * 100).toFixed(2),
            missingIds: missingInAttendance.slice(0, 5),
            orphanIds: orphanAttendance.slice(0, 5),
            multipleRecordsDetails: participantesComMultiplosRegistros.slice(0, 3)
        };

        console.log(`🔍 ANÁLISE AVANÇADA - Evento ${eventId}:`, analise);

        return analise;
    }, [participantes, attendanceRecords, eventId]);

    // Hook para exportação
    const exportPDFMutation = useExportPDF()

    // Estados do relatório
    const [configRelatorio, setConfigRelatorio] = useState<RelatorioConfig>({
        titulo: "",
        tipo: "geral",
        filtroDia: "all",
        filtroEmpresa: "all_companies",
        filtroFuncao: "all_functions",
        filtroStatus: "",
        filtroTipoCredencial: "all_credentials"
    })

    const [selectedDay, setSelectedDay] = useState<string>("all")
    const [selectedCompanyForExport, setSelectedCompanyForExport] = useState<string>("all_companies")


    // Função para gerar dias do evento
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string }> => {
        if (!evento) return []

        const days: Array<{ id: string; label: string; date: string; type: string }> = []

        // Adicionar dia "Todos"
        days.push({ id: 'all', label: 'TODOS', date: '', type: 'all' })

        // Adicionar dias de montagem
        if (evento.setupStartDate && evento.setupEndDate) {
            const startDate = new Date(evento.setupStartDate)
            const endDate = new Date(evento.setupEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR')
                days.push({
                    id: dateStr,
                    label: `${dateStr} (MONTAGEM)`,
                    date: dateStr,
                    type: 'setup'
                })
            }
        }

        // Adicionar dias de Evento/evento
        if (evento.preparationStartDate && evento.preparationEndDate) {
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR')
                days.push({
                    id: dateStr,
                    label: `${dateStr} (EVENTO)`,
                    date: dateStr,
                    type: 'preparation'
                })
            }
        }

        // Adicionar dias de finalização
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            const startDate = new Date(evento.finalizationStartDate)
            const endDate = new Date(evento.finalizationEndDate)
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR')
                days.push({
                    id: dateStr,
                    label: `${dateStr} (DESMONTAGEM)`,
                    date: dateStr,
                    type: 'finalization'
                })
            }
        }

        return days
    }, [evento])

    // Função para formatar data de ISO para YYYY/MM/DD HH:MM
    const formatarDataHora = useCallback((isoString: string): string => {
        try {
            if (!isoString) return "-"
            const data = new Date(isoString)

            // Verificar se a data é válida
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

    // Sistema Ultra-Robusto de Sincronização de Attendance
    const sincronizarAttendance = useCallback((participante: EventParticipant) => {
        try {
            // Validação de entrada
            if (!participante || !participante.id) {
                console.warn(`⚠️ Participante inválido:`, participante);
                return {
                    ...participante,
                    checkIn: participante?.checkIn || "",
                    checkOut: participante?.checkOut || ""
                };
            }

            // Estratégia 1: Busca exata por ID
            let participantAttendance = attendanceRecords.filter(
                record => record && record.participantId === participante.id
            );

            // Estratégia 2: Busca por aproximação (caso haja problemas de encoding/formato)
            if (participantAttendance.length === 0) {
                participantAttendance = attendanceRecords.filter(record => {
                    if (!record || !record.participantId) return false;
                    return record.participantId.toLowerCase().trim() === participante.id.toLowerCase().trim();
                });
            }

            // Estratégia 3: Busca por nome (fallback extremo)
            if (participantAttendance.length === 0 && participante.name) {
                participantAttendance = attendanceRecords.filter(record => {
                    if (!record || !record.participant?.name) return false;
                    const recordName = record.participant.name.toLowerCase().trim();
                    const participantName = participante.name.toLowerCase().trim();
                    return recordName === participantName;
                });

                if (participantAttendance.length > 0) {
                    console.log(`🔄 Match por nome para ${participante.name}:`, participantAttendance.length);
                }
            }

            // Log detalhado para debugging
            const shouldLog = participantAttendance.length > 0 ||
                (participante.checkIn && participante.checkIn !== "") ||
                Math.random() < 0.1; // 10% sample para participantes sem match

            if (shouldLog) {
                console.log(`🔍 Sync ${participante.name}:`, {
                    participantId: participante.id,
                    attendanceFound: participantAttendance.length,
                    originalCheckIn: participante.checkIn,
                    originalCheckOut: participante.checkOut,
                    attendanceRecords: participantAttendance.map(r => ({
                        checkIn: r.checkIn,
                        checkOut: r.checkOut,
                        date: r.date
                    }))
                });
            }

            // Se não há registros de attendance, processar dados originais
            if (participantAttendance.length === 0) {
                // Tentar formatar dados originais se existirem
                const originalCheckIn = participante.checkIn ?
                    (participante.checkIn.includes('T') ? formatarDataHora(participante.checkIn) : participante.checkIn) : "";
                const originalCheckOut = participante.checkOut ?
                    (participante.checkOut.includes('T') ? formatarDataHora(participante.checkOut) : participante.checkOut) : "";

                return {
                    ...participante,
                    checkIn: originalCheckIn,
                    checkOut: originalCheckOut
                };
            }

            // Processar registros de attendance válidos
            const validAttendanceRecords = participantAttendance.filter(record =>
                record && (record.checkIn || record.checkOut)
            );

            // Buscar melhor check-in (mais recente e válido)
            const validCheckIns = validAttendanceRecords
                .filter(record => record.checkIn && record.checkIn !== null && record.checkIn !== "")
                .sort((a, b) => {
                    try {
                        return new Date(b.checkIn!).getTime() - new Date(a.checkIn!).getTime();
                    } catch {
                        return 0;
                    }
                });

            // Buscar melhor check-out (mais recente e válido)
            const validCheckOuts = validAttendanceRecords
                .filter(record => record.checkOut && record.checkOut !== null && record.checkOut !== "")
                .sort((a, b) => {
                    try {
                        return new Date(b.checkOut!).getTime() - new Date(a.checkOut!).getTime();
                    } catch {
                        return 0;
                    }
                });

            const latestCheckin = validCheckIns[0];
            const latestCheckout = validCheckOuts[0];

            // Processar dados finais com fallbacks múltiplos
            let finalCheckIn = "";
            let finalCheckOut = "";

            // Prioridade: Attendance > Original > Vazio
            if (latestCheckin?.checkIn) {
                try {
                    finalCheckIn = formatarDataHora(latestCheckin.checkIn);
                } catch (error) {
                    console.error(`Erro ao formatar checkIn para ${participante.name}:`, error);
                    finalCheckIn = latestCheckin.checkIn; // Usar valor bruto se formatação falhar
                }
            } else if (participante.checkIn && participante.checkIn !== "") {
                try {
                    finalCheckIn = participante.checkIn.includes('T') ?
                        formatarDataHora(participante.checkIn) : participante.checkIn;
                } catch (error) {
                    finalCheckIn = participante.checkIn;
                }
            }

            if (latestCheckout?.checkOut) {
                try {
                    finalCheckOut = formatarDataHora(latestCheckout.checkOut);
                } catch (error) {
                    console.error(`Erro ao formatar checkOut para ${participante.name}:`, error);
                    finalCheckOut = latestCheckout.checkOut;
                }
            } else if (participante.checkOut && participante.checkOut !== "") {
                try {
                    finalCheckOut = participante.checkOut.includes('T') ?
                        formatarDataHora(participante.checkOut) : participante.checkOut;
                } catch (error) {
                    finalCheckOut = participante.checkOut;
                }
            }

            // Log do resultado final
            if (shouldLog) {
                console.log(`✅ Resultado para ${participante.name}:`, {
                    finalCheckIn: finalCheckIn || "-",
                    finalCheckOut: finalCheckOut || "-",
                    source: {
                        checkIn: latestCheckin?.checkIn ? 'attendance' : (participante.checkIn ? 'original' : 'none'),
                        checkOut: latestCheckout?.checkOut ? 'attendance' : (participante.checkOut ? 'original' : 'none')
                    }
                });
            }

            return {
                ...participante,
                checkIn: finalCheckIn,
                checkOut: finalCheckOut
            };

        } catch (error) {
            console.error(`🚨 Erro crítico na sincronização para ${participante?.name || 'unknown'}:`, error);
            // Fallback de emergência
            return {
                ...participante,
                checkIn: participante?.checkIn || "",
                checkOut: participante?.checkOut || ""
            };
        }
    }, [attendanceRecords, formatarDataHora])

    // Sistema Otimizado de Filtragem e Sincronização por Dia
    const getParticipantesPorDia = useCallback((dia: string): EventParticipant[] => {
        try {
            // SEMPRE sincronizar TODOS os participantes primeiro
            const todosSincronizados = participantes.map(p => {
                try {
                    return sincronizarAttendance(p);
                } catch (error) {
                    console.error(`Erro na sincronização de ${p?.name || 'unknown'}:`, error);
                    return p; // Fallback para participante original
                }
            });

            // DEPOIS aplicar filtro por dia se necessário
            let participantesFiltrados: EventParticipant[];

            if (dia === 'all') {
                participantesFiltrados = todosSincronizados;
            } else {
                participantesFiltrados = todosSincronizados.filter((participant: EventParticipant) => {
                    if (!participant || !participant.daysWork || participant.daysWork.length === 0) {
                        return false;
                    }
                    return participant.daysWork.includes(dia);
                });
            }

            // Log de debug para acompanhar o processo
            if (Math.random() < 0.2) { // 20% das vezes para não spammar logs
                console.log(`🗓️ Filtro por dia "${dia}":`, {
                    totalParticipantes: participantes.length,
                    sincronizados: todosSincronizados.length,
                    filtrados: participantesFiltrados.length,
                    comCheckIn: participantesFiltrados.filter(p => p.checkIn && p.checkIn !== "" && p.checkIn !== "-").length
                });
            }

            return participantesFiltrados;

        } catch (error) {
            console.error(`🚨 Erro crítico na filtragem por dia:`, error);
            // Fallback de emergência - retornar participantes originais
            return participantes.filter((participant: EventParticipant) => {
                if (dia === 'all') return true;
                if (!participant.daysWork || participant.daysWork.length === 0) return false;
                return participant.daysWork.includes(dia);
            });
        }
    }, [participantes, sincronizarAttendance])

    // Dados filtrados por dia selecionado
    const participantesDoDia = getParticipantesPorDia(selectedDay)

    // Estatísticas Avançadas com Dados de Sincronização
    const estatisticas = useMemo(() => {
        const totalParticipantes = participantesDoDia.length

        // Filtros mais rigorosos para check-in/check-out válidos
        const participantesComCheckIn = participantesDoDia.filter(p =>
            p.checkIn && p.checkIn !== "" && p.checkIn !== "-"
        ).length

        const participantesComCheckOut = participantesDoDia.filter(p =>
            p.checkOut && p.checkOut !== "" && p.checkOut !== "-"
        ).length

        const participantesAtivos = participantesComCheckIn - participantesComCheckOut
        const participantesComPulseira = participantesDoDia.filter(p => p.credentialId).length

        // Estatísticas de sincronização
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

    // Função para obter a cor da tab baseada no tipo de dia
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'setup':
                    return 'border-yellow-500 text-yellow-600 bg-yellow-50'
                case 'preparation':
                    return 'border-blue-500 text-blue-600 bg-blue-50'
                case 'finalization':
                    return 'border-purple-500 text-purple-600 bg-purple-50'
                default:
                    return 'border-purple-500 text-purple-600 bg-purple-50'
            }
        } else {
            switch (type) {
                case 'setup':
                    return 'hover:text-yellow-700 hover:border-yellow-300'
                case 'preparation':
                    return 'hover:text-blue-700 hover:border-blue-300'
                case 'finalization':
                    return 'hover:text-purple-700 hover:border-purple-300'
                default:
                    return 'hover:text-gray-700 hover:border-gray-300'
            }
        }
    }, [])

    // Função para gerar dados do relatório agrupados por empresa
    const gerarDadosRelatorio = useCallback((): RelatorioDataItem[] => {
        let participantesProcessados: Omit<RelatorioDataItem, 'isHeader'>[] = []

        switch (configRelatorio.tipo) {
            case "geral":
                // Relatório Geral: Lista todos staffs ordenados alfabeticamente
                participantesProcessados = participantesDoDia
                    .map(p => {
                        const dadosProcessados = {
                            nome: p.name?.toUpperCase() || "",
                            cpf: p.cpf || "",
                            empresa: p.company?.toUpperCase() || "",
                            funcao: p.role?.toUpperCase() || "",
                            pulseira: obterCodigoPulseira(p.id),
                            tipoPulseira: obterTipoPulseira(p.credentialId),
                            checkIn: p.checkIn || "-",
                            checkOut: p.checkOut || "-"
                        }

                        // Debug: Log específico para alguns participantes com dados
                        if (p.checkIn && p.checkIn !== "" && p.checkIn !== "-") {
                            console.log(`📋 Processando para relatório - ${p.name}:`, {
                                originalCheckIn: p.checkIn,
                                processedCheckIn: dadosProcessados.checkIn,
                                originalCheckOut: p.checkOut,
                                processedCheckOut: dadosProcessados.checkOut
                            })
                        }

                        return dadosProcessados as RelatorioParticipanteCompleto
                    })
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                break

            case "filtroEmpresa":
                // Filtro por Empresa: Similar ao geral mas com filtro adicional
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
                // Quem fez Check-in (unificado com código da pulseira)
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
                // Quem fez Check-out
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
                // Tempo de Serviço: Com tempo total de trabalho
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
                // Tipo de credencial
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
                // Cadastrado por
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

    // Função para exportar PDF
    const exportarPDF = useCallback(() => {
        if (!configRelatorio.titulo.trim()) {
            toast.error("Digite um título para o relatório")
            return
        }

        const dadosRelatorio = gerarDadosRelatorio()

        exportPDFMutation.mutate({
            titulo: configRelatorio.titulo,
            tipo: configRelatorio.tipo,
            dados: dadosRelatorio.filter(item => !('isHeader' in item && item.isHeader)) as unknown as Record<string, unknown>[],
            filtros: {
                dia: configRelatorio.filtroDia,
                empresa: configRelatorio.filtroEmpresa,
                funcao: configRelatorio.filtroFuncao,
                status: configRelatorio.filtroStatus,
                tipoCredencial: configRelatorio.filtroTipoCredencial
            }
        })

        // Resetar configuração após sucesso
        setConfigRelatorio({
            titulo: "",
            tipo: "geral",
            filtroDia: "all",
            filtroEmpresa: "all_companies",
            filtroFuncao: "all_functions",
            filtroStatus: "",
            filtroTipoCredencial: "all_credentials"
        })
    }, [configRelatorio, gerarDadosRelatorio, exportPDFMutation])

    // Função para exportar relatório específico de uma empresa
    const exportarPDFEmpresa = useCallback(() => {
        if (selectedCompanyForExport === "all_companies") {
            toast.error("Selecione uma empresa específica para exportar")
            return
        }

        const nomeEmpresa = selectedCompanyForExport
        const participantesEmpresa = participantesDoDia.filter(p => p.company === nomeEmpresa)

        const dadosEmpresa = participantesEmpresa.map(p => ({
            nome: p.name?.toUpperCase() || "",
            cpf: p.cpf || "",
            empresa: p.company?.toUpperCase() || "",
            funcao: p.role?.toUpperCase() || "",
            pulseira: obterCodigoPulseira(p.id),
            tipoPulseira: obterTipoPulseira(p.credentialId),
            checkIn: p.checkIn || "-",
            checkOut: p.checkOut || "-"
        })).sort((a, b) => a.nome.localeCompare(b.nome))

        exportPDFMutation.mutate({
            titulo: `Relatório Específico - ${nomeEmpresa}`,
            tipo: "filtroEmpresa",
            dados: dadosEmpresa,
            filtros: {
                dia: selectedDay,
                empresa: nomeEmpresa,
                funcao: "all_functions",
                status: "",
                tipoCredencial: "all_credentials"
            }
        })
    }, [selectedCompanyForExport, participantesDoDia, selectedDay, obterCodigoPulseira, obterTipoPulseira, exportPDFMutation])

    const isLoading = participantesLoading || coordenadoresLoading || vagasLoading || credenciaisLoading || attendanceLoading


    if (!evento) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                </div>
            </div>
        )
    }
    const dadosRelatorio = gerarDadosRelatorio()

    return (
        <EventLayout eventId={eventId} eventName={evento.name}>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios</h1>
                    <p className="text-gray-600">Gerencie e exporte relatórios do evento</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Participantes</p>
                                    <p className="text-3xl font-bold">{estatisticas.totalParticipantes}</p>
                                </div>
                                <Users className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Check-in Sincronizado</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-3xl font-bold">{estatisticas.participantesComCheckIn}</p>
                                        {analiseDados && (
                                            <div className="text-xs opacity-75">
                                                ({((estatisticas.participantesComCheckIn / estatisticas.totalParticipantes) * 100).toFixed(1)}%)
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Clock className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Coordenadores</p>
                                    <p className="text-3xl font-bold">{estatisticas.totalCoordenadores}</p>
                                </div>
                                <UserCog className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Com Pulseira</p>
                                    <p className="text-3xl font-bold">{estatisticas.participantesComPulseira}</p>
                                </div>
                                <Building className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs dos dias */}
                <div className="mb-8">
                    <div className="border-b border-gray-200 bg-white rounded-t-lg">
                        <nav className="-mb-px flex space-x-2 px-6 overflow-x-auto">
                            {getEventDays().map((day) => {
                                const participantesNoDia = getParticipantesPorDia(day.id).length
                                const isActive = selectedDay === day.id

                                return (
                                    <button
                                        key={day.id}
                                        onClick={() => setSelectedDay(day.id)}
                                        className={`border-b-2 py-3 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                                            ? getTabColor(day.type, true)
                                            : `border-transparent text-gray-500 ${getTabColor(day.type, false)}`
                                            }`}
                                    >
                                        {day.label} ({participantesNoDia})
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                {/* Configuração do Relatório */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Formulário de Configuração */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Configurar Relatório
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Título */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Título do Relatório</label>
                                <Input
                                    value={configRelatorio.titulo}
                                    onChange={(e) => setConfigRelatorio(prev => ({ ...prev, titulo: e.target.value }))}
                                    placeholder="Ex: Relatório de Participantes - Dia 1"
                                />
                            </div>

                            {/* Tipo de Relatório */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Tipo de Relatório</label>
                                <Select
                                    value={configRelatorio.tipo}
                                    onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, tipo: value as RelatorioConfig['tipo'] }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="geral">Relatório Geral</SelectItem>
                                        <SelectItem value="filtroEmpresa">Filtro por Empresa</SelectItem>
                                        <SelectItem value="checkin">Quem fez Check-in</SelectItem>
                                        <SelectItem value="checkout">Quem fez Check-out</SelectItem>
                                        <SelectItem value="tempo">Tempo de Serviço</SelectItem>
                                        <SelectItem value="tipoCredencial">Tipo de Credencial</SelectItem>
                                        <SelectItem value="cadastradoPor">Cadastrado por</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtro por Dia */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Filtrar por Dia</label>
                                <Select
                                    value={configRelatorio.filtroDia}
                                    onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroDia: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os dias</SelectItem>
                                        {getEventDays().filter(day => day.id !== 'all').map(day => (
                                            <SelectItem key={day.id} value={day.id}>{day.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtros adicionais baseados no tipo */}
                            {(configRelatorio.tipo === "filtroEmpresa" ||
                                configRelatorio.tipo === "checkin" ||
                                configRelatorio.tipo === "checkout" ||
                                configRelatorio.tipo === "cadastradoPor") && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Empresa</label>
                                        <Select
                                            value={configRelatorio.filtroEmpresa}
                                            onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroEmpresa: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas as empresas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_companies">Todas as empresas</SelectItem>
                                                {Array.from(new Set(participantesDoDia.map(p => p.company).filter(Boolean))).map(empresa => (
                                                    <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                            {configRelatorio.tipo === "tipoCredencial" && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Empresa</label>
                                        <Select
                                            value={configRelatorio.filtroEmpresa}
                                            onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroEmpresa: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas as empresas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_companies">Todas as empresas</SelectItem>
                                                {Array.from(new Set(participantesDoDia.map(p => p.company).filter(Boolean))).map(empresa => (
                                                    <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Função</label>
                                        <Select
                                            value={configRelatorio.filtroFuncao}
                                            onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroFuncao: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas as funções" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_functions">Todas as funções</SelectItem>
                                                {Array.from(new Set(participantesDoDia.map(p => p.role).filter(Boolean))).map(funcao => (
                                                    <SelectItem key={funcao} value={funcao || "not_defined"}>{funcao}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Tipo de Credencial</label>
                                        <Select
                                            value={configRelatorio.filtroTipoCredencial}
                                            onValueChange={(value) => setConfigRelatorio(prev => ({ ...prev, filtroTipoCredencial: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos os tipos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_credentials">Todos os tipos</SelectItem>
                                                {Array.from(new Set(participantesDoDia.map(p => p.credentialId || "not_informed").filter(Boolean))).map(credencial => (
                                                    <SelectItem key={credencial} value={credencial}>{credencial}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}

                            {/* Botão de Exportar */}
                            <Button
                                onClick={exportarPDF}
                                disabled={isLoading || !configRelatorio.titulo.trim() || exportPDFMutation.isPending}
                                className="w-full"
                            >
                                {exportPDFMutation.isPending ? (
                                    <>
                                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Gerando PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Exportar PDF
                                    </>
                                )}
                            </Button>

                            {/* Separador */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-500">ou</span>
                                </div>
                            </div>

                            {/* Exportar por Empresa Específica */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium">Exportar Relatório por Empresa</label>

                                <Select
                                    value={selectedCompanyForExport}
                                    onValueChange={setSelectedCompanyForExport}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma empresa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all_companies">Todas as empresas</SelectItem>
                                        {Array.from(new Set(participantesDoDia.map(p => p.company).filter(Boolean))).sort().map(empresa => (
                                            <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    onClick={exportarPDFEmpresa}
                                    disabled={isLoading || selectedCompanyForExport === "all_companies" || exportPDFMutation.isPending}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {exportPDFMutation.isPending ? (
                                        <>
                                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                                            Gerando PDF...
                                        </>
                                    ) : (
                                        <>
                                            <Building className="h-4 w-4 mr-2" />
                                            Exportar por Empresa
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preview dos Dados */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Preview dos Dados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Sistema Avançado de Análise e Debug */}
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-sm text-gray-800 mb-2">🔬 Análise Avançada de Dados</h4>
                                {analiseDados ? (
                                    <div className="text-xs text-gray-600 space-y-2">
                                        {/* Estatísticas principais */}
                                        <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded border">
                                            <div><strong>Total participantes:</strong> {analiseDados.totalParticipantes}</div>
                                            <div><strong>Total attendance:</strong> {analiseDados.totalAttendanceRecords}</div>

                                            <div><strong>Matches encontrados:</strong> {analiseDados.participantesComMatch}</div>
                                        </div>

                                        {/* Problemas identificados */}
                                        <div className="space-y-1">
                                            <div className={analiseDados.participantesSemMatch > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                                                <strong>Participantes sem match:</strong> {analiseDados.participantesSemMatch}
                                            </div>
                                            <div className={analiseDados.attendanceOrfaos > 0 ? 'text-yellow-600' : 'text-green-600'}>
                                                <strong>Attendance órfãos:</strong> {analiseDados.attendanceOrfaos}
                                            </div>
                                            <div className="text-blue-600">
                                                <strong>Check-ins válidos:</strong> {analiseDados.attendanceComCheckInValido} de {analiseDados.totalAttendanceRecords}
                                            </div>
                                            <div className="text-purple-600">
                                                <strong>Check-outs válidos:</strong> {analiseDados.attendanceComCheckOutValido} de {analiseDados.totalAttendanceRecords}
                                            </div>
                                        </div>

                                        {/* Dados pós-sincronização */}
                                        <div className="p-2 bg-blue-50 rounded border">
                                            <div className="font-medium text-blue-800 mb-1">Resultado da Sincronização:</div>
                                            <div><strong>Com checkIn:</strong> {participantesDoDia.filter(p => p.checkIn && p.checkIn !== "-" && p.checkIn !== "").length}</div>
                                            <div><strong>Com checkOut:</strong> {participantesDoDia.filter(p => p.checkOut && p.checkOut !== "-" && p.checkOut !== "").length}</div>
                                        </div>

                                        {/* Detalhes dos problemas */}
                                        {analiseDados.participantesSemMatch > 0 && (
                                            <details className="mt-2">
                                                <summary className="cursor-pointer text-red-600 font-medium">IDs sem match ({analiseDados.missingIds.length} primeiros)</summary>
                                                <pre className="mt-1 text-xs bg-white p-2 rounded border max-h-20 overflow-auto">
                                                    {analiseDados.missingIds.join('\n')}
                                                </pre>
                                            </details>
                                        )}

                                        {analiseDados.multipleRecordsDetails.length > 0 && (
                                            <details className="mt-2">
                                                <summary className="cursor-pointer text-yellow-600">Múltiplos registros ({analiseDados.multipleRecordsDetails.length})</summary>
                                                <pre className="mt-1 text-xs bg-white p-2 rounded border max-h-32 overflow-auto">
                                                    {JSON.stringify(analiseDados.multipleRecordsDetails, null, 2)}
                                                </pre>
                                            </details>
                                        )}

                                        {attendanceRecords.length > 0 && (
                                            <details className="mt-2">
                                                <summary className="cursor-pointer text-blue-600">Ver amostra attendance records</summary>
                                                <pre className="mt-2 text-xs bg-white p-2 rounded border max-h-40 overflow-auto">
                                                    {JSON.stringify(attendanceRecords.slice(0, 3), null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500">Aguardando dados...</p>
                                )}
                                {/* Ferramentas de Debug Avançado */}
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            console.log("🚀 ANÁLISE COMPLETA:");
                                            console.log("📊 Estatísticas:", analiseDados);

                                            // Teste participantes com attendance
                                            const participantesComAttendance = participantesDoDia.filter(p =>
                                                attendanceRecords.some(r => r.participantId === p.id)
                                            ).slice(0, 5);

                                            console.log("👥 Participantes com attendance:", participantesComAttendance.map(p => ({
                                                nome: p.name,
                                                id: p.id,
                                                checkInSincronizado: p.checkIn,
                                                attendanceCount: attendanceRecords.filter(r => r.participantId === p.id).length
                                            })));

                                            // Teste participantes sem attendance mas com dados originais
                                            const participantesSemAttendance = participantesDoDia.filter(p =>
                                                !attendanceRecords.some(r => r.participantId === p.id) &&
                                                (p.checkIn || p.checkOut)
                                            ).slice(0, 3);

                                            console.log("❌ Participantes sem attendance mas com dados originais:", participantesSemAttendance.map(p => ({
                                                nome: p.name,
                                                id: p.id,
                                                checkInOriginal: p.checkIn,
                                                checkOutOriginal: p.checkOut
                                            })));
                                        }}
                                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                    >
                                        🔍 Debug Completo
                                    </button>

                                    <button
                                        onClick={() => {
                                            // Forçar re-sincronização de todos os participantes
                                            console.log("🔄 FORÇANDO RE-SINCRONIZAÇÃO:");
                                            const reprocessed = participantes.map(p => sincronizarAttendance(p));
                                            console.log(`✅ ${reprocessed.length} participantes reprocessados`);

                                            const comCheckIn = reprocessed.filter(p => p.checkIn && p.checkIn !== "" && p.checkIn !== "-");
                                            console.log(`📊 Resultado: ${comCheckIn.length} participantes com check-in`);
                                            console.log("Amostras:", comCheckIn.slice(0, 5).map(p => ({
                                                nome: p.name,
                                                checkIn: p.checkIn
                                            })));
                                        }}
                                        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                    >
                                        🔄 Re-sync
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Registros encontrados:</span>
                                    <Badge variant="secondary">{dadosRelatorio.length}</Badge>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm font-medium">Primeiros 5 registros:</span>
                                    <div className="space-y-1">
                                        {dadosRelatorio.slice(0, 5).map((item, index) => (
                                            <div key={index} className={`text-xs p-2 rounded ${'isHeader' in item && item.isHeader
                                                ? 'bg-blue-100 text-blue-800 font-semibold'
                                                : 'text-gray-600 bg-gray-50'
                                                }`}>
                                                {'isHeader' in item && item.isHeader
                                                    ? item.headerText
                                                    : `${'nome' in item ? item.nome : 'N/A'} - ${'funcao' in item ? item.funcao || 'Não informado' : ''}`
                                                }
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {dadosRelatorio.length === 0 && (
                                    <div className="text-center py-4 text-gray-500">
                                        Nenhum dado encontrado com os filtros atuais
                                    </div>
                                )}

                                {/* Botão de teste rápido */}
                                <div className="pt-4 border-t">
                                    <Button
                                        onClick={() => {
                                            const dadosTeste = [
                                                {
                                                    nome: "MARCELA MASTINI GOMES ALMEIDA",
                                                    cpf: "415.742.169-0",
                                                    empresa: "2M PRODUÇÕES",
                                                    funcao: "MÍDIA",
                                                    pulseira: "-",
                                                    checkIn: "-",
                                                    checkOut: "-"
                                                },
                                                {
                                                    nome: "KAIQUE JARDIM DE LIMA",
                                                    cpf: "413.265.785-0",
                                                    empresa: "2M PRODUÇÕES",
                                                    funcao: "MÍDIA",
                                                    pulseira: "-",
                                                    checkIn: "-",
                                                    checkOut: "-"
                                                },
                                                {
                                                    nome: "SILVIA CRISTINA COLMENERO",
                                                    cpf: "845.995.866-0",
                                                    empresa: "2M PRODUÇÕES",
                                                    funcao: "IMPRENSA",
                                                    pulseira: "-",
                                                    checkIn: "-",
                                                    checkOut: "-"
                                                },
                                                {
                                                    nome: "LUCAS AGOSTINHO COELHO SALES",
                                                    cpf: "135.433.606-20",
                                                    empresa: "7 FEST",
                                                    funcao: "FOTÓGRAFO",
                                                    pulseira: "4003",
                                                    checkIn: "02/08/2025, 14:55:06",
                                                    checkOut: "-"
                                                },
                                                {
                                                    nome: "HERBERT RICHARD MARTINS LEITE",
                                                    cpf: "114.249.996-00",
                                                    empresa: "7 FEST",
                                                    funcao: "FOTÓGRAFO",
                                                    pulseira: "4004",
                                                    checkIn: "02/08/2025, 14:55:05",
                                                    checkOut: "-"
                                                },
                                                {
                                                    nome: "PEDRO HENRIQUE ALVIM VILELA",
                                                    cpf: "045.749.936-20",
                                                    empresa: "AGÊNCIA I7",
                                                    funcao: "FOTÓGRAFO",
                                                    pulseira: "214",
                                                    checkIn: "02/08/2025, 21:27:05",
                                                    checkOut: "-"
                                                },
                                                {
                                                    nome: "CARLOS EMILIO PEREIRA DA SILVA",
                                                    cpf: "33.396.562-0",
                                                    empresa: "ALL ACCESS",
                                                    funcao: "STAFF",
                                                    pulseira: "835",
                                                    checkIn: "02/08/2025, 06:14:33",
                                                    checkOut: "-"
                                                },
                                                {
                                                    nome: "CAIO CESAR FERREIRA DE ARAUJO",
                                                    cpf: "29.177.465.806-0",
                                                    empresa: "ALL ACCESS",
                                                    funcao: "STAFF",
                                                    pulseira: "1030",
                                                    checkIn: "02/08/2025, 10:17:41",
                                                    checkOut: "-"
                                                },
                                                {
                                                    nome: "PABLO CEZAR MENDES DE MATTOS",
                                                    cpf: "133.884.217.06-0",
                                                    empresa: "ALL ACCESS",
                                                    funcao: "STAFF",
                                                    pulseira: "1049",
                                                    checkIn: "02/08/2025, 10:17:10",
                                                    checkOut: "-"
                                                }
                                            ]

                                            exportPDFMutation.mutate({
                                                titulo: "Teste Rápido - RG Produções",
                                                tipo: "geral",
                                                dados: dadosTeste,
                                                filtros: {
                                                    dia: "all",
                                                    empresa: "all_companies",
                                                    funcao: "all_functions",
                                                    status: "",
                                                    tipoCredencial: "all_credentials"
                                                }
                                            })
                                        }}
                                        disabled={exportPDFMutation.isPending}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                    >
                                        {exportPDFMutation.isPending ? (
                                            <>
                                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                                                Testando...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4 mr-2" />
                                                Teste Rápido PDF
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </EventLayout>
    )
}