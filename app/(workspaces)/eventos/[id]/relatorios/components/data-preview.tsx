import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Filter } from "lucide-react"
import type { RelatorioDataItem } from "../types"

interface DataPreviewProps {
    dadosRelatorio: RelatorioDataItem[]
}

export function DataPreview({ dadosRelatorio }: DataPreviewProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Preview dos Dados
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Registros encontrados:</span>
                        <Badge variant="secondary">{dadosRelatorio.length}</Badge>
                    </div>

                    <div className="space-y-2">
                        <span className="text-sm font-medium">Primeiros 5 registros:</span>
                        <div className="space-y-1">
                            {dadosRelatorio.slice(0, 5).map((item, index) => (
                                <div 
                                    key={index} 
                                    className={`text-xs p-2 rounded ${
                                        'isHeader' in item && item.isHeader
                                            ? 'bg-blue-100 text-blue-800 font-semibold'
                                            : 'text-gray-600 bg-gray-50'
                                    }`}
                                >
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
                </div>
            </CardContent>
        </Card>
    )
}