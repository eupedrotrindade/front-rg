import { useCallback } from "react"
import { toast } from "sonner"
import { useExportPDF } from "@/features/eventos/api/mutation/use-export-pdf"
import type { ParticipantRecord } from "../types"

interface UseExportProps {
    eventName: string
    participants: ParticipantRecord[]
}

export function useExport({ eventName, participants }: UseExportProps) {
    const exportPDFMutation = useExportPDF()
    
    // Convert participant record to export format
    const convertToExportFormat = useCallback((participants: ParticipantRecord[], selectedColumns?: string[]) => {
        console.log("🔍 DEBUG convertToExportFormat:", {
            participantsCount: participants.length,
            selectedColumns,
            sampleParticipant: participants[0]
        })

        return participants.map(p => {
            const fullRecord = {
                nome: p.nome.toUpperCase(),
                cpf: p.cpf,
                empresa: p.empresa.toUpperCase(),
                funcao: p.funcao?.toUpperCase() || "",
                pulseira: p.pulseira,
                tipoPulseira: p.tipoPulseira,
                checkIn: p.checkIn,
                checkOut: p.checkOut,
                tempoTotal: p.tempoTotal,
                status: p.status
            }
            
            // If no columns specified, return all columns
            if (!selectedColumns || selectedColumns.length === 0) {
                console.log("📋 Returning all columns")
                return fullRecord
            }
            
            // Filter to only include selected columns
            const filteredRecord: any = {}
            selectedColumns.forEach(column => {
                if (column in fullRecord) {
                    filteredRecord[column] = fullRecord[column as keyof typeof fullRecord]
                } else {
                    console.warn(`⚠️ Column '${column}' not found in fullRecord`)
                }
            })
            
            // Only log for first record to avoid spam
            if (participants.indexOf(p) === 0) {
                console.log("✂️ Filtered record sample:", {
                    originalKeys: Object.keys(fullRecord),
                    filteredKeys: Object.keys(filteredRecord),
                    selectedColumns,
                    original: fullRecord,
                    filtered: filteredRecord
                })
            }
            
            return filteredRecord
        })
    }, [])
    
    // Export all participants
    const exportAll = useCallback((selectedColumns?: string[]) => {
        console.log("🚀 DEBUG exportAll called with selectedColumns:", selectedColumns)
        
        if (participants.length === 0) {
            toast.error("Nenhum participante para exportar")
            return
        }
        
        const exportData = convertToExportFormat(participants, selectedColumns)
        
        console.log("📊 DEBUG Export data being sent:", {
            selectedColumns,
            exportDataSample: exportData[0],
            exportDataKeys: exportData[0] ? Object.keys(exportData[0]) : [],
            totalRecords: exportData.length
        })
        
        exportPDFMutation.mutate({
            titulo: `Relatório de Presença - ${eventName}`,
            tipo: "geral",
            dados: exportData,
            filtros: {
                dia: "all",
                empresa: "all_companies",
                funcao: "all_functions",
                status: "",
                tipoCredencial: "all_credentials"
            }
        }, {
            onSuccess: () => {
                toast.success("Relatório exportado com sucesso!")
            },
            onError: () => {
                toast.error("Erro ao exportar relatório")
            }
        })
    }, [participants, convertToExportFormat, exportPDFMutation, eventName])
    
    // Export by company
    const exportByCompany = useCallback((company: string, selectedColumns?: string[]) => {
        console.log("🏢 DEBUG exportByCompany called:", { company, selectedColumns })
        
        if (!company || company === 'all') {
            toast.error("Selecione uma empresa específica")
            return
        }
        
        const companyParticipants = participants.filter(p => p.empresa === company)
        
        if (companyParticipants.length === 0) {
            toast.error("Nenhum participante encontrado para esta empresa")
            return
        }
        
        const exportData = convertToExportFormat(companyParticipants, selectedColumns)
        
        console.log("📊 DEBUG Company export data:", {
            company,
            selectedColumns,
            exportDataSample: exportData[0],
            exportDataKeys: exportData[0] ? Object.keys(exportData[0]) : [],
            totalRecords: exportData.length
        })
        
        exportPDFMutation.mutate({
            titulo: `Relatório de Presença - ${company}`,
            tipo: "filtroEmpresa",
            dados: exportData,
            filtros: {
                dia: "all",
                empresa: company,
                funcao: "all_functions",
                status: "",
                tipoCredencial: "all_credentials"
            }
        }, {
            onSuccess: () => {
                toast.success(`Relatório da empresa ${company} exportado com sucesso!`)
            },
            onError: () => {
                toast.error("Erro ao exportar relatório da empresa")
            }
        })
    }, [participants, convertToExportFormat, exportPDFMutation])
    
    return {
        exportAll,
        exportByCompany,
        isExporting: exportPDFMutation.isPending
    }
}