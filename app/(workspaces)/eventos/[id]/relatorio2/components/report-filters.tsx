/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Download, Filter, Check, ChevronsUpDown, Building2, FileSpreadsheet, Calendar, Sun, Moon, Car, Radio, CreditCard, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CompanyStats } from "../types"
import { ColumnSelectionDialog, type ExportConfig } from "./column-selection-dialog"

interface EventDay {
    id: string
    label: string
    date: string
    type: string
    period?: 'diurno' | 'noturno'
}

interface ReportFiltersProps {
    eventDays: EventDay[]
    selectedDay: string
    onDayChange: (day: string) => void
    companies: CompanyStats[]
    selectedCompany: string
    onCompanyChange: (company: string) => void
    selectedReportType: string
    onReportTypeChange: (type: string) => void
    selectedCredentialType: string
    onCredentialTypeChange: (type: string) => void
    selectedFunction: string
    onFunctionChange: (func: string) => void
    onExport: (config: ExportConfig) => void
    onExportCompany: (config: ExportConfig) => void
    onExportXLSX?: () => void
    onExportCompanyXLSX?: (company: string) => void
    onExportRadios?: () => void
    onExportEstacionamento?: () => void
    onExportCrachas?: () => void
    onPreview?: () => void
    isExporting: boolean
    credenciais: any[]
    participantes: any[]
}

