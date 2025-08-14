/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event"
import { useEventAttendanceByEvent } from "@/features/eventos/api/query/use-event-attendance"
import { useMovementCredential } from "@/features/eventos/api/mutation/use-movement-credential"
import EventLayout from "@/components/dashboard/dashboard-layout"
import { ReportSummaryComponent } from "./components/report-summary"
import { ReportFilters } from "./components/report-filters"
import { ParticipantsTable } from "./components/participants-table"
import { useReportData } from "./hooks/use-report-data"
import { useExport } from "./hooks/use-export"
import { PdfPreviewModal } from "./components/pdf-preview-modal"

export default function Relatorio2Page() {
    // === ROUTE & EVENT DATA ===
    const params = useParams()
    const eventId = String(params.id)
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null

    // === FETCH DATA ===
    const { data: participantes = [], isLoading: participantesLoading } = useEventParticipantsByEvent({ eventId })
    const { data: credenciais = [], isLoading: credenciaisLoading } = useCredentialsByEvent(eventId)
    const { data: attendanceData, isLoading: attendanceLoading } = useEventAttendanceByEvent(eventId)
    const attendanceRecords = attendanceData?.data || []
    const { data: movementCredentials = [], isLoading: movementLoading } = useMovementCredential(eventId)

    // Debug temporário para verificar dados
    console.log("🔍 DEBUG Attendance Records:", {
        totalAttendance: attendanceRecords.length,
        totalParticipants: participantes.length,
        totalCredentials: movementCredentials.length,
        sampleAttendance: attendanceRecords.slice(0, 3),
        attendanceDataStructure: attendanceData
    })

    // === FILTER STATES ===
    const [selectedDay, setSelectedDay] = useState<string>("all")
    const [selectedCompany, setSelectedCompany] = useState<string>("all")
    const [selectedReportType, setSelectedReportType] = useState<string>("geral")
    const [selectedCredentialType, setSelectedCredentialType] = useState<string>("all")
    const [selectedFunction, setSelectedFunction] = useState<string>("all")

    // === PREVIEW MODAL STATE ===
    const [showPreview, setShowPreview] = useState(false)
    const [pendingExportConfig, setPendingExportConfig] = useState<any>(null)

    // === TURNOS/DIAS FUNCTIONS ===
    // Função para formatar data
    const formatDate = useCallback((dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }, [])

    // Função para extrair informações do shift ID
    const parseShiftId = useCallback((shiftId: string) => {
        // Formato esperado: YYYY-MM-DD-stage-period
        const parts = shiftId.split('-');
        if (parts.length >= 5) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            const stage = parts[3];
            const period = parts[4] as 'diurno' | 'noturno';

            return {
                dateISO: `${year}-${month}-${day}`,
                dateFormatted: formatDate(`${year}-${month}-${day}T00:00:00`),
                stage,
                period
            };
        }

        // Fallback para formato simples (apenas data)
        return {
            dateISO: shiftId,
            dateFormatted: formatDate(shiftId + 'T00:00:00'),
            stage: 'evento',
            period: 'diurno' as const
        };
    }, [formatDate]);

    // Função para gerar dias do evento usando nova estrutura
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> => {
        if (!evento) return [];

        const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> = [];

        // Função helper para processar arrays de dados do evento (nova estrutura)
        const processEventArray = (eventData: any, stage: string, stageName: string) => {
            if (!eventData) return;

            try {
                let dataArray: any[] = [];

                // Se for string JSON, fazer parse
                if (typeof eventData === 'string') {
                    dataArray = JSON.parse(eventData);
                }
                // Se já for array, usar diretamente
                else if (Array.isArray(eventData)) {
                    dataArray = eventData;
                }
                // Se não for nem string nem array, sair
                else {
                    return;
                }

                // Processar cada item do array
                dataArray.forEach(item => {
                    if (item && item.date) {
                        const formattedDate = formatDate(item.date);
                        const dateISO = new Date(item.date).toISOString().split('T')[0]; // YYYY-MM-DD para ID

                        // Usar período do item se disponível, senão calcular baseado na hora
                        let period: 'diurno' | 'noturno';
                        if (item.period && (item.period === 'diurno' || item.period === 'noturno')) {
                            period = item.period;
                        } else {
                            // Fallback: calcular baseado na hora
                            const dateObj = new Date(item.date);
                            const hour = dateObj.getHours();
                            period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                        }

                        const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno';

                        days.push({
                            id: `${dateISO}-${stage}-${period}`, // ID único incluindo o turno
                            label: `${formattedDate} (${stageName} - ${periodLabel})`,
                            date: formattedDate,
                            type: stage,
                            period
                        });
                    }
                });
            } catch (error) {
                console.warn(`Erro ao processar dados do evento para stage ${stage}:`, error);
            }
        };

        // Processar nova estrutura do evento
        if (evento.montagem) processEventArray(evento.montagem, 'montagem', 'MONTAGEM');
        if (evento.evento) processEventArray(evento.evento, 'evento', 'EVENTO');
        if (evento.desmontagem) processEventArray(evento.desmontagem, 'desmontagem', 'DESMONTAGEM');

        // Fallback para estrutura antiga (manter compatibilidade)
        if (evento.setupStartDate && evento.setupEndDate && (!evento.montagem || (Array.isArray(evento.montagem) && evento.montagem.length === 0))) {
            const startDate = new Date(evento.setupStartDate);
            const endDate = new Date(evento.setupEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatDate(date.toISOString());
                const dateISO = date.toISOString().split('T')[0];

                days.push({
                    id: `${dateISO}-montagem-diurno`,
                    label: `${dateStr} (MONTAGEM - Diurno)`,
                    date: dateStr,
                    type: 'montagem',
                    period: 'diurno'
                });
            }
        }

        if (evento.preparationStartDate && evento.preparationEndDate && (!evento.evento || (Array.isArray(evento.evento) && evento.evento.length === 0))) {
            const startDate = new Date(evento.preparationStartDate);
            const endDate = new Date(evento.preparationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatDate(date.toISOString());
                const dateISO = date.toISOString().split('T')[0];

                days.push({
                    id: `${dateISO}-evento-diurno`,
                    label: `${dateStr} (EVENTO - Diurno)`,
                    date: dateStr,
                    type: 'evento',
                    period: 'diurno'
                });
            }
        }

        if (evento.finalizationStartDate && evento.finalizationEndDate && (!evento.desmontagem || (Array.isArray(evento.desmontagem) && evento.desmontagem.length === 0))) {
            const startDate = new Date(evento.finalizationStartDate);
            const endDate = new Date(evento.finalizationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatDate(date.toISOString());
                const dateISO = date.toISOString().split('T')[0];

                days.push({
                    id: `${dateISO}-desmontagem-diurno`,
                    label: `${dateStr} (DESMONTAGEM - Diurno)`,
                    date: dateStr,
                    type: 'desmontagem',
                    period: 'diurno'
                });
            }
        }

        // Ordenar dias cronologicamente
        days.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateA.getTime() - dateB.getTime();
        });

        return days;
    }, [evento, formatDate]);

    // === DATA PROCESSING ===
    const { participants, summary, companyStats, filterData } = useReportData({
        participantes,
        attendanceRecords,
        movementCredentials,
        credenciais
    })

    // === FILTERED DATA ===
    const filteredParticipants = filterData({
        empresa: selectedCompany,
        day: selectedDay,
        reportType: selectedReportType,
        credentialType: selectedCredentialType,
        function: selectedFunction
    })

    // === EXPORT FUNCTIONALITY ===
    const {
        exportAll,
        exportByCompany,
        exportAllXLSX,
        exportByCompanyXLSX,
        exportRadios,
        exportEstacionamento,
        exportCrachas,
        generatePreviewData,
        isExporting
    } = useExport({
        eventName: evento?.name || "Evento",
        participants: filteredParticipants,
        selectedDay,
        selectedReportType,
        eventDays: getEventDays()
    })

    // === PREVIEW FUNCTIONS ===
    const handlePreview = useCallback(() => {
        setShowPreview(true)
    }, [])

    const handleConfirmExport = useCallback(() => {
        setShowPreview(false)
        if (pendingExportConfig) {
            exportAll(pendingExportConfig)
            setPendingExportConfig(null)
        } else {
            // Usar configuração padrão
            exportAll({
                columns: ["nome", "cpf", "empresa", "funcao", "checkIn", "checkOut"],
                columnOrder: ["nome", "cpf", "empresa", "funcao", "checkIn", "checkOut"],
                columnWidths: [
                    { key: "nome", width: 200 },
                    { key: "cpf", width: 120 },
                    { key: "empresa", width: 200 },
                    { key: "funcao", width: 160 },
                    { key: "checkIn", width: 120 },
                    { key: "checkOut", width: 120 }
                ]
            })
        }
    }, [pendingExportConfig, exportAll])

    // === LOADING STATE ===
    const isLoading = participantesLoading || credenciaisLoading || attendanceLoading || movementLoading

    // === ERROR STATE ===
    if (!evento) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                </div>
            </div>
        )
    }

    return (
        <EventLayout eventId={eventId} eventName={evento.name}>
            <div className="p-6 max-w-7xl mx-auto">
                {/* === HEADER === */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Relatório de Presença v2
                    </h1>
                    <p className="text-gray-600">
                        Controle de presença baseado nos registros de attendance
                    </p>
                </div>

                {/* === LOADING STATE === */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-gray-600">Carregando dados...</span>
                    </div>
                ) : (
                    <>
                        {/* === SUMMARY CARDS === */}
                        <ReportSummaryComponent summary={summary} />

                        {/* === FILTERS & EXPORT === */}
                        <ReportFilters
                            eventDays={getEventDays()}
                            selectedDay={selectedDay}
                            onDayChange={setSelectedDay}
                            companies={companyStats}
                            selectedCompany={selectedCompany}
                            onCompanyChange={setSelectedCompany}
                            selectedReportType={selectedReportType}
                            onReportTypeChange={setSelectedReportType}
                            selectedCredentialType={selectedCredentialType}
                            onCredentialTypeChange={setSelectedCredentialType}
                            selectedFunction={selectedFunction}
                            onFunctionChange={setSelectedFunction}
                            onExport={(config) => exportAll(config)}
                            onExportCompany={(config) => exportByCompany(selectedCompany, config)}
                            onExportXLSX={exportAllXLSX}
                            onExportCompanyXLSX={exportByCompanyXLSX}
                            onExportRadios={exportRadios}
                            onExportEstacionamento={exportEstacionamento}
                            onExportCrachas={exportCrachas}
                            onPreview={handlePreview}
                            isExporting={isExporting}
                            credenciais={credenciais}
                            participantes={participantes}
                        />

                        {/* === PARTICIPANTS TABLE === */}
                        <ParticipantsTable
                            participants={filteredParticipants}
                            groupByCompany={selectedCompany === 'all'}
                        />

                        {/* === PDF PREVIEW MODAL === */}
                        <PdfPreviewModal
                            open={showPreview}
                            onOpenChange={setShowPreview}
                            previewData={generatePreviewData()}
                            eventName={evento?.name || "Evento"}
                            onConfirmExport={handleConfirmExport}
                            isExporting={isExporting}
                        />
                    </>
                )}
            </div>
        </EventLayout>
    )
}