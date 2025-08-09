import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, Building } from "lucide-react"
import type { RelatorioConfig, EventDay } from "../types"
import type { EventParticipant } from "@/features/eventos/types"

interface ReportConfigProps {
    configRelatorio: RelatorioConfig
    onConfigChange: (config: Partial<RelatorioConfig>) => void
    eventDays: EventDay[]
    participantesDoDia: EventParticipant[]
    selectedCompanyForExport: string
    onCompanyForExportChange: (company: string) => void
    onExportPDF: () => void
    onExportCompanyPDF: () => void
    isLoading: boolean
    isExporting: boolean
}

export function ReportConfig({
    configRelatorio,
    onConfigChange,
    eventDays,
    participantesDoDia,
    selectedCompanyForExport,
    onCompanyForExportChange,
    onExportPDF,
    onExportCompanyPDF,
    isLoading,
    isExporting
}: ReportConfigProps) {
    const empresasUnicas = Array.from(new Set(participantesDoDia.map(p => p.company).filter(Boolean))).sort()
    const funcoesUnicas = Array.from(new Set(participantesDoDia.map(p => p.role).filter(Boolean)))
    const credenciaisUnicas = Array.from(new Set(participantesDoDia.map(p => p.credentialId || "not_informed").filter(Boolean)))

    return (
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
                        onChange={(e) => onConfigChange({ titulo: e.target.value })}
                        placeholder="Ex: Relatório de Participantes - Dia 1"
                    />
                </div>

                {/* Tipo de Relatório */}
                <div>
                    <label className="block text-sm font-medium mb-2">Tipo de Relatório</label>
                    <Select
                        value={configRelatorio.tipo}
                        onValueChange={(value) => onConfigChange({ tipo: value as RelatorioConfig['tipo'] })}
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
                        onValueChange={(value) => onConfigChange({ filtroDia: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os dias</SelectItem>
                            {eventDays.filter(day => day.id !== 'all').map(day => (
                                <SelectItem key={day.id} value={day.id}>{day.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtros condicionais */}
                {(configRelatorio.tipo === "filtroEmpresa" ||
                    configRelatorio.tipo === "checkin" ||
                    configRelatorio.tipo === "checkout" ||
                    configRelatorio.tipo === "cadastradoPor") && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Filtrar por Empresa</label>
                        <Select
                            value={configRelatorio.filtroEmpresa}
                            onValueChange={(value) => onConfigChange({ filtroEmpresa: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todas as empresas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all_companies">Todas as empresas</SelectItem>
                                {empresasUnicas.map(empresa => (
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
                                onValueChange={(value) => onConfigChange({ filtroEmpresa: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas as empresas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_companies">Todas as empresas</SelectItem>
                                    {empresasUnicas.map(empresa => (
                                        <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Filtrar por Função</label>
                            <Select
                                value={configRelatorio.filtroFuncao}
                                onValueChange={(value) => onConfigChange({ filtroFuncao: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas as funções" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_functions">Todas as funções</SelectItem>
                                    {funcoesUnicas.map(funcao => (
                                        <SelectItem key={funcao} value={funcao || "not_defined"}>{funcao}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Filtrar por Tipo de Credencial</label>
                            <Select
                                value={configRelatorio.filtroTipoCredencial}
                                onValueChange={(value) => onConfigChange({ filtroTipoCredencial: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos os tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_credentials">Todos os tipos</SelectItem>
                                    {credenciaisUnicas.map(credencial => (
                                        <SelectItem key={credencial} value={credencial}>{credencial}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {/* Botão de Exportar */}
                <Button
                    onClick={onExportPDF}
                    disabled={isLoading || !configRelatorio.titulo.trim() || isExporting}
                    className="w-full"
                >
                    {isExporting ? (
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
                        onValueChange={onCompanyForExportChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione uma empresa" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all_companies">Todas as empresas</SelectItem>
                            {empresasUnicas.map(empresa => (
                                <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={onExportCompanyPDF}
                        disabled={isLoading || selectedCompanyForExport === "all_companies" || isExporting}
                        variant="outline"
                        className="w-full"
                    >
                        {isExporting ? (
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
    )
}