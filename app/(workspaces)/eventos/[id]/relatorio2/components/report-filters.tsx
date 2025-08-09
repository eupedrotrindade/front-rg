import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Download, Filter, Check, ChevronsUpDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CompanyStats } from "../types"

interface ReportFiltersProps {
    companies: CompanyStats[]
    selectedCompany: string
    onCompanyChange: (company: string) => void
    selectedStatus: string
    onStatusChange: (status: string) => void
    onExport: () => void
    onExportCompany: () => void
    isExporting: boolean
}

export function ReportFilters({
    companies,
    selectedCompany,
    onCompanyChange,
    selectedStatus,
    onStatusChange,
    onExport,
    onExportCompany,
    isExporting
}: ReportFiltersProps) {
    const [companyOpen, setCompanyOpen] = useState(false)

    const selectedCompanyData = companies.find(c => c.empresa === selectedCompany)
    const displayValue = selectedCompany === "all" ? "Todas as Empresas" : selectedCompany

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros & Exportação
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Company Filter with Command */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Empresa</label>
                        <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={companyOpen}
                                    className="w-full justify-between h-10"
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Building2 className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                            {displayValue}
                                        </span>
                                        {selectedCompanyData && (
                                            <Badge variant="secondary" className="ml-auto shrink-0">
                                                {selectedCompanyData.totalParticipantes}
                                            </Badge>
                                        )}
                                        {selectedCompany === "all" && (
                                            <Badge variant="outline" className="ml-auto shrink-0">
                                                {companies.reduce((sum, c) => sum + c.totalParticipantes, 0)}
                                            </Badge>
                                        )}
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] bg-white p-0" align="start">
                                <Command>
                                    <CommandInput
                                        placeholder={`Buscar entre ${companies.length} empresas...`}
                                        className="h-9"
                                    />
                                    <CommandList className="max-h-[300px] overflow-auto">
                                        <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all"
                                                onSelect={() => {
                                                    onCompanyChange("all")
                                                    setCompanyOpen(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedCompany === "all" ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex items-center justify-between w-full">
                                                    <span>Todas as Empresas</span>
                                                    <Badge variant="outline" className="ml-2">
                                                        {companies.reduce((sum, c) => sum + c.totalParticipantes, 0)}
                                                    </Badge>
                                                </div>
                                            </CommandItem>
                                            <CommandSeparator />
                                            {companies
                                                .sort((a, b) => a.empresa.localeCompare(b.empresa))
                                                .map((company) => (
                                                    <CommandItem
                                                        key={company.empresa}
                                                        value={company.empresa}
                                                        onSelect={() => {
                                                            onCompanyChange(company.empresa)
                                                            setCompanyOpen(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedCompany === company.empresa ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="truncate">{company.empresa}</span>
                                                            <div className="flex items-center gap-2 ml-2">
                                                                <Badge variant="secondary">
                                                                    {company.totalParticipantes}
                                                                </Badge>
                                                                {company.percentualPresenca > 0 && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            company.percentualPresenca >= 80 ? "text-green-600 border-green-600" :
                                                                                company.percentualPresenca >= 50 ? "text-yellow-600 border-yellow-600" :
                                                                                    "text-red-600 border-red-600"
                                                                        )}
                                                                    >
                                                                        {company.percentualPresenca}%
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Status</label>
                        <Select value={selectedStatus} onValueChange={onStatusChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="present">Presentes</SelectItem>
                                <SelectItem value="checked_out">Finalizados</SelectItem>
                                <SelectItem value="no_checkin">Sem Check-in</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Export Buttons */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Exportar Geral</label>
                        <Button
                            onClick={onExport}
                            disabled={isExporting}
                            className="w-full"
                        >
                            {isExporting ? (
                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            {isExporting ? "Exportando..." : "PDF Completo"}
                        </Button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Exportar Empresa</label>
                        <Button
                            onClick={onExportCompany}
                            disabled={isExporting || selectedCompany === 'all'}
                            variant="outline"
                            className="w-full"
                        >
                            {isExporting ? (
                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            PDF Empresa
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}