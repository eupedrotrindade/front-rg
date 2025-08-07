"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover"
import { 
  Search, Filter, Calendar as CalendarIcon, X, Users, 
  Activity, Database, RefreshCw
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface EventHistoryFiltersProps {
  filters: {
    busca: string
    entityType: string
    action: string
    performedBy: string
    startDate: string
    endDate: string
  }
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
  totalCount?: number
  isLoading?: boolean
}

// Configuração de entidades
const ENTITY_OPTIONS = [
  { value: "event", label: "Evento", icon: CalendarIcon },
  { value: "participant", label: "Participante", icon: Users },
  { value: "manager", label: "Gerente", icon: Users },
  { value: "staff", label: "Staff", icon: Users },
  { value: "wristband", label: "Pulseira", icon: Activity },
  { value: "wristband_model", label: "Modelo Pulseira", icon: Activity },
  { value: "vehicle", label: "Veículo", icon: Database },
  { value: "attendance", label: "Presença", icon: Activity },
  { value: "operator", label: "Operador", icon: Users },
  { value: "coordinator", label: "Coordenador", icon: Users },
  { value: "company", label: "Empresa", icon: Database },
  { value: "credential", label: "Credencial", icon: Activity },
  { value: "movement_credential", label: "Mov. Credencial", icon: Activity },
  { value: "radio", label: "Rádio", icon: Activity },
  { value: "import_request", label: "Importação", icon: Database },
]

// Configuração de ações
const ACTION_OPTIONS = [
  { value: "created", label: "Criado", color: "bg-green-100 text-green-800" },
  { value: "updated", label: "Atualizado", color: "bg-blue-100 text-blue-800" },
  { value: "deleted", label: "Deletado", color: "bg-red-100 text-red-800" },
  { value: "status_updated", label: "Status Alterado", color: "bg-purple-100 text-purple-800" },
  { value: "check_in", label: "Check-in", color: "bg-emerald-100 text-emerald-800" },
  { value: "check_out", label: "Check-out", color: "bg-orange-100 text-orange-800" },
  { value: "recorded", label: "Registrado", color: "bg-cyan-100 text-cyan-800" },
]

export default function EventHistoryFilters({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  totalCount,
  isLoading 
}: EventHistoryFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  // Contar filtros ativos
  const activeFilters = Object.entries(filters).filter(([key, value]) => 
    key !== 'busca' && value !== '' && value !== 'all'
  ).length + (filters.busca ? 1 : 0)

  const hasDateFilters = filters.startDate || filters.endDate

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date)
      onFilterChange('startDate', date ? format(date, 'yyyy-MM-dd') : '')
    } else {
      setEndDate(date)
      onFilterChange('endDate', date ? format(date, 'yyyy-MM-dd') : '')
    }
  }

  const clearDateFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    onFilterChange('startDate', '')
    onFilterChange('endDate', '')
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Linha principal de filtros */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar na descrição..."
              value={filters.busca}
              onChange={(e) => onFilterChange('busca', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro rápido de entidade */}
          <div className="min-w-[180px]">
            <Select 
              value={filters.entityType || "all"} 
              onValueChange={(value) => onFilterChange('entityType', value === "all" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as entidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                {ENTITY_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Avançado
              {activeFilters > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {activeFilters}
                </Badge>
              )}
            </Button>

            {activeFilters > 0 && (
              <Button
                variant="ghost"
                onClick={onClearFilters}
                className="gap-2 text-gray-500"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Filtros avançados */}
        {showAdvanced && (
          <>
            <div className="border-t mt-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ação */}
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">
                    Ação
                  </label>
                  <Select 
                    value={filters.action || "all"} 
                    onValueChange={(value) => onFilterChange('action', value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as ações" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as ações</SelectItem>
                      {ACTION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", option.color.split(' ')[0])} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Usuário */}
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">
                    Usuário
                  </label>
                  <Input
                    placeholder="Nome do usuário..."
                    value={filters.performedBy}
                    onChange={(e) => onFilterChange('performedBy', e.target.value)}
                  />
                </div>

                {/* Data Inicial */}
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">
                    Data Inicial
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => handleDateChange('start', date)}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data Final */}
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">
                    Data Final
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => handleDateChange('end', date)}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Ações de filtro avançado */}
              {hasDateFilters && (
                <div className="flex justify-end mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDateFilters}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Limpar datas
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Resumo e status */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {totalCount !== undefined && (
              <div className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                <span>{totalCount} registros</span>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Carregando...</span>
              </div>
            )}
          </div>

          {/* Filtros ativos */}
          {activeFilters > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {activeFilters} filtro{activeFilters !== 1 ? 's' : ''} ativo{activeFilters !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-1">
                {filters.entityType && filters.entityType !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    {ENTITY_OPTIONS.find(e => e.value === filters.entityType)?.label}
                    <button 
                      onClick={() => onFilterChange('entityType', '')}
                      className="ml-1 hover:bg-gray-300 rounded-full w-3 h-3 flex items-center justify-center"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                )}
                {filters.action && filters.action !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    {ACTION_OPTIONS.find(a => a.value === filters.action)?.label}
                    <button 
                      onClick={() => onFilterChange('action', '')}
                      className="ml-1 hover:bg-gray-300 rounded-full w-3 h-3 flex items-center justify-center"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                )}
                {filters.performedBy && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.performedBy}
                    <button 
                      onClick={() => onFilterChange('performedBy', '')}
                      className="ml-1 hover:bg-gray-300 rounded-full w-3 h-3 flex items-center justify-center"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}