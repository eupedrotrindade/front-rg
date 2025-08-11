'use client'

import { useState } from "react"
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
    const [selectedCompany, setSelectedCompany] = useState<string>("all")
    const [selectedStatus, setSelectedStatus] = useState<string>("all")
    const [selectedAttendance, setSelectedAttendance] = useState<string>("all")

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
        status: selectedStatus,
        attendance: selectedAttendance
    })

    // === EXPORT FUNCTIONALITY ===
    const { exportAll, exportByCompany, isExporting } = useExport({
        eventName: evento?.name || "Evento",
        participants: filteredParticipants
    })

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
                            companies={companyStats}
                            selectedCompany={selectedCompany}
                            onCompanyChange={setSelectedCompany}
                            selectedStatus={selectedStatus}
                            onStatusChange={setSelectedStatus}
                            selectedAttendance={selectedAttendance}
                            onAttendanceChange={setSelectedAttendance}
                            onExport={(config) => exportAll(config)}
                            onExportCompany={(config) => exportByCompany(selectedCompany, config)}
                            isExporting={isExporting}
                        />

                        {/* === PARTICIPANTS TABLE === */}
                        <ParticipantsTable
                            participants={filteredParticipants}
                            groupByCompany={selectedCompany === 'all'}
                        />
                    </>
                )}
            </div>
        </EventLayout>
    )
}