export function ReportFilters({
    eventDays,
    selectedDay,
    onDayChange,
    companies,
    selectedCompany,
    onCompanyChange,
    selectedReportType,
    onReportTypeChange,
    selectedCredentialType,
    onCredentialTypeChange,
    selectedFunction,
    onFunctionChange,
    onExport,
    onExportCompany,
    onExportXLSX,
    onExportCompanyXLSX,
    onExportRadios,
    onExportEstacionamento,
    onExportCrachas,
    onPreview,
    isExporting,
    credenciais,
    participantes
}: ReportFiltersProps) {
    const [companyOpen, setCompanyOpen] = useState(false)
    const [dayOpen, setDayOpen] = useState(false)
    const [credentialOpen, setCredentialOpen] = useState(false)
    const [functionOpen, setFunctionOpen] = useState(false)
    const [showColumnDialog, setShowColumnDialog] = useState(false)
    const [pendingExportType, setPendingExportType] = useState<'all' | 'company' | null>(null)

    const selectedCompanyData = companies.find(c => c.empresa === selectedCompany)
    const displayValue = selectedCompany === "all" ? "Todas as Empresas" : selectedCompany

    // Obter ícone do período
    const getPeriodIcon = (period?: 'diurno' | 'noturno') => {
        if (period === 'diurno') {
            return <Sun className="h-3 w-3 text-yellow-500" />
        } else if (period === 'noturno') {
            return <Moon className="h-3 w-3 text-blue-500" />
        }
        return null
    }

    // Obter funções únicas dos participantes
    const uniqueFunctions = [...new Set(participantes.map(p => p.role).filter(Boolean))].sort()

    // Obter tipos de credencial únicos
    const uniqueCredentialTypes = [...new Set(credenciais.map(c => c.nome).filter(Boolean))].sort()

    const handleExportClick = (type: 'all' | 'company') => {
        setPendingExportType(type)
        setShowColumnDialog(true)
    }

    const handleColumnSelection = (config: ExportConfig) => {
        if (pendingExportType === 'all') {
            onExport(config)
        } else if (pendingExportType === 'company') {
            onExportCompany(config)
        }
        setPendingExportType(null)
    }

    // Report types com base na especificação
    const reportTypes = [
        { value: 'geral', label: 'Relatório Geral' },
        { value: 'empresa', label: 'Filtro por Empresa' },
        { value: 'checkin', label: 'Quem fez Check-in' },
        { value: 'checkout', label: 'Quem fez Check-out' },
        { value: 'checkout_tempo', label: 'Quem fez Check-out (com tempo)' },
        { value: 'credencial', label: 'Tipo de Credencial' },
        { value: 'cadastrado_por', label: 'Cadastrado por' }
    ]

    // Mostrar filtros condicionais baseado no tipo de relatório
    const showCompanyFilter = ['empresa', 'checkin', 'checkout', 'checkout_tempo', 'credencial', 'cadastrado_por'].includes(selectedReportType)
    const showCredentialFilter = selectedReportType === 'credencial'
    const showFunctionFilter = selectedReportType === 'credencial'

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros & Exportação
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* === DIAS/TURNOS === */}
                <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Turnos do Evento
                    </label>
                    <Popover open={dayOpen} onOpenChange={setDayOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={dayOpen}
                                className="w-full justify-between h-10"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    <span className="truncate">
                                        {selectedDay === "all" ? "Todos os Turnos" :
                                            eventDays.find(d => d.id === selectedDay)?.label || selectedDay}
                                    </span>
                                    {selectedDay !== "all" && (() => {
                                        const day = eventDays.find(d => d.id === selectedDay);
                                        return day && getPeriodIcon(day.period);
                                    })()}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[500px] bg-white p-0" align="start">
                            <Command>
                                <CommandInput
                                    placeholder={`Buscar entre ${eventDays.length} turnos...`}
                                    className="h-9"
                                />
                                <CommandList className="max-h-[300px] overflow-auto">
                                    <CommandEmpty>Nenhum turno encontrado.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="all"
                                            onSelect={() => {
                                                onDayChange("all")
                                                setDayOpen(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedDay === "all" ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex items-center justify-between w-full">
                                                <span>Todos os Turnos</span>
                                                <Badge variant="outline" className="ml-2">
                                                    {eventDays.length}
                                                </Badge>
                                            </div>
                                        </CommandItem>
                                        <CommandSeparator />
                                        {eventDays.map((day) => (
                                            <CommandItem
                                                key={day.id}
                                                value={day.id}
                                                onSelect={() => {
                                                    onDayChange(day.id)
                                                    setDayOpen(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedDay === day.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate">{day.date}</span>
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn(
                                                                "text-xs",
                                                                day.type === 'montagem' && "bg-orange-100 text-orange-800",
                                                                day.type === 'evento' && "bg-blue-100 text-blue-800",
                                                                day.type === 'desmontagem' && "bg-red-100 text-red-800"
                                                            )}
                                                        >
                                                            {day.type.toUpperCase()}
                                                        </Badge>
                                                        {getPeriodIcon(day.period)}
                                                        <span className="text-xs text-gray-600">
                                                            {day.period === 'diurno' ? 'Diurno' : 'Noturno'}
                                                        </span>
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

                {/* === TIPO DE RELATÓRIO === */}
                <div>
                    <label className="block text-sm font-medium mb-2">Tipo de Relatório</label>
                    <Select value={selectedReportType} onValueChange={onReportTypeChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {reportTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* === FILTROS CONDICIONAIS === */}
                {showCompanyFilter && (
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
                )}

                {showCredentialFilter && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Tipo de Credencial</label>
                        <Popover open={credentialOpen} onOpenChange={setCredentialOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={credentialOpen}
                                    className="w-full justify-between h-10"
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <CreditCard className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                            {selectedCredentialType === "all" ? "Todos os Tipos" : selectedCredentialType}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] bg-white p-0" align="start">
                                <Command>
                                    <CommandInput
                                        placeholder={`Buscar entre ${uniqueCredentialTypes.length} tipos...`}
                                        className="h-9"
                                    />
                                    <CommandList className="max-h-[300px] overflow-auto">
                                        <CommandEmpty>Nenhum tipo encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all"
                                                onSelect={() => {
                                                    onCredentialTypeChange("all")
                                                    setCredentialOpen(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedCredentialType === "all" ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                Todos os Tipos
                                            </CommandItem>
                                            <CommandSeparator />
                                            {uniqueCredentialTypes.map((type) => (
                                                <CommandItem
                                                    key={type}
                                                    value={type}
                                                    onSelect={() => {
                                                        onCredentialTypeChange(type)
                                                        setCredentialOpen(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedCredentialType === type ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {type}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                {showFunctionFilter && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Função</label>
                        <Popover open={functionOpen} onOpenChange={setFunctionOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={functionOpen}
                                    className="w-full justify-between h-10"
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="truncate">
                                            {selectedFunction === "all" ? "Todas as Funções" : selectedFunction}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] bg-white p-0" align="start">
                                <Command>
                                    <CommandInput
                                        placeholder={`Buscar entre ${uniqueFunctions.length} funções...`}
                                        className="h-9"
                                    />
                                    <CommandList className="max-h-[300px] overflow-auto">
                                        <CommandEmpty>Nenhuma função encontrada.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all"
                                                onSelect={() => {
                                                    onFunctionChange("all")
                                                    setFunctionOpen(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedFunction === "all" ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                Todas as Funções
                                            </CommandItem>
                                            <CommandSeparator />
                                            {uniqueFunctions.map((func) => (
                                                <CommandItem
                                                    key={func}
                                                    value={func}
                                                    onSelect={() => {
                                                        onFunctionChange(func)
                                                        setFunctionOpen(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedFunction === func ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {func}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                {/* === BOTÕES DE EXPORTAÇÃO === */}
                <div className="space-y-4 pt-4 border-t">
                    {/* Botão de Preview */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Visualizar PDF</label>
                        <Button
                            onClick={() => onPreview?.()}
                            disabled={isExporting}
                            variant="outline"
                            className="w-full"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview do PDF
                        </Button>
                    </div>

                    {/* Botões de Exportação */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Exportar Staff</label>
                            <Button
                                onClick={() => handleExportClick('all')}
                                disabled={isExporting}
                                className="w-full"
                            >
                                {isExporting ? (
                                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                {isExporting ? "Exportando..." : "PDF Staff"}
                            </Button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Relatório Rádios</label>
                            <Button
                                onClick={() => onExportRadios?.()}
                                disabled={isExporting}
                                variant="outline"
                                className="w-full"
                            >
                                <Radio className="h-4 w-4 mr-2" />
                                PDF Rádios
                            </Button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Relatório Estacionamento</label>
                            <Button
                                onClick={() => onExportEstacionamento?.()}
                                disabled={isExporting}
                                variant="outline"
                                className="w-full"
                            >
                                <Car className="h-4 w-4 mr-2" />
                                PDF Veículos
                            </Button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Relatório Crachás</label>
                            <Button
                                onClick={() => onExportCrachas?.()}
                                disabled={isExporting}
                                variant="outline"
                                className="w-full"
                            >
                                <CreditCard className="h-4 w-4 mr-2" />
                                PDF Crachás
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Column Selection Dialog */}
            <ColumnSelectionDialog
                open={showColumnDialog}
                onOpenChange={setShowColumnDialog}
                onConfirm={handleColumnSelection}
                isExporting={isExporting}
                exportType={pendingExportType || 'all'}
                companyName={pendingExportType === 'company' ? selectedCompany : undefined}
            />
        </Card>

    )
}