"use client";
import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Printer, FileText, Building2, Users, Calendar } from "lucide-react"
import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event"
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event"
import { useEventAttendanceByEvent } from "@/features/eventos/api/query/use-event-attendance"
import { useMovementCredential } from "@/features/eventos/api/mutation/use-movement-credential"
import { useReportData } from "../hooks/use-report-data"
import { useExport } from "../hooks/use-export"

export default function PdfPreviewPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()

    const eventId = String(params.id)

    // Recuperar parâmetros da URL
    const selectedDay = searchParams.get('day') || 'all'
    const selectedCompany = searchParams.get('company') || 'all'
    const selectedReportType = searchParams.get('reportType') || 'geral'
    const selectedCredentialType = searchParams.get('credentialType') || 'all'
    const selectedFunction = searchParams.get('function') || 'all'

    // === FETCH DATA ===
    const { data: eventos = [] } = useEventos()
    const evento = Array.isArray(eventos) ? eventos.find(e => e.id === eventId) : null
    const { data: participantes = [] } = useEventParticipantsByEvent({ eventId })
    const { data: credenciais = [] } = useCredentialsByEvent(eventId)
    const { data: attendanceData } = useEventAttendanceByEvent(eventId)
    const attendanceRecords = attendanceData?.data || []
    const { data: movementCredentials = [] } = useMovementCredential(eventId)

    // === PROCESS DATA ===
    const { participants, filterData } = useReportData({
        participantes,
        attendanceRecords,
        movementCredentials,
        credenciais
    })

    // Função para formatar data
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    // Função para gerar dias do evento
    const getEventDays = () => {
        if (!evento) return []

        const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> = []

        const processEventArray = (eventData: any, stage: string, stageName: string) => {
            if (!eventData) return

            try {
                let dataArray: any[] = []

                if (typeof eventData === 'string') {
                    dataArray = JSON.parse(eventData)
                } else if (Array.isArray(eventData)) {
                    dataArray = eventData
                } else {
                    return
                }

                dataArray.forEach(item => {
                    if (item && item.date) {
                        const formattedDate = formatDate(item.date)
                        const dateISO = new Date(item.date).toISOString().split('T')[0]

                        let period: 'diurno' | 'noturno'
                        if (item.period && (item.period === 'diurno' || item.period === 'noturno')) {
                            period = item.period
                        } else {
                            const dateObj = new Date(item.date)
                            const hour = dateObj.getHours()
                            period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno'
                        }

                        const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno'

                        days.push({
                            id: `${dateISO}-${stage}-${period}`,
                            label: `${formattedDate} (${stageName} - ${periodLabel})`,
                            date: formattedDate,
                            type: stage,
                            period
                        })
                    }
                })
            } catch (error) {
                console.warn(`Erro ao processar dados do evento para stage ${stage}:`, error)
            }
        }

        if (evento.montagem) processEventArray(evento.montagem, 'montagem', 'MONTAGEM')
        if (evento.evento) processEventArray(evento.evento, 'evento', 'EVENTO')
        if (evento.desmontagem) processEventArray(evento.desmontagem, 'desmontagem', 'DESMONTAGEM')

        days.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'))
            const dateB = new Date(b.date.split('/').reverse().join('-'))
            return dateA.getTime() - dateB.getTime()
        })

        return days
    }

    // === FILTERED DATA ===
    const filteredParticipants = filterData({
        empresa: selectedCompany,
        day: selectedDay,
        reportType: selectedReportType,
        credentialType: selectedCredentialType,
        function: selectedFunction
    })

    // === EXPORT FUNCTIONALITY ===
    const { exportAll, generatePreviewData, isExporting } = useExport({
        eventName: evento?.name || "Evento",
        participants: filteredParticipants,
        selectedDay,
        selectedReportType,
        eventDays: getEventDays()
    })

    // === PREVIEW DATA ===
    const previewData = generatePreviewData()

    // Dividir dados por páginas baseado nos pageBreaks
    const pages: any[][] = []
    let currentPageItems: any[] = []

    previewData.forEach((item, index) => {
        if (item.pageBreak && currentPageItems.length > 0) {
            pages.push(currentPageItems)
            currentPageItems = [item]
        } else {
            currentPageItems.push(item)
        }
    })

    if (currentPageItems.length > 0) {
        pages.push(currentPageItems)
    }

    const handleGoBack = () => {
        router.back()
    }

    const handleExport = () => {
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

    const handlePrint = () => {
        window.print()
    }

    const renderPreviewItem = (item: any, index: number) => {
        switch (item.type) {
            case 'SHIFT_HEADER':
                return (
                    <div key={index} className="text-center py-6 mb-6 border-b-2 border-gray-800">
                        <div className="text-2xl font-bold text-gray-900 mb-2">{item.data}</div>
                        {item.shiftDate && (
                            <div className="flex items-center justify-center gap-4 text-sm text-gray-700">
                                <span>📅 {item.shiftDate}</span>
                                <span>🏗️ {item.shiftStage}</span>
                                <span>🌙 {item.shiftPeriod}</span>
                            </div>
                        )}
                    </div>
                )

            case 'COMPANY_HEADER':
                return (
                    <div key={index} className="text-center py-4 mb-4 border-b border-gray-600">
                        <div className="text-xl font-bold text-gray-900 mb-1">{item.data}</div>
                        {item.checkInCount !== undefined && item.totalCount !== undefined && (
                            <div className="text-sm text-gray-700">
                                Check-ins: {item.checkInCount} de {item.totalCount}
                            </div>
                        )}
                    </div>
                )

            case 'STAFF_RECORD':
                return (
                    <div key={index} className="flex items-center gap-2 py-1 px-2 text-gray-800 text-sm border-b
  border-gray-200">
                        <span className="flex-1">{item.data}</span>
                    </div>
                )

            case 'SUMMARY':
                return (
                    <div key={index} className="text-center py-8 mt-12">
                        <div
                            className="text-xl font-bold mb-2"
                            style={{ color: item.color || '#610E5C' }}
                        >
                            RESUMO FINAL
                        </div>
                        <div
                            className="text-lg font-bold"
                            style={{ color: item.color || '#610E5C' }}
                        >
                            {item.data}
                        </div>
                    </div>
                )

            default:
                return (
                    <div key={index} className="py-1 px-2 text-gray-600 text-sm">
                        {item.data}
                    </div>
                )
        }
    }

    const stats = {
        shifts: previewData.filter(item => item.type === 'SHIFT_HEADER').length,
        companies: previewData.filter(item => item.type === 'COMPANY_HEADER').length,
        staff: previewData.filter(item => item.type === 'STAFF_RECORD').length,
        pages: pages.length
    }

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
        <div className="min-h-screen bg-gray-50">
            {/* Header - não aparece na impressão */}
            <div className="bg-white border-b border-gray-200 p-4 print:hidden">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={handleGoBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Preview do PDF - {evento.name}
                            </h1>
                            <p className="text-sm text-gray-600">
                                Visualização fiel ao PDF que será gerado
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir
                        </Button>
                        <Button onClick={handleExport} disabled={isExporting}>
                            {isExporting ? (
                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white
  border-t-transparent" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            {isExporting ? "Gerando..." : "Gerar PDF"}
                        </Button>
                    </div>
                </div>

                {/* Estatísticas */}
                <div className="max-w-7xl mx-auto grid grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.shifts}</div>
                        <div className="text-xs text-gray-600">Turnos</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.companies}</div>
                        <div className="text-xs text-gray-600">Empresas</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.staff}</div>
                        <div className="text-xs text-gray-600">Funcionários</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{stats.pages}</div>
                        <div className="text-xs text-gray-600">Páginas</div>
                    </div>
                </div>
            </div>

            {/* Conteúdo do PDF */}
            <div className="max-w-4xl mx-auto p-8 bg-white min-h-screen print:p-4 print:max-w-none print:mx-0">
                {/* Cabeçalho do documento */}
                <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Relatório de Presença
                    </h1>
                    <h2 className="text-xl text-gray-700 mb-2">{evento.name}</h2>
                    <div className="text-sm text-gray-600">
                        Gerado em: {new Date().toLocaleString('pt-BR')}
                    </div>
                </div>

                {/* Renderizar cada página */}
                {pages.map((pageItems, pageIndex) => (
                    <div key={pageIndex} className={`${pageIndex > 0 ? 'print:page-break-before-always' : ''}`}>
                        {/* Indicador de página (apenas na tela) */}
                        <div className="text-center text-xs text-gray-400 mb-4 print:hidden">
                            Página {pageIndex + 1} de {pages.length}
                        </div>

                        {/* Conteúdo da página */}
                        <div className="space-y-1">
                            {pageItems.map((item, index) => renderPreviewItem(item, index))}
                        </div>

                        {/* Quebra de página visual (apenas na tela) */}
                        {pageIndex < pages.length - 1 && (
                            <div className="text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-4 mt-8      
  print:hidden">
                                ⸺⸺⸺ Nova Página ⸺⸺⸺
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}