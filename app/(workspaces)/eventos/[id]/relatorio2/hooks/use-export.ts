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
                return fullRecord
            }
            
            // Filter to only include selected columns
            const filteredRecord: any = {}
            selectedColumns.forEach(column => {
                if (column in fullRecord) {
                    filteredRecord[column] = fullRecord[column as keyof typeof fullRecord]
                }
            })
            
            return filteredRecord
        })
    }, [])
    
    // Export all participants
    const exportAll = useCallback((selectedColumns?: string[]) => {
        if (participants.length === 0) {
            toast.error("Nenhum participante para exportar")
            return
        }
        
        const exportData = convertToExportFormat(participants, selectedColumns)
        
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