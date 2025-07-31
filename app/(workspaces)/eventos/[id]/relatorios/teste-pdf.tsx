'use client'

import { Button } from "@/components/ui/button"
import { useExportPDF } from "@/features/eventos/api/mutation/use-export-pdf"
import { Download } from "lucide-react"

export default function TestePDF() {
    const exportPDFMutation = useExportPDF()

    const testarPDF = () => {
        exportPDFMutation.mutate({
            titulo: "Relatório de Teste - RG Produções",
            tipo: "geral",
            dados: [
                {
                    tipo: "Participante",
                    nome: "João Silva",
                    cpf: "123.456.789-00",
                    empresa: "RG Produções",
                    funcao: "Operador",
                    status: "Ativo"
                },
                {
                    tipo: "Coordenador",
                    nome: "Maria Santos",
                    email: "maria@rgproducoes.com",
                    empresa: "-",
                    funcao: "-",
                    status: "Ativo"
                },
                {
                    tipo: "Vaga",
                    nome: "Empresa ABC",
                    placa: "ABC-1234",
                    empresa: "Empresa ABC",
                    funcao: "Furgão",
                    status: "Retirada"
                }
            ],
            filtros: {
                dia: "all",
                empresa: "",
                funcao: "",
                status: ""
            }
        })
    }

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Teste de Geração de PDF</h2>
            <Button
                onClick={testarPDF}
                disabled={exportPDFMutation.isPending}
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
                        Testar Geração de PDF
                    </>
                )}
            </Button>
        </div>
    )
} 