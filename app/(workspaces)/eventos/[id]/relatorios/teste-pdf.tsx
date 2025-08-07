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
                // 2M PRODUÇÕES
                {
                    nome: "MARCELA MASTINI GOMES ALMEIDA",
                    cpf: "415.754.216-9.0",
                    empresa: "2M PRODUÇÕES",
                    funcao: "MÍDIA",
                    pulseira: "-",
                    checkIn: "-",
                    checkOut: "-"
                },
                {
                    nome: "KAIQUE JARDIM DE LIMA",
                    cpf: "413.326.576.50",
                    empresa: "2M PRODUÇÕES",
                    funcao: "MÍDIA", 
                    pulseira: "-",
                    checkIn: "-",
                    checkOut: "-"
                },
                {
                    nome: "SILVIA CRISTINA COLMENERO",
                    cpf: "845.995.866.0",
                    empresa: "2M PRODUÇÕES",
                    funcao: "IMPRENSA",
                    pulseira: "-",
                    checkIn: "-",
                    checkOut: "-"
                },
                // 7 FEST
                {
                    nome: "LUCAS AGOSTINHO COELHO SALES",
                    cpf: "135.433.606-2.0",
                    empresa: "7 FEST",
                    funcao: "FOTÓGRAFO",
                    pulseira: "4003",
                    checkIn: "02/08/2025, 14:55:06",
                    checkOut: "-"
                },
                {
                    nome: "HERBERT RICHARD MARTINS LEITE",
                    cpf: "114.249.996-0.0",
                    empresa: "7 FEST", 
                    funcao: "FOTÓGRAFO",
                    pulseira: "4004",
                    checkIn: "02/08/2025, 14:55:05",
                    checkOut: "-"
                },
                // AGÊNCIA I7
                {
                    nome: "PEDRO HENRIQUE ALVIM VILELA",
                    cpf: "045.749.936-2.0",
                    empresa: "AGÊNCIA I7",
                    funcao: "FOTÓGRAFO",
                    pulseira: "214",
                    checkIn: "02/08/2025, 21:27:05",
                    checkOut: "-"
                },
                // ALL ACCESS
                {
                    nome: "Carlos Emilio Pereira da Silva",
                    cpf: "33.396.562-0",
                    empresa: "ALL ACCESS",
                    funcao: "STAFF",
                    pulseira: "835",
                    checkIn: "02/08/2025, 05:14:33",
                    checkOut: "-"
                },
                {
                    nome: "Caio Cesar Ferreira de Souza",
                    cpf: "29177465806.0",
                    empresa: "ALL ACCESS",
                    funcao: "STAFF", 
                    pulseira: "1030",
                    checkIn: "02/08/2025, 10:17:41",
                    checkOut: "-"
                },
                {
                    nome: "Pablo Cezar Mendes de Mattos",
                    cpf: "13384217060.0",
                    empresa: "ALL ACCESS",
                    funcao: "STAFF",
                    pulseira: "1049", 
                    checkIn: "02/08/2025, 10:17:10",
                    checkOut: "-"
